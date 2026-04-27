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
import { Subject, BehaviorSubject, of } from 'rxjs';
import { catchError, switchMap, takeUntil, tap } from 'rxjs/operators';

import { ItemService } from '../../../core/services/item-service';
import { AuthService } from '../../../core/auth/auth-service';
import { ToastService } from '../../../core/services/toast-service';

import {
  Report,
  ReportFilters,
  ReportStatus,
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
    Filter
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

  public reports = signal<Report[]>([]);
  public selectedReport = signal<Report | null>(null);

  public currentStatusFilter = signal<StatusFilter>('All Statuses');
  public highlightId = signal<number | null>(null);
  public currentSurrenderedLocationFilter = signal('');

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

  public locations = computed((): string[] => {
    const locs = this.reports()
      .map((r: Report) => r.location)
      .filter((l: string) => !!l);
    return [...new Set(locs)];
  });

  protected filteredReports = computed(() => {
    let data = this.reports().filter(
      r => r.status.status_id !== ReportStatusEnum.CLAIMED
    );

    const filter = this.currentFilter();
    const surrenderedFilter = this.currentSurrenderedLocationFilter();

    if (filter.location) {
      const locTerm = filter.location.toLowerCase();
      data = data.filter((r: Report) =>
        (r.location || '').toLowerCase().includes(locTerm)
      );
    }

    if (surrenderedFilter) {
      const surTerm = surrenderedFilter.toLowerCase();
      data = data.filter((r: Report) =>
        (r.location || '').toLowerCase().includes(surTerm)
      );
    }

    if (filter.date) {
      const filterDate = new Date(filter.date).setHours(0, 0, 0, 0);
      data = data.filter((r: Report) => {
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

  public ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params: Params) => {
        const hId = params['highlightId'];
        this.highlightId.set(hId ? Number(hId) : null);
      });

    this.refreshTrigger$.pipe(
      tap((): void => this.isLoading.set(true)),
      switchMap(() => {
        const currentStatus = this.currentStatusFilter();
        let statusId: number | undefined = undefined;
        if (currentStatus !== 'All Statuses') {
          statusId = (currentStatus as any).status_id ?? currentStatus;
        }

        const filters: ReportFilters = {
          type: 'found' as const,
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
          tap((response: PaginatedResponse<Report>) => 
              this.reportCache.set(cacheKey, response)),
          catchError(() => of({ 
            items: [], 
            totalPages: 1, 
            totalItems: 0, 
            currentPage: 1 
          }))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe((response: PaginatedResponse<Report>) => {
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
            IntersectionObserverEntry[]) => {
      if (entry.isIntersecting && !this.isLoading() &&
          this.currentPage() < this.totalPages()) {
        this.currentPage.update((p: number) => p + 1);
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
    const report = this.reports().find((r: Report) => r.report_id === reportId);
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
}