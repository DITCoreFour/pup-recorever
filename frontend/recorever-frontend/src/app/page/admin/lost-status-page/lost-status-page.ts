import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Params } from '@angular/router';
import {
  tap,
  catchError,
  of,
  switchMap,
  takeUntil,
  Subject,
  BehaviorSubject
} from 'rxjs';

import {
  ReportItemGrid
} from '../../../share-ui-blocks/report-item-grid/report-item-grid';
import {
  SearchBarComponent
} from '../../../share-ui-blocks/search-bar/search-bar';
import { Filter, FilterState } from '../../../share-ui-blocks/filter/filter';

import {
  Report,
  ReportFilters,
  PaginatedResponse,
  ReportStatusEnum
} from '../../../models/item-model';
import { ItemService } from '../../../core/services/item-service';
import { AdminService } from '../../../core/services/admin-service';
import { ToastService } from '../../../core/services/toast-service';
import { environment } from '../../../../environments/environment';

import {
  ItemDetailModal
} from "../../../modal/item-detail-modal/item-detail-modal";

type LostReportStatusFilter = 'All Statuses' | 'pending'
      | 'approved' | 'matched' | 'rejected';

@Component({
  selector: 'app-lost-status-page',
  standalone: true,
  imports: [
    CommonModule,
    ReportItemGrid,
    SearchBarComponent,
    ItemDetailModal,
    Filter
  ],
  templateUrl: './lost-status-page.html',
  styleUrls: ['./lost-status-page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LostStatusPage implements OnInit, AfterViewInit, OnDestroy {
  private itemService = inject(ItemService);
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);

  private destroy$ = new Subject<void>();
  private refreshTrigger$ = new BehaviorSubject<void>(undefined);
  private reportCache = new Map<string, PaginatedResponse<Report>>();

  @ViewChild('scrollAnchor') scrollAnchor!: ElementRef;
  private observer!: IntersectionObserver;

  public currentUserId = signal<number | null>(null);
  
  public currentPage = signal(1);
  public totalPages = signal(1);
  public pageSize = signal(10);
  public isLoading = signal(true);
  public isError = signal(false);

  public selectedReport = signal<Report | null>(null);
  public reports = signal<Report[]>([]);

  private currentSearchQuery = signal('');

  public currentSort = signal<'newest' | 'oldest'>('newest');
  public currentDateFilter = signal<Date | null>(null);
  public currentLocationFilter = signal('');
  public currentStatusFilter = signal<LostReportStatusFilter>('All Statuses');
  public highlightId = signal<number | null>(null);
  public currentSurrenderedLocationFilter = signal('');

  public readonly statusFilters: LostReportStatusFilter[] = [
    'All Statuses', 'pending', 'approved', 'rejected'
  ];

  public locations = computed((): string[] => {
    const locs = this.reports()
      .map((r: Report) => r.location)
      .filter((l: string) => !!l);
    return [...new Set(locs)];
  });

  public sortedReports = computed((): Report[] => {
    let data = [...this.reports()];
    const sortType = this.currentSort();
    const dateFilter = this.currentDateFilter();
    const locationFilter = this.currentLocationFilter();
    const surrenderedFilter = this.currentSurrenderedLocationFilter();

    if (dateFilter) {
      const filterDateStr = dateFilter.toDateString();
      data = data.filter((r: Report) => 
        new Date(r.date_lost_found || '').toDateString() === filterDateStr
      );
    }

    if (locationFilter) {
      const term = locationFilter.toLowerCase();
      data = data.filter((r: Report) =>
        (r.location || '').toLowerCase().includes(term)
      );
    }

    if (surrenderedFilter) {
      const term = surrenderedFilter.toLowerCase();
      data = data.filter((r: Report) =>
        (r.location || '').toLowerCase().includes(term)
      );
    }

    return data.sort((a: Report, b: Report): number => {
      const hId = this.highlightId();
      if (hId) {
        if (a.report_id === hId) return -1;
        if (b.report_id === hId) return 1;
      }

      const dateA = Date.parse(a.date_reported || '') || 0;
      const dateB = Date.parse(b.date_reported || '') || 0;
      return sortType === 'newest' ? dateB - dateA : dateA - dateB;
    });
  });

  public onFilterChange(state: FilterState): void {
    this.currentSort.set(state.sort);
    this.currentDateFilter.set(state.date);
    this.currentLocationFilter.set(state.location);
    this.currentSurrenderedLocationFilter.set(state.surrenderedLocation || '');

    if (state.status !== undefined && 
        state.status !== this.currentStatusFilter()) {
      this.currentStatusFilter.set(state.status as LostReportStatusFilter);
      this.resetAndReload(); 
    }
  }

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
          type: 'lost' as const,
          status_id: statusId,
          query: this.currentSearchQuery() || undefined,
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
          catchError(() => {
            this.isError.set(true);
            return of({
                items: [],
                totalPages: 1,
                totalItems: 0,
                currentPage: 1 
            });
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe((response: PaginatedResponse<Report>) => {
      const filtered = response.items.filter(item =>
        item.status?.status_id !== ReportStatusEnum.RESOLVED
      );

      this.reports.update((existing: Report[]) =>
        this.currentPage() === 1 ? filtered : [...existing, ...filtered]
      );
      this.totalPages.set(response.totalPages);
      this.isLoading.set(false);
      this.isError.set(false);
    });
  }

  public ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(([entry]: 
            IntersectionObserverEntry[]) => {
      if (entry.isIntersecting && !this.isLoading()
            && this.currentPage() < this.totalPages()) {
        this.currentPage.update((p: number) => p + 1);
        this.refreshTrigger$.next();
      }
    }, { rootMargin: '150px' });
    if (this.scrollAnchor) {
      this.observer.observe(this.scrollAnchor.nativeElement);
    }
  }

  public ngOnDestroy(): void {
    if (this.observer) this.observer.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  public onStatusUpdate(newStatus: ReportStatusEnum): void {
    const item = this.selectedReport();
    if (!item) return;

    this.adminService.updateReportStatus(item.report_id, newStatus).subscribe({
      next: () => {
        this.onStatusUpdated();
          this.toastService.showSuccess(
            `Item marked as ${this.getStatusNameById(newStatus)} successfully.`
          );
      },
      error: (): void => {
        this.toastService.showError(
            'Failed to update status. Please try again.'
        );
      }
    });
  }

  private getStatusNameById(statusId: ReportStatusEnum): string {
    const statusMap: Record<number, string> = {
      [ReportStatusEnum.PENDING]: 'pending',
      [ReportStatusEnum.APPROVED]: 'approved',
      [ReportStatusEnum.REJECTED]: 'rejected',
      [ReportStatusEnum.CLAIMED]: 'claimed',
      [ReportStatusEnum.RESOLVED]: 'resolved',
      [ReportStatusEnum.MATCHED]: 'matched'
    };

    return statusMap[statusId] || 'unknown';
  }

  public setStatusFilter(status: string): void {
    this.currentStatusFilter.set(status as LostReportStatusFilter);
    this.resetAndReload();
  }

  public onSearchSubmit(query: string): void {
    const trimmedQuery = query.trim();
    if (this.currentSearchQuery() === trimmedQuery) return;
    this.currentSearchQuery.set(trimmedQuery);
    this.resetAndReload();
  }

  public getUserProfilePicture(): string {
    const report = this.selectedReport();
    if (report && report.reporter_profile_picture) {
      const baseUrl = environment.apiUrl.replace('http://', 'https://');
      return `${baseUrl}/image/download/${report.reporter_profile_picture}`;
    }
    return 'assets/profile-avatar.png';
  }

  private resetAndReload(): void {
    this.currentPage.set(1);
    this.reports.set([]);
    this.refreshTrigger$.next();
  }

  public onViewDetails(report: Report): void {
    this.selectedReport.set(report);
  }

  public onCloseDetailView(): void {
    this.selectedReport.set(null);
  }

  public onStatusUpdated(): void {
    this.reportCache.clear();
    this.resetAndReload();
    this.onCloseDetailView();
  }
}