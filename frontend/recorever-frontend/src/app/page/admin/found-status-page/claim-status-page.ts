import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Params, ActivatedRoute } from '@angular/router';
import { Subject, BehaviorSubject, of, Observable } from 'rxjs';
import { catchError, switchMap, takeUntil, tap } from 'rxjs/operators';

import { ItemService } from '../../../core/services/item-service';
import { AuthService } from '../../../core/auth/auth-service';
import { ToastService } from '../../../core/services/toast-service';

import {
  Report,
  ReportFilters,
  PaginatedResponse,
  ReportStatusEnum
} from '../../../models/item-model';

import {
  SearchBarComponent
} from '../../../share-ui-blocks/search-bar/search-bar';
import {
  ReportItemGrid
} from '../../../share-ui-blocks/report-item-grid/report-item-grid';
import {
  ClaimFormModal
} from '../../../modal/claim-form-modal/claim-form-modal';
import {
  Filter,
  FilterState
} from '../../../share-ui-blocks/filter/filter';
import { DeleteReportModal } 
    from "../../../modal/delete-report-modal/delete-report-modal";

type StatusFilter = 'All Statuses' | 'pending' | 'approved' | 'rejected';

@Component({
  selector: 'app-claim-status-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SearchBarComponent,
    ClaimFormModal,
    ReportItemGrid,
    Filter,
    DeleteReportModal
  ],
  templateUrl: './claim-status-page.html',
  styleUrl: './claim-status-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClaimStatusPage implements OnInit, AfterViewInit, OnDestroy {
  private itemService = inject(ItemService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);

  private destroy$ = new Subject<void>();
  private refreshTrigger$ = new BehaviorSubject<void>(undefined);
  private reportCache = new Map<string, PaginatedResponse<Report>>();

  @ViewChild('scrollAnchor') public scrollAnchor!: ElementRef;
  private observer!: IntersectionObserver;

  public currentPage = signal(1);
  public totalPages = signal(1);
  public pageSize = signal(10);
  public searchQuery = signal('');
  public isLoading = signal(true);
  public currentCategoryFilter = signal<string[]>([]);

  public reports = signal<Report[]>([]);
  public selectedReport = signal<Report | null>(null);

  public currentStatusFilter = signal<StatusFilter>('All Statuses');
  public highlightId = signal<number | null>(null);
  public currentSurrenderedLocationFilter = signal('');
  public showDeleteModal = signal(false);
  public itemToDelete = signal<Report | null>(null);

  public currentFilter = signal<FilterState>({
    sort: 'newest',
    date: null,
    location: ''
  });

  public readonly statusFilters: StatusFilter[] = [
    'All Statuses', 'pending', 'approved', 'rejected'
  ];

  public isAdmin = computed((): boolean => {
    const user = this.authService.currentUserValue;
    return user?.role === 'admin';
  });

  protected filteredReports = computed((): Report[] => {
    let data = this.reports().filter((r: Report): boolean =>
      r.status.status_id !== ReportStatusEnum.CLAIMED
    );

    const filter = this.currentFilter();
    const surrenderedFilter = this.currentSurrenderedLocationFilter();

    if (filter.location) {
      const locTerm = filter.location.toLowerCase();
      data = data.filter((r: Report): boolean =>
        (r.location || '').toLowerCase().includes(locTerm)
      );
    }

    const categoryFilter = this.currentCategoryFilter();
    if (categoryFilter && categoryFilter.length > 0) {
      data = data.filter((r: Report): boolean => {
        const catName = r.category?.category_name;
        return catName ? categoryFilter.includes(catName) : false;
      });
    }

    if (surrenderedFilter) {
      data = data.filter((r: Report): boolean => {
        const locName = r.surrendered_location?.surrendered_location_name;
        return locName === surrenderedFilter;
      });
    }

    if (filter.date) {
      const filterDate = new Date(filter.date).setHours(0, 0, 0, 0);
      data = data.filter((r: Report): boolean => {
        const reportDate = new Date(r.date_reported).setHours(0, 0, 0, 0);
        return reportDate === filterDate;
      });
    }

    return [...data].sort((a: Report, b: Report): number => {
      const hId = this.highlightId();
      if (hId) {
        if (a.report_id === hId) return -1;
        if (b.report_id === hId) return 1;
      }

      const dateA = new Date(a.date_reported).getTime();
      const dateB = new Date(b.date_reported).getTime();
      return filter.sort === 'newest' ? dateB - dateA : dateA - dateB;
    });
  });

  private mapStatusToId(status: string): number | undefined {
    if (status === 'All Statuses') return undefined;
    switch (status.toLowerCase()) {
      case 'pending': return ReportStatusEnum.PENDING;
      case 'approved': return ReportStatusEnum.APPROVED;
      case 'rejected': return ReportStatusEnum.REJECTED;
      case 'claimed': return ReportStatusEnum.CLAIMED;
      case 'resolved': return ReportStatusEnum.RESOLVED;
      case 'matched': return ReportStatusEnum.MATCHED;
      default: return undefined;
    }
  }

  public ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params: Params): void => {
        const hId = params['highlightId'];
        this.highlightId.set(hId ? Number(hId) : null);
      });

    this.refreshTrigger$.pipe(
      tap((): void => this.isLoading.set(true)),
      switchMap((): Observable<PaginatedResponse<Report>> => {
        const currentStatus = this.currentStatusFilter();
        const statusId = this.mapStatusToId(currentStatus);

        const filters: ReportFilters = {
          type: 'found',
          status_id: statusId,
          query: this.searchQuery(),
          page: this.currentPage(),
          size: this.pageSize()
        };

        const cacheKey = JSON.stringify(filters);

        if (this.reportCache.has(cacheKey)) {
          return of(this.reportCache.get(cacheKey)!);
        }

        return this.itemService.getReports(filters).pipe(
          tap((response: PaginatedResponse<Report>): void => {
              this.reportCache.set(cacheKey, response);
          }),
          catchError((): Observable<PaginatedResponse<Report>> => of({ 
            items: [], 
            totalPages: 1, 
            totalItems: 0, 
            currentPage: 1 
          }))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe((response: PaginatedResponse<Report>): void => {
      this.reports.update((existing: Report[]) =>
        this.currentPage() === 1 ? response.items :
            [...existing, ...response.items]
      );
      this.totalPages.set(response.totalPages);
      this.isLoading.set(false);
    });
  }

  public ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(([entry]: 
            IntersectionObserverEntry[]): void => {
      if (entry.isIntersecting && !this.isLoading() &&
          this.currentPage() < this.totalPages()) {
        this.currentPage.update((p: number): number => p + 1);
        this.refreshTrigger$.next();
      }
    }, { rootMargin: '100px' });
    
    if (this.scrollAnchor) {
      this.observer.observe(this.scrollAnchor.nativeElement);
    }
  }

  public ngOnDestroy(): void {
    if (this.observer) this.observer.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  public setStatusFilter(status: string): void {
    this.currentStatusFilter.set(status as StatusFilter);
    this.resetPagination();
  }

  public onSearch(query: string): void {
    this.searchQuery.set(query.trim());
    this.resetPagination();
  }

  public onFilterChange(state: FilterState): void {
    this.currentFilter.set(state);
    this.currentSurrenderedLocationFilter.set(state.surrenderedLocation || '');

    if (state.category !== undefined) {
      this.currentCategoryFilter.set(state.category);
    }

    if (state.status !== undefined && 
        state.status !== this.currentStatusFilter()) {
      this.currentStatusFilter.set(state.status as StatusFilter);
      this.resetPagination();
    }
  }

  private resetPagination(): void {
    this.currentPage.set(1);
    this.reports.set([]);
    this.refreshTrigger$.next();
  }

  public onViewDetails(reportId: number): void {
    const report = this.reports().find((r: Report): boolean => 
        r.report_id === reportId);
    if (report) {
      this.selectedReport.set(report);
    }
  }

  public onCloseModal(): void {
    this.selectedReport.set(null);
  }

  protected onStatusChanged(statusId: ReportStatusEnum): void {
    const report = this.selectedReport();

    this.reportCache.clear();
    this.resetPagination();
    this.onCloseModal();

    let message = '';
    let actionLabel = '';
    let actionRoute = '';
    let queryParams: Params | undefined = undefined;

    switch (statusId) {
      case ReportStatusEnum.CLAIMED:
        message = 'Item successfully marked as Claimed';
        actionLabel = 'View Archive';
        actionRoute = '/admin/archive/claimed';
        if (report) {
          queryParams = { highlightId: report.report_id };
        }
        break;
      case ReportStatusEnum.APPROVED:
        message = 'Item status updated to Verified';
        break;
      case ReportStatusEnum.REJECTED:
        message = 'Item status updated to Denied';
        break;
      default:
        message = 'Status updated successfully';
    }

    this.toast.showSuccess(message, actionLabel, actionRoute, queryParams);
  }

  public onDeleteClick(item: Report): void {
    this.itemToDelete.set(item);
    this.showDeleteModal.set(true);
  }

  public onModalDelete(): void {
    const item: Report | null = this.selectedReport();
    if (item) {
      this.selectedReport.set(null);
      this.onDeleteClick(item);
    }
  }

  public cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.itemToDelete.set(null);
  }

  public confirmDelete(): void {
    const item: Report | null = this.itemToDelete();
    if (!item) return;

    this.itemService.deleteReport(item.report_id).subscribe({
      next: (): void => {
        this.reports.update((items: Report[]) =>
          items.filter((r: Report): boolean => r.report_id !== item.report_id)
        );
        this.showDeleteModal.set(false);
        this.itemToDelete.set(null);
        this.toast.showSuccess('Report removed successfully.');
      },
      error: (): void => {
        this.toast.showError('Failed to remove report. Please try again.');
        this.showDeleteModal.set(false);
      }
    });
  }
}