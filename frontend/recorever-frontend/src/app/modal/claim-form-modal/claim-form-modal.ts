import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  signal,
  ChangeDetectionStrategy,
  computed
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule
} from '@angular/forms';
import { of, forkJoin } from 'rxjs';
import {
  switchMap,
  finalize,
  tap,
  debounceTime,
  distinctUntilChanged,
  map,
  filter,
  catchError
} from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth-service';

// Material Imports
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent
} from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRadioModule } from '@angular/material/radio';

import { Claim } from '../../models/claim-model';
import { Report, ReportStatusEnum } from '../../models/item-model';
import { User } from '../../models/user-model';
import { ClaimService } from '../../core/services/claim-service';
import { ItemService } from '../../core/services/item-service';
import { UserService } from '../../core/services/user-service';
import { AdminService } from '../../core/services/admin-service';
import { StatusBadge, ItemStatus } from '../../share-ui-blocks/status-badge/status-badge';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/services/toast-service';

export enum ClaimStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  CLAIMED = 'claimed',
  REJECTED = 'rejected'
}

@Component({
  selector: 'app-claim-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    MatTooltipModule,
    MatRadioModule,
    StatusBadge,
    MatMenuModule,
    MatDividerModule
  ],
  providers: [DatePipe],
  templateUrl: './claim-form-modal.html',
  styleUrl: './claim-form-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClaimFormModal implements OnInit {
  private claimService = inject(ClaimService);
  private itemService = inject(ItemService);
  private userService = inject(UserService);
  private adminService = inject(AdminService);
  private fb = inject(FormBuilder);
  private datePipe = inject(DatePipe);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private authService = inject(AuthService);

  @Input({ required: true }) claimData!: Claim | Report;
  @Input() isReadOnly: boolean = false;
  @Input() isArchive: boolean = false;

  @Output() close = new EventEmitter<void>();
  @Output() statusChange = new EventEmitter<ReportStatusEnum>();
  @Output() unarchive = new EventEmitter<void>();
  @Output() editClicked = new EventEmitter<void>();
  @Output() deleteClicked = new EventEmitter<void>();

  protected readonly ClaimStatus = ClaimStatus;
  protected readonly REPORT_STATUS = ReportStatusEnum;

  protected readonly STATUS_OPTIONS = [
  { value: this.REPORT_STATUS.PENDING, label: 'Pending' },
  { value: this.REPORT_STATUS.APPROVED, label: 'Verified' },
  { value: this.REPORT_STATUS.CLAIMED, label: 'Claimed' },
  { value: this.REPORT_STATUS.REJECTED, label: 'Rejected' }
];

  protected claimForm: FormGroup;
  protected activeClaim = signal<Claim | null>(null);
  protected activeReport = signal<Report | null>(null);
  protected report = signal<Report | null>(null);
  protected reportOwnerName = signal<string>('Loading...');
  protected reportOwnerPicture = signal<string | null>(null);
  protected isLoading = signal(true);
  protected isSaving = signal(false);
  protected activeImageIndex = signal(0);
  protected isDropdownOpen = signal(false);
  protected filteredUsers = signal<User[]>([]);
  protected isSearchingUsers = signal(false);
  protected matchingLostReports = signal<Report[]>([]);
  protected isSearchingReports = signal(false);
  protected selectedLostReportId = signal<number | null>(null);
  
  // Signal to control zoom state
  protected isZoomed = signal(false);

  protected isReportType = computed(() => 'type' in this.claimData);

  get displayDate(): Date | string {
    if (this.isReportType()) {
      return (this.claimData as Report).date_reported;
    }
    return (this.claimData as Claim).created_at;
  }

  protected displayStatus = computed((): ItemStatus => {
    const currentStatus = this.report()?.status?.status_id;
    if (currentStatus === this.REPORT_STATUS.CLAIMED) {
      return 'Claimed';
    }
    if (currentStatus === this.REPORT_STATUS.RESOLVED) {
      return 'Resolved';
    }

    if (currentStatus === this.REPORT_STATUS.APPROVED ||
        currentStatus === this.REPORT_STATUS.MATCHED) {
      return 'Verified';
    }

    if (currentStatus === this.REPORT_STATUS.REJECTED) {
      return 'Rejected';
    }

    return 'Pending';
  });

  protected referenceCodeValue = computed((): string => {
    const r = this.report();
    if (!r) return 'N/A';
    return r.surrender_code || r.claim_code || 'N/A';
  });

  protected photoUrls = computed((): string[] => {
    const report = this.report();
    if (!report) return [];
    if (report.images && report.images.length > 0) {
      return report.images.map(img => img.imageUrl);
    }
    if (report.photoUrls && report.photoUrls.length > 0) {
      return report.photoUrls;
    }
    return [];
  });

  protected currentImageUrl = computed((): string => {
    const urls = this.photoUrls();
    if (urls.length === 0) {
      return 'assets/temp-photo-item.png';
    }
    const index = this.activeImageIndex() % urls.length;
    const url = urls[index];
    if (url && url.startsWith('http')) {
      return url.replace('http://', 'https://');
    }
    const secureBaseUrl = environment.apiUrl.replace('http://', 'https://');
    return `${secureBaseUrl}/image/download/${url}`;
  });

  constructor() {
    this.claimForm = this.fb.group({
      claimantName: ['', {
        validators: [Validators.required],
        updateOn: 'change'
      }],
      claimDate: [{ value: '', disabled: true }],
      contactEmail: ['', {
        validators: [Validators.email],
        updateOn: 'change'
      }],
      contactPhone: [''],
      remarks: ['']
    });
  }

  ngOnInit(): void {
    this.loadData();
    this.setupUserSearch();
  }

  private setupUserSearch(): void {
    if (this.isReadOnly) return;

    this.claimForm.get('claimantName')?.valueChanges.pipe(
      map(value => typeof value === 'string' ? value.trim() : ''),
      tap(term => {
        if (!term) {
          this.filteredUsers.set([]);
          this.isSearchingUsers.set(false);
          this.matchingLostReports.set([]);
          this.selectedLostReportId.set(null);
        }
      }),
      filter(term => term.length > 0), 
      debounceTime(500), 
      distinctUntilChanged(),
      tap(() => this.isSearchingUsers.set(true)),
      switchMap(term => {
        if (!navigator.onLine) {
           this.toastService.showError
              ('You are currently offline. Cannot search users.');
           this.isSearchingUsers.set(false);
           return of([]);
        }

        return this.userService.searchUsers(term).pipe(
          catchError((err) => {
            console.error('Failed to search users', err);
            this.toastService.showError
                ('Network error while searching for users.');
            return of([]); 
          }),
          finalize(() => this.isSearchingUsers.set(false))
        );
      })
    ).subscribe({
      next: users => this.filteredUsers.set(users),
      error: () => {
        this.isSearchingUsers.set(false);
        this.filteredUsers.set([]);
      }
    });
  }

  protected displayUserFn(user: User): string {
    return user ? `${user.first_name} ${user.last_name}` : '';
  }

  protected onUserSelected(event: MatAutocompleteSelectedEvent): void {
    const user: User = event.option.value;

    this.claimForm.patchValue({
      contactEmail: user.email,
      contactPhone: '' // Phone removed from system; leave empty
    });

    this.fetchMatchingLostReports(user.user_id);
  }

  private fetchMatchingLostReports(userId: number): void {
    const currentFoundItem = this.report();
    if (!currentFoundItem) return;

    this.isSearchingReports.set(true);
    this.matchingLostReports.set([]);
    this.selectedLostReportId.set(null);

    const potential$ = this.itemService.getPotentialMatches
      (currentFoundItem.report_id, userId).pipe(
      catchError(() => of([] as Report[]))
    );

    const userLostReports$ = this.itemService.getReports
      ({ type: 'lost', user_id: userId }).pipe(
      map(res => res.items || []),
      catchError(() => of([] as Report[]))
    );

    const exactMatch$ = this.itemService.getMatchForReport
      (currentFoundItem.report_id).pipe(
      switchMap(match => {
        if (match && match.lost_report_id) {
          return this.itemService.getReportById(match.lost_report_id).pipe(
            catchError(() => of(null))
          );
        }
        return of(null);
      }),
      catchError(() => of(null))
    );

    forkJoin([potential$, userLostReports$, exactMatch$]).pipe(
      finalize(() => this.isSearchingReports.set(false))
    ).subscribe({
      next: ([potential, userReports, exact]) => {
        const combinedMap = new Map<number, Report>();

        potential.forEach(r => combinedMap.set(r.report_id, r));
        userReports.forEach(r => combinedMap.set(r.report_id, r));
        
        if (exact && exact.report_id) {
          combinedMap.set(exact.report_id, exact);
        }

        const finalMatches = Array.from(combinedMap.values()).filter(r => {
          if (exact && r.report_id === exact.report_id) return true;
          
          return r.status?.status_id === this.REPORT_STATUS.APPROVED ||
                 r.status?.status_id === this.REPORT_STATUS.MATCHED;
        });

        this.matchingLostReports.set(finalMatches);

        if (exact && exact.report_id) {
          this.selectedLostReportId.set(exact.report_id);
        } else if (finalMatches.length > 0 && currentFoundItem.status?.status_id
              === this.REPORT_STATUS.MATCHED) {
          this.selectedLostReportId.set(finalMatches[0].report_id);
        }
      },
      error: () => this.toastService.showError
          ('Failed to fetch matching reports')
    });
  }

  protected getUserAvatar(user: User): string {
    if (!user.profile_picture) return '';
    if (user.profile_picture.startsWith('http')) return user.profile_picture;
    const secureBaseUrl = environment.apiUrl.replace('http://', 'https://');
    return `${secureBaseUrl}/image/download/${user.profile_picture}`;
  }

  private loadData(): void {
    this.isLoading.set(true);
    const data = this.claimData;

    if ('type' in data) {
      const report = data as Report;
      this.activeReport.set(report);
      this.report.set(report);

      const todayStr = this.datePipe.transform(new Date(), 'mediumDate');
      this.claimForm.patchValue({ claimDate: todayStr });

      if (this.isArchive &&
          report.status?.status_id === this.REPORT_STATUS.CLAIMED) {
        this.claimService.getClaimByReportId(report.report_id).pipe(
          tap((claim: Claim) => {
            if (claim) {
              this.activeClaim.set(claim);
              this.patchFormForExistingClaim(claim);
            }
          }),
          switchMap(() => this.userService.getUserById(report.user_id)),
          finalize(() => this.isLoading.set(false))
        ).subscribe({
          next: (user) => {
            this.reportOwnerName.set(user ? `${user.first_name} 
                    ${user.last_name}` : 'Unknown User');
            this.reportOwnerPicture.set(user?.profile_picture || null); 
          },
          error: () => this.isLoading.set(false)
        });
      } else {
        this.userService.getUserById(report.user_id).pipe(
          finalize(() => this.isLoading.set(false))
        ).subscribe({
          next: (user) => {
            this.reportOwnerName.set(user ? `${user.first_name} 
                    {user.last_name}` : 'Unknown User');
            this.reportOwnerPicture.set(user?.profile_picture || null);
          },
          error: (err) => console.error('Error loading report owner', err)
        });
      }
    } else {
      const claim = data as Claim;
      this.activeClaim.set(claim);
      this.itemService.getReports({ type: 'found' }).pipe(
        switchMap((reports) => {
          const foundReport = reports.items.find(r => r.report_id === claim.report_id);
          this.report.set(foundReport || null);
          this.patchFormForExistingClaim(claim);
          return foundReport ? this.userService.getUserById(foundReport.user_id) : of(null);
        }),
        finalize(() => this.isLoading.set(false))
      ).subscribe({
        next: (owner) => {
          if (owner) {
            this.reportOwnerName.set(owner ? `${owner.first_name} 
                    ${owner.last_name}` : 'Unknown User');
            // Capture the reporter's profile picture filename
            this.reportOwnerPicture.set(owner.profile_picture || null);
          }
        },
        error: (err) => console.error('Error loading claim data', err)
      });
    }
  }

  protected getReportOwnerPicture(): string {
    const path = this.reportOwnerPicture();

    if (!path) {
        return 'assets/profile-avatar.png'; // Fallback if no picture
    }

    if (path.startsWith('http')) {
        return path.replace('http://', 'https://');
    }

    // Connects to your Spring Boot image controller
    const secureBaseUrl = environment.apiUrl.replace('http://', 'https://').replace(/\/$/, '');
    return `${secureBaseUrl}/image/download/${path}`;
  }

  private patchFormForExistingClaim(claim: Claim): void {
    const formattedDate = 
        this.datePipe.transform(claim.created_at, 'mediumDate') || '';
    this.claimForm.patchValue({
      claimantName: claim.claimant_name || '',
      claimDate: formattedDate,
      contactEmail: claim.contact_email || '',
      contactPhone: claim.contact_phone || '',
      remarks: claim.admin_remarks || ''
    });

    if (this.isReadOnly) {
      this.claimForm.disable();
    }
  }

  protected onStatusOptionClick(statusId: number): void {
    if (this.isReadOnly) return;
    if (statusId === this.REPORT_STATUS.CLAIMED) {
      this.toastService.showError('Please fill out Claimant Details and click' +
          '"Submit" to mark this item as Claimed.');
      this.closeDropdown();
      return;
    }
    this.updateStatusById(statusId);
  }

  protected updateStatusById(statusId: number): void {
    this.updateStatus(statusId);
  }

  protected isStatusDisabled(status: ReportStatusEnum): boolean {
    return status === ReportStatusEnum.CLAIMED || this.isReadOnly;
  }

  protected getOptionTooltip(status: ReportStatusEnum): string {
    return status === ReportStatusEnum.CLAIMED
      ? 'Please fill out Claimant Details and click "Submit"' +
          'to mark this item as Claimed.'
      : '';
  }

  protected toggleDropdown(event: Event): void {
    event.stopPropagation();
    if (this.isReadOnly) return;
    this.isDropdownOpen.update(v => !v);
  }

  protected closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }

  protected updateStatus(newStatusId: ReportStatusEnum): void {
    this.isSaving.set(true);
    const reportId = this.report()?.report_id;
    if (reportId) {
      this.adminService.updateReportStatus(reportId, newStatusId).subscribe({
        next: () => {
          this.report.update(r => {
            if (!r) return null;

            const option = this.STATUS_OPTIONS.find(
              o => o.value === newStatusId
            );
            const newLabel = option ? option.label.toLowerCase() : 'pending';

            return {
              ...r,
              status: {
                ...r.status,
                status_id: newStatusId,
                status_name: newLabel
              }
            };
          });
          this.isSaving.set(false);
          this.closeDropdown();
          this.statusChange.emit(newStatusId);
        },
        error: (err) => {
          console.error('Failed to update status', err);
          this.toastService.showError('Failed to update status.' +
              'Please try again.');
          this.isSaving.set(false);
          this.closeDropdown();
        }
      });
    } else {
      this.isSaving.set(false);
    }
  }

  private getStatusNameById(statusId: number): string {
    const map: Record<number, string> = {
      [this.REPORT_STATUS.PENDING]: 'pending',
      [this.REPORT_STATUS.APPROVED]: 'approved',
      [this.REPORT_STATUS.CLAIMED]: 'claimed',
      [this.REPORT_STATUS.REJECTED]: 'rejected',
      [this.REPORT_STATUS.RESOLVED]: 'resolved',
      [this.REPORT_STATUS.MATCHED]: 'matched'
    };

    return map[statusId] || 'pending';
  }

  protected saveItemDetails(): void {
    if (this.isReadOnly) return;
    const currentStatus = this.report()?.status?.status_id;

    if (currentStatus === ReportStatusEnum.PENDING ||
        currentStatus === ReportStatusEnum.REJECTED) {
      this.toastService.showError(
        'Cannot submit a claim for reports that are Pending or Rejected.'
      );
      return;
    }

    if (this.claimForm.invalid) {
      this.claimForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formValues = this.claimForm.getRawValue();

    const cName = typeof formValues.claimantName === 'object'
      ? `${formValues.claimantName.first_name} 
      ${formValues.claimantName.last_name}`
      : formValues.claimantName;

    if (this.activeReport()) {
      const report = this.activeReport()!;
      const payload = {
        report_id: report.report_id,
        claimant_name: cName,
        contact_email: formValues.contactEmail,
        contact_phone: formValues.contactPhone,
        admin_remarks: formValues.remarks,
        matching_lost_report_id: this.selectedLostReportId()
      };

      this.claimService.createManualClaim(payload).subscribe({
        next: () => {
          this.report.update(r => r ? {
            ...r,
            status: {
              ...r.status,
              status_id: ReportStatusEnum.CLAIMED,
              status_name: 'claimed'
            }
          } : null);
          this.isSaving.set(false);
          this.statusChange.emit(ReportStatusEnum.CLAIMED);
          this.onClose();
        },
        error: (err) => {
          console.error('Failed to save claim', err);
          this.toastService.showError('Failed to submit the claim.' +
              ' Please check your connection and try again.');
          this.isSaving.set(false);
        }
      });
    } else if (this.activeClaim()) {
       this.isSaving.set(false);
       this.onClose();
    }
  }

  protected onUnarchive(): void {
    this.unarchive.emit();
  }

  protected nextImage(event: Event): void {
    event.stopPropagation();
    const len = this.photoUrls().length;
    if (len > 0) this.activeImageIndex.update((i) => (i + 1) % len);
  }

  protected prevImage(event: Event): void {
    event.stopPropagation();
    const len = this.photoUrls().length;
    if (len > 0) this.activeImageIndex.update((i) => (i - 1 + len) % len);
  }

  protected openZoom(): void {
    this.isZoomed.set(true);
  }

  protected closeZoom(): void {
    this.isZoomed.set(false);
  }

  onClose(): void {
    this.close.emit();
  }

  protected categoryName = computed((): string => {
    return (this.report() as any)?.category?.category_name || 'Uncategorized';
  });

  protected surrenderedLocationName = computed((): string | null => {
    const r = this.report();
    if (r?.type === 'found' && r?.surrendered_location?.surrendered_location_name) {
      return r.surrendered_location.surrendered_location_name;
    }
    return null;
  });

  public onEdit(): void {
    const reportData: Report | null = this.report();
    if (!reportData) return;
    
    const path: string = reportData.type === 'lost'
      ? '/admin/report-lost'
      : '/admin/report-found';
    
    this.router.navigate([path], {
      state: { data: reportData, mode: 'EDIT' }
    });
    
    this.editClicked.emit();
    this.onClose();
  }

  public onDelete(): void {
    this.deleteClicked.emit();
    this.onClose();
  }

  protected effectiveAdmin = computed((): boolean => {
    return this.authService.isAdmin();
  });

  protected navigateToProfile(): void {
    if (!this.effectiveAdmin()) return;

    const userId = this.report()?.user_id;
    if (userId) {
      this.onClose();
      this.router.navigate(['/admin/profile', userId]);
    }
  }
}