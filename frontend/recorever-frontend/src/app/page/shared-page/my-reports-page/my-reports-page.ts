import { 
  Component, OnInit, AfterViewInit, OnDestroy, 
  inject, signal, computed, ViewChild, ElementRef, HostListener 
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { 
  BehaviorSubject, Subject, catchError, of, switchMap, 
  takeUntil, tap, finalize, take 
} from 'rxjs';

import { ItemService } from '../../../core/services/item-service';
import { AuthService } from '../../../core/auth/auth-service';
import { ClaimService } from '../../../core/services/claim-service';

import type { 
  Report, PaginatedResponse, ReportFilters 
} from '../../../models/item-model';
import { User } from '../../../models/user-model';

import { 
  SearchBarComponent 
} from '../../../share-ui-blocks/search-bar/search-bar';
import { 
  ReportItemGrid 
} from '../../../share-ui-blocks/report-item-grid/report-item-grid';

import { CodesModal } from '../../../modal/codes-modal/codes-modal';
import { 
  ItemDetailModal 
} from '../../../modal/item-detail-modal/item-detail-modal';
import { 
  DeleteReportModal 
} from "../../../modal/delete-report-modal/delete-report-modal";

type ItemType = 'all' | 'lost' | 'found';
type ReportStatus = 'all' | 'unresolved' | 'resolved';

@Component({
  selector: 'app-my-reports-page',
  standalone: true,
  imports: [
    CommonModule,
    SearchBarComponent,
    ReportItemGrid,
    CodesModal,
    ItemDetailModal,
    DeleteReportModal
  ],
  providers: [DatePipe],
  templateUrl: './my-reports-page.html',
  styleUrls: ['./my-reports-page.scss']
})
export class MyReportsPage implements OnInit, AfterViewInit, OnDestroy {
  private itemService: ItemService = inject(ItemService);
  private authService: AuthService = inject(AuthService);
  private claimService: ClaimService = inject(ClaimService);
  private datePipe: DatePipe = inject(DatePipe);

  private destroy$ = new Subject<void>();
  private refreshTrigger$ = new BehaviorSubject<void>(undefined);

  @ViewChild('scrollAnchor') public scrollAnchor!: ElementRef;
  private observer!: IntersectionObserver;

  public currentUser = toSignal<User | null>(this.authService.currentUser$);
  public currentUserId = computed((): number | null => {
    const user = this.currentUser();
    return user ? user.user_id : null;
  });

  public currentPage = signal(1);
  public totalPages = signal(1);
  public pageSize = signal(10);
  public isLoading = signal(true);
  public error = signal<string | null>(null);

  public itemType = signal<ItemType>('all');
  public currentStatus = signal<ReportStatus>('all');
  public isStatusOpen = signal(false);
  public searchQuery = signal('');
  
  public searchSuggestions = signal<string[]>([]);
  public allReports = signal<Report[]>([]);
  public filters = signal<ReportFilters>({});

  public showDeleteModal = signal(false);
  public itemToDelete = signal<Report | null>(null);
  public viewCodeItem = signal<Report | null>(null);
  public selectedItem = signal<Report | null>(null);

  public visibleReports = computed((): Report[] => {
    let reports = [...this.allReports()];
    const type = this.itemType();
    const status = this.currentStatus();
    const query = this.searchQuery().toLowerCase();

    if (type !== 'all') {
      reports = reports.filter((r: Report) => r.type === type);
    }

    if (status !== 'all') {
      reports = reports.filter((r: Report) => {
        const isResolved = r.status === 'resolved' || r.status === 'claimed';
        return status === 'resolved' ? isResolved : !isResolved;
      });
    }

    if (query) {
      reports = reports.filter((r: Report) => 
        r.item_name.toLowerCase().includes(query) ||
        r.location.toLowerCase().includes(query)
      );
    }

    reports.sort((a: Report, b: Report): number => {
      return new Date(b.date_reported).getTime() - 
             new Date(a.date_reported).getTime();
    });

    return reports;
  });

  public displayStatus = computed((): string => {
    const status = this.currentStatus();
    if (status === 'unresolved') return 'Unresolved';
    if (status === 'resolved') return 'Resolved';
    return 'Status';
  });

  public codeModalTitle = computed((): string => {
    const item = this.viewCodeItem();
    if (!item) return '';
    return (item.type === 'lost' || item.claim_code) ? 
        'Ticket ID' : 'Reference Code';
  });

  public codeModalValue = computed((): string => {
    const item = this.viewCodeItem();
    if (!item) return '';
    if (item.claim_code) return item.claim_code;
    if (item.type === 'lost') {
      return item.report_id ? `Report #${item.report_id}` : 'Pending';
    }
    return item.surrender_code || 'N/A';
  });

  @HostListener('document:click')
  public closeDropdown(): void {
    if (this.isStatusOpen()) {
      this.isStatusOpen.set(false);
    }
  }

  public ngOnInit(): void {
    this.authService.currentUser$.pipe(take(1)).subscribe({
      next: (user: User | null): void => {
        if (user && user.user_id) {
          this.filters.update((f: ReportFilters) => 
              ({ ...f, user_id: user.user_id }));
          this.resetPagination();
        }
      }
    });

    this.refreshTrigger$.pipe(
      tap((): void => this.isLoading.set(true)),
      switchMap(() => {
        const currentFilters = this.filters();
        return this.itemService.getReports({
          ...currentFilters,
          page: this.currentPage(),
          size: this.pageSize()
        }).pipe(
          catchError(() => of({ 
              items: [], totalPages: 1, totalItems: 0, currentPage: 1 
          })),
          finalize((): void => this.isLoading.set(false))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res: PaginatedResponse<Report>): void => {
        this.allReports.update((existing: Report[]) =>
          this.currentPage() === 1 ? res.items : [...existing, ...res.items]
        );
        this.totalPages.set(res.totalPages);
      }
    });
  }

  public ngAfterViewInit(): void {
    if (this.scrollAnchor) {
      this.observer = new IntersectionObserver
          (([entry]: IntersectionObserverEntry[]) => {
        if (entry.isIntersecting && !this.isLoading() &&
            this.currentPage() < this.totalPages()) {
          this.currentPage.update((p: number) => p + 1);
          this.refreshTrigger$.next();
        }
      }, { rootMargin: '150px' });
      this.observer.observe(this.scrollAnchor.nativeElement);
    }
  }

  public ngOnDestroy(): void {
    if (this.observer) this.observer.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private resetPagination(): void {
    this.currentPage.set(1);
    this.allReports.set([]);
    this.refreshTrigger$.next();
  }

  public toggleStatusDropdown(event: Event): void {
    event.stopPropagation();
    this.isStatusOpen.update((v: boolean) => !v);
  }

  public setStatus(status: ReportStatus): void {
    this.currentStatus.set(status);
    this.isStatusOpen.set(false);
  }

  public toggleType(type: ItemType): void {
    this.itemType.set(type);
  }

  public onQueryChange(query: string): void {
    if (!query || query.trim().length === 0) {
      this.searchSuggestions.set([]);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const suggestions = new Set<string>();

    this.allReports().forEach((report: Report) => {
      if (report.item_name.toLowerCase().includes(lowerQuery)) {
        suggestions.add(report.item_name);
      }
    });
    this.searchSuggestions.set(Array.from(suggestions).slice(0, 5));
  }

  public onSearchSubmit(query: string): void {
    this.searchQuery.set(query || '');
    this.searchSuggestions.set([]);
  }

  public onCardClick(item: Report): void { this.selectedItem.set(item); }
  public onViewCodeClick(item: Report): void { this.viewCodeItem.set(item); }

  public onTicketClick(item: Report): void {
    if (!this.currentUserId()) return;
    this.claimService.submitClaim(item.report_id).subscribe({
      next: (res: { claim_code: string }): void => {
        this.viewCodeItem.set({ ...item, claim_code: res.claim_code });
      }
    });
  }

  public onEditClick(item: Report): void {
    console.log('Edit clicked', item.report_id);
  }

  public onDeleteClick(item: Report): void {
    this.itemToDelete.set(item);
    this.showDeleteModal.set(true);
  }

  public cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.itemToDelete.set(null);
  }

  public confirmDelete(): void {
    const item = this.itemToDelete();
    if (!item) return;

    this.itemService.deleteReport(item.report_id).subscribe({
      next: (): void => {
        this.allReports.update((items: Report[]) =>
          items.filter((r: Report) => r.report_id !== item.report_id)
        );
        this.showDeleteModal.set(false);
        this.itemToDelete.set(null);
      }
    });
  }

  public onModalViewTicket(): void {
    const item = this.selectedItem();
    if (item) {
      this.selectedItem.set(null);
      this.onTicketClick(item);
    }
  }

  public onModalEdit(): void {
    const item = this.selectedItem();
    if (item) {
      this.selectedItem.set(null);
      this.onEditClick(item);
    }
  }

  public onModalDelete(): void {
    const item = this.selectedItem();
    if (item) {
      this.selectedItem.set(null);
      this.onDeleteClick(item);
    }
  }

  public onModalViewCode(): void {
    const item = this.selectedItem();
    if (item) {
      this.selectedItem.set(null);
      this.onViewCodeClick(item);
    }
  }

  public getUserProfilePicture(): string | null {
    const item = this.selectedItem();
    return item?.reporter_profile_picture ?? null;
  }
}