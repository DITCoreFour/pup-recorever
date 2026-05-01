import {
  ChangeDetectionStrategy,
  Component,
  signal,
  inject,
  computed,
  HostBinding,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  OnInit
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Data, Params } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { 
  BehaviorSubject, catchError, map, of, Subject, switchMap,
  takeUntil, tap, finalize, combineLatest 
} from 'rxjs';

import {
  ReportItemGrid
} from '../../../share-ui-blocks/report-item-grid/report-item-grid';
import {
  SearchBarComponent
} from '../../../share-ui-blocks/search-bar/search-bar';
import { Filter, FilterState } from '../../../share-ui-blocks/filter/filter';

import { ItemService } from '../../../core/services/item-service';
import { AuthService } from '../../../core/auth/auth-service';
import { AdminService } from '../../../core/services/admin-service';
import { ToastService } from '../../../core/services/toast-service';
import { ClaimService } from '../../../core/services/claim-service';

import { CodesModal } from '../../../modal/codes-modal/codes-modal';
import {
  ItemDetailModal
} from '../../../modal/item-detail-modal/item-detail-modal';
import {
  DeleteReportModal
} from "../../../modal/delete-report-modal/delete-report-modal";
import {
  UnarchiveConfirmationModal
} from '../../../modal/unarchive-confirmation-modal/unarchive-confirmation-modal';
import { 
  ClaimFormModal 
} from '../../../modal/claim-form-modal/claim-form-modal';

import {
  PaginatedResponse,
  Report,
  ReportFilters,
  ReportStatusEnum
} from '../../../models/item-model';

type ItemType = 'lost' | 'found';

@Component({
  selector: 'app-admin-item-list-page',
  standalone: true,
  imports: [
    CommonModule,
    ReportItemGrid,
    SearchBarComponent,
    Filter,
    CodesModal,
    ItemDetailModal,
    DeleteReportModal,
    UnarchiveConfirmationModal,
    ClaimFormModal
  ],
  providers: [DatePipe],
  templateUrl: './admin-item-list-page.html',
  styleUrl: './admin-item-list-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminItemListPage implements OnInit, AfterViewInit, OnDestroy {
  protected readonly REPORT_STATUS = ReportStatusEnum;
  protected readonly ReportStatusEnum = ReportStatusEnum;
  private route = inject(ActivatedRoute);
  private itemService = inject(ItemService);
  private authService = inject(AuthService);
  private adminService = inject(AdminService);
  private claimService = inject(ClaimService);
  private toastService = inject(ToastService);
  private datePipe = inject(DatePipe);

  private destroy$ = new Subject<void>();
  private refreshTrigger$ = new BehaviorSubject<void>(undefined);

  @ViewChild('scrollAnchor') public scrollAnchor!: ElementRef;
  private observer!: IntersectionObserver;

  public currentPage = signal(1);
  public pageSize = signal(10);
  public totalPages = signal(1);
  public totalItems = signal(0);

  public currentUser = toSignal(this.authService.currentUser$);
  public currentUserId = computed<number | null>(
      () => this.currentUser()?.user_id ?? null
  );

  public itemType = signal<ItemType>('lost');
  public isArchiveView = signal(false);
  public highlightId = signal<number | null>(null);

  @HostBinding('class.theme-lost') get isLost(): boolean {
    return this.itemType() === 'lost';
  }
  @HostBinding('class.theme-found') get isFound(): boolean {
    return this.itemType() === 'found';
  }

  public adminStatuses = signal<string[]>([
    'pending', 'approved', 'resolved', 'rejected', 'claimed'
  ]);

  public searchSuggestions = signal<string[]>([]);
  public showDeleteModal = signal(false);
  public itemToDelete = signal<Report | null>(null);
  public viewCodeItem = signal<Report | null>(null);
  public selectedItem = signal<Report | null>(null);
  public editingItem = signal<Report | null>(null);
  public itemToUnarchive = signal<Report | null>(null);

  public currentSort = signal<'newest' | 'oldest'>('newest');
  public currentDateFilter = signal<Date | null>(null);
  public currentLocationFilter = signal('');
  public currentStatusFilter = signal('pending');
  public currentSurrenderedLocation = signal('');
  public searchQuery = signal('');
  public currentCategoryFilter = signal<string[]>([]);

  public headerIcon = signal('assets/archive-items.png');

  public allReports = signal<Report[]>([]);
  public isLoading = signal(true);
  public error = signal<string | null>(null);

  public locationFilters = computed((): string[] => {
    const locs = this.allReports()
      .map((r: Report) => r.location)
      .filter((l: string) => !!l);
    return [...new Set(locs)];
  });

  public visibleReports = computed((): Report[] => {
    let reports = [...this.allReports()];

    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      reports = reports.filter((r: Report) =>
        r.item_name.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.location.toLowerCase().includes(query)
      );
    }

    const dateFilter = this.currentDateFilter();
    const locationFilter = this.currentLocationFilter();
    const surrenderedLoc = this.currentSurrenderedLocation();
    const sort = this.currentSort();

    if (dateFilter) {
      const filterDateStr = this.datePipe.transform(dateFilter, 'yyyy-MM-dd');
      reports = reports.filter((report: Report) => {
        const reportDateStr = 
            this.datePipe.transform(report.date_lost_found, 'yyyy-MM-dd');
        return reportDateStr === filterDateStr;
      });
    }

    if (locationFilter) {
      reports = reports.filter((r: Report) =>
        r.location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    const categoryFilter = this.currentCategoryFilter();
      if (categoryFilter && categoryFilter.length > 0) {
        reports = reports.filter(r => 
          categoryFilter.includes((r as any).category_name)
        );
      }

      if (surrenderedLoc) {
        reports = reports.filter((r: Report) => 
          (r as any).surrendered_location_name === surrenderedLoc
        );
      }

    reports.sort((a: Report, b: Report): number => {
      const hId = this.highlightId();
      if (hId) {
        if (a.report_id === hId) return -1;
        if (b.report_id === hId) return 1;
      }

      const dateA = new Date(a.date_reported).getTime();
      const dateB = new Date(b.date_reported).getTime();
      return sort === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return reports;
  });

  public breadcrumbMain = computed((): string => {
    return this.isArchiveView() ? 'Archive Items' : 'Admin List';
  });

  public breadcrumbSub = computed((): string => {
    if (this.isArchiveView()) {
      return this.itemType() === 'lost' ? 'Resolved Items' : 'Claimed Items';
    }
    return this.itemType() === 'lost' ? 'Lost Items' : 'Found Items';
  });

  public codeModalTitle = computed((): string => {
    const item = this.viewCodeItem();
    if (!item) return '';
    if (item.type === 'lost' || item.claim_code) return 'Ticket ID';
    return 'Reference Code';
  });

  public codeModalValue = computed((): string => {
    const item = this.viewCodeItem();
    if (!item) return '';
    if (item.claim_code) return item.claim_code;
    if (item.type === 'lost') return item.report_id ?
        `Report #${item.report_id}` : 'Pending';
    return item.surrender_code || 'N/A';
  });

  public ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params: Params) => {
        const hId = params['highlightId'];
        this.highlightId.set(hId ? Number(hId) : null);
      });

    combineLatest([
      this.route.data,
      this.refreshTrigger$
    ]).pipe(
      tap(([data]: [Data, void]) => {
        const type = data['type'] || data['itemType'];
        this.itemType.set(type as ItemType);
        
        this.isArchiveView.set(
          data['status'] === 'resolved' || data['status'] === 'claimed'
        );
        this.isLoading.set(true);
      }),
      switchMap(([data]) => {
        let statusId: number = ReportStatusEnum.APPROVED;
        if (data['status'] === 'resolved') statusId = ReportStatusEnum.RESOLVED;
        if (data['status'] === 'claimed') statusId = ReportStatusEnum.CLAIMED;
        const filters: ReportFilters = {
          type: this.itemType(),
          status_id: statusId,
          query: this.searchQuery(),
          page: this.currentPage(),
          size: this.pageSize()
        };

        return this.itemService.getReports(filters).pipe(
          catchError(() => of({ 
            items: [], 
            totalItems: 0, 
            totalPages: 1, 
            currentPage: 1 
          })),
          finalize((): void => this.isLoading.set(false))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe((response: PaginatedResponse<Report>) => {
      this.allReports.update((existing: Report[]) =>
        this.currentPage() === 1 ? response.items :
            [...existing, ...response.items]
      );
      this.totalItems.set(response.totalItems);
      this.totalPages.set(response.totalPages);
    });
  }

  public ngAfterViewInit(): void {
    if (this.scrollAnchor) {
      this.observer = new IntersectionObserver(([entry]: 
            IntersectionObserverEntry[]) => {
        if (entry.isIntersecting && !this.isLoading() &&
            this.currentPage() < this.totalPages()) {
          this.currentPage.update((p: number) => p + 1);
          this.refreshTrigger$.next();
        }
      }, { rootMargin: '100px' });
      this.observer.observe(this.scrollAnchor.nativeElement);
    }
  }

  public ngOnDestroy(): void {
    if (this.observer) this.observer.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  public onIconError(): void {
    this.headerIcon.set('assets/found-items.png');
  }

  public onSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
    this.refreshTrigger$.next();
  }

  public onFilterChange(state: FilterState): void {
    this.currentSort.set(state.sort);
    this.currentDateFilter.set(state.date);
    this.currentLocationFilter.set(state.location);

    if (state.category !== undefined) {
      this.currentCategoryFilter.set(state.category);
    }

    if (state.surrenderedLocation !== undefined) {
      this.currentSurrenderedLocation.set(state.surrenderedLocation);
    }

    if (state.status !== undefined) {
      this.currentStatusFilter.set(state.status);
    }
    
    this.currentPage.set(1);
    this.refreshTrigger$.next();
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
    this.currentPage.set(1);
    this.refreshTrigger$.next();
    this.searchSuggestions.set([]);
  }
  
  public onUnarchive(item: Report): void {
    this.itemToUnarchive.set(item);
  }

  public processUnarchive(): void {
    const item = this.itemToUnarchive();
    if (!item) return;

    const targetStatusId = ReportStatusEnum.APPROVED;

    this.adminService.updateReportStatus(item.report_id, targetStatusId)
      .pipe(
        tap((): void => {
          this.adminService.clearCache();
          this.allReports.update((reports: Report[]) =>
            reports.filter((r: Report) => 
              r.report_id !== item.report_id && 
              r.report_id !== item.matching_lost_report_id
            )
          );
          this.itemToUnarchive.set(null);

          const actionRoute = item.type === 'found' ?
              '/admin/claim-status' : '/admin/report-status';
          const actionLabel = item.type === 'found' ?
              'View Found Status' : 'View Lost Item';

          this.toastService.showSuccess(
            'Item and linked reports unarchived successfully.',
            actionLabel,
            actionRoute,
            { highlightId: item.report_id }
          );
        }),
        catchError((err: HttpErrorResponse) => {
          console.error('Failed to unarchive item', err);
          this.toastService.showError('Failed to unarchive item.');
          return of(null);
        })
      )
      .subscribe();
  }

  public cancelUnarchive(): void {
    this.itemToUnarchive.set(null);
  }

  public onCardClick(item: Report): void { this.selectedItem.set(item); }

  public onTicketClick(item: Report): void {
    if (!this.currentUserId()) return;
    this.claimService.submitClaim(item.report_id).subscribe({
        next: (response: { claim_code: string }) => {
            const itemWithCode = { ...item, claim_code: response.claim_code };
            this.viewCodeItem.set(itemWithCode);
        }
    });
  }

  public onEditClick(item: Report): void {
    console.log('Edit clicked for', item.report_id);
  }

  public onDeleteClick(item: Report): void {
      this.itemToDelete.set(item);
      this.showDeleteModal.set(true);
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

  public cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.itemToDelete.set(null);
  }

  public onViewCodeClick(item: Report): void {
    this.viewCodeItem.set(item);
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

  public onModalUnarchive(): void {
    const item = this.selectedItem();
    if (item) {
      this.selectedItem.set(null);
      this.onUnarchive(item);
    }
  }

  public getUserProfilePicture(): string | null {
    const item = this.selectedItem();
    return item?.reporter_profile_picture ?? null;
  }
}