import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit, inject,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormControl, 
  FormArray,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent
} from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import {
  BehaviorSubject,
  map,
  Observable,
  startWith,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  of
} from 'rxjs';
import {
    Report,
    ItemReportForm as ItemFormType,
    ReportSubmissionPayload,
    ReportSubmissionWithFiles,
    FilePreview,
    StandardLocations,
    Category,
    SurrenderLocation,
    ReportStatusEnum
} from '../../models/item-model';
import { User } from '../../models/user-model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIcon } from "@angular/material/icon";
import { MatSelectModule } from '@angular/material/select';
import { ToastService } from '../../core/services/toast-service';
import { ItemService } from '../../core/services/item-service';
import { UserService } from '../../core/services/user-service';
import { environment } from '../../../environments/environment';
import { ConfirmationModal } from '../../modal/confirmation-modal/confirmation-modal';

@Component({
  selector: 'app-item-report-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatIcon,
    MatSelectModule,
    ConfirmationModal
  ],
  templateUrl: './item-report-form.html',
  styleUrl: './item-report-form.scss',
})
export class ItemReportForm implements OnInit {

  @Input() initialData?: Report | null;
  @Input() isEditMode = false;
  @Input() formType: 'lost' | 'found' = 'lost';
  @Input() isAdminView = false;

  @Output() formSubmitted = new EventEmitter<ReportSubmissionWithFiles>();
  @Output() formCancelled = new EventEmitter<void>();

  protected isCustomLocationModalOpen = false;
  protected selectedFiles: File[] = [];
  protected selectedFilesPreview: FilePreview[] = [];
  protected reportForm: ItemFormType;
  protected locationOptions: string[] = [];
  protected categories: Category[] = [];
  protected surrenderOptions: SurrenderLocation[] = [];
  protected filteredLocations!: Observable<string[]>;
  protected allLocations: string[] = [];
  protected maxDate = new Date();
  protected isSubmitting = false;
  protected loadingMessage = 'Submitting...';
  protected submissionError: string | null = null;
  protected showConfirmationModal = false;
  protected imageError = false;
  protected filteredUsers$!: Observable<User[]>;
  protected selectedUser: User | null = null;

  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  private itemService = inject(ItemService);
  private userService = inject(UserService);
  private cdr = inject(ChangeDetectorRef);

  readonly placeholderText =
      'Please include brand, color, or unique markings '
      + '(e.g., "Black laptop with a PUP sticker on the back").';

  // Getters
  public get locationLabel(): string {
    return this.formType === 'lost' ? 'Location Lost:' : 'Location Found:';
  }

  public get dateLabel(): string {
    return this.formType === 'lost' ? 'Date Lost:' : 'Date Found:';
  }

  private get photoUrlsFormArray(): FormArray<FormControl<string | null>> {
    return this.reportForm.controls.photoUrls;
  }

  protected get descriptionCharCount(): number {
    const value = this.reportForm.controls.description.value || '';
    return value.replace(/\s/g, '').length;
  }

  constructor() {
    this.reportForm = this.fb.group({
      reported_by: [
        '',
        { validators: [
            Validators.required,
            (control: AbstractControl): ValidationErrors | null => {
              const value = control.value;

              if (typeof value === 'string') {
                return value.trim().length === 0 ? { required: true } : null;
              }

              if (value && typeof value === 'object') {
                return null;
              }

              return { required: true };
            }
          ]
        }
      ],
      reporter_email: [
        '',
        { validators: [Validators.email] }
      ],
      reporter_phone: [
        '',
        { validators: [Validators.pattern('^[0-9]*$')] }
      ],
      item_name: ['', {
        validators: [Validators.required, Validators.maxLength(100)],
        updateOn: 'blur'
      }],
      category: [
        null,
        { validators: [Validators.required] }
      ],
      location: [
        '',
        { validators: [Validators.required] }
      ],
      surrendered_location: [
        null,
        { validators: [Validators.required] }
      ],
      date_lost_found: [new Date().toISOString(), {
        validators: [
          Validators.required,
          (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) return null;

            const selectedDate = new Date(control.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            selectedDate.setHours(0, 0, 0, 0);
            return selectedDate > today ? { futureDate: true } : null;
          }
        ] 
      }],
      description: ['', { 
        validators: [
          Validators.required,
          (control: AbstractControl): ValidationErrors | null => {
            const value = control.value || '';
            const noSpacesLength = value.replace(/\s/g, '').length;
            return noSpacesLength < 10 ? { minLengthNoSpaces: true } : null;
          },
          Validators.maxLength(500) 
        ]
      }],
      photoUrls: this.fb.array<FormControl<string | null>>([])
    }) as ItemFormType;
  }

  ngOnInit(): void {
    if (!this.isAdminView) {
      const control = this.reportForm.get('reported_by');
      control?.clearValidators();
      control?.updateValueAndValidity();
    }
    if (this.isAdminView) {
      this.filteredUsers$ = this.reportForm.controls.reported_by.valueChanges
      .pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(value => {
          if (typeof value === 'string' && value.length >= 2) {
            return this.userService.searchUsers(value);
          }
          return of([]);
        })
      );

      this.reportForm.controls.reported_by.valueChanges
        .pipe(distinctUntilChanged())
        .subscribe(value => {
          const selectedName = this.selectedUser
            ? `${this.selectedUser.first_name} ${this.selectedUser.last_name}`
              .trim()
            : null;

          if (typeof value === 'string' && value.trim() !== selectedName) {
            this.selectedUser = null;
            this.reportForm.controls.reporter_email.enable();
          }
        });
    }

    this.itemService.getCategories().subscribe({
      next: (data) => {
        this.categories = data;
        if (this.initialData) {
          this.reportForm.patchValue({
            category: this.initialData.category?.category_id
          });

          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Failed to fetch categories:', err);
        this.categories = [];
      }
    });

    if (this.formType === 'found') {
      this.itemService.getSurrenderLocations().subscribe({
        next: (data) => {
          this.surrenderOptions = data;
          if (this.initialData) {
            this.reportForm.patchValue({
              surrendered_location:
                this.initialData.surrendered_location?.surrendered_location_id
            });

            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          console.error('Failed to fetch surrender locations:', err);
          this.surrenderOptions = [];
        }
      });
    } else {
      const control = this.reportForm.get('surrendered_location');
      control?.clearValidators();
      control?.updateValueAndValidity();

      this.surrenderOptions = [];
    }

    this.itemService.getTopLocations().subscribe({
      next: (locations: string[]) => {
        const standard = Object.values(StandardLocations);
        this.allLocations = [...new Set([...locations, ...standard])];
        this.setupFiltering();
      },
      error: () => {
        this.allLocations = Object.values(StandardLocations);
        this.setupFiltering();
      }
    });

    if (this.initialData) {
      const details = this.initialData.reporter_details;
      const rawDate = this.initialData.date_lost_found
        || this.initialData.date_reported;
      const formattedDate = rawDate ? new Date(rawDate)
        .toISOString().split('T')[0] : '';

      if (details) {
        const fullName = details.person_name;

        this.reportForm.patchValue({
          reported_by: fullName,
          reporter_email: details.person_email,
          reporter_phone: details.person_phone
        });

        this.selectedUser = {
          user_id: details.reported_by_user_id!,
          first_name: fullName.split(' ')[0],
          last_name: fullName.split(' ').slice(1).join(' '),
          email: details.person_email
        } as User;

        this.reportForm.controls.reporter_email.disable();
      } else {
        this.reportForm.patchValue({
          reported_by: this.initialData.reporter_name,
          reporter_email: '',
          reporter_phone: ''
        });
      }

      this.reportForm.patchValue({
        item_name: this.initialData.item_name,
        category: this.initialData.category?.category_id,
        location: this.initialData.location,
        surrendered_location: this.initialData.surrendered_location?.surrendered_location_id,
        date_lost_found: formattedDate,
        description: this.initialData.description
      });

      if (this.initialData.photoUrls || this.initialData.images) {
        this.photoUrlsFormArray.clear();

        const existingImages = this.initialData.images 
          ? this.initialData.images.map(img => img.imageUrl)
          : this.initialData.photoUrls || [];

        existingImages.forEach((url: string) => {
          let displayUrl = url;

          if (url && !url.startsWith('http')) {
            const secureBaseUrl = environment
                .apiUrl.replace('http://', 'https://');
            displayUrl = `${secureBaseUrl}/image/download/${url}`;
          } 
          else if (url && url.startsWith('http://')) {
            displayUrl = url.replace('http://', 'https://');
          }
          
          this.photoUrlsFormArray.push(this.fb.control(displayUrl));
        });
      }
    }
  }

  onUserSelected(event: MatAutocompleteSelectedEvent): void {
    const user = event.option.value as User;

    this.selectedUser = user;

    this.reportForm.patchValue({
      reported_by: `${user.first_name} ${user.last_name}`,
      reporter_email: user.email
    });

    this.reportForm.controls.reporter_email.disable();
  }

  displayUser(user: User | string): string {
    if (!user) return '';
    if (typeof user === 'string') return user;
    return `${user.first_name} ${user.last_name}`;
  }

  protected getProfileImageUrl(path: string | null): string {
    if (!path) {
      return 'assets/default-avatar.png';
    }

    if (path.startsWith('http')) {
      return path.replace('http://', 'https://');
    }

    const secureBaseUrl = environment.apiUrl.replace('http://', 'https://');
    return `${secureBaseUrl}/image/download/${path}`;
  }

  private setupFiltering(): void {
    this.filteredLocations = this.reportForm.controls.location.valueChanges.pipe(
      startWith(''),
      map((value: string | null) => this.filterLocations(value || ''))
    );
  }

  private filterLocations(value: string): string[] {
    const filterValue = value.trim().toLowerCase();
    if (!filterValue) {
      return this.allLocations.slice(0, 5);
    }

    return this.allLocations.filter(option =>
      option.toLowerCase().includes(filterValue)
    );
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    const maxPhotos = 5;
    const maxSizeInBytes = 10 * 1024 * 1024;

    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const currentTotal = this.selectedFiles.length +
          this.photoUrlsFormArray.length;

        if (currentTotal >= maxPhotos) {
          this.toastService.showError("Maximum of 5 photos only.");
          break;
        }

        if (file.size > maxSizeInBytes) {
          this.toastService
              .showError(`File ${file.name} is too large. Max size is 10MB.`);
          continue;
        }

        if (!file.type.match('image/(jpeg|png)')) {
          this.toastService
              .showError("Only JPEG and PNG images are supported.");
          continue;
        }

        const url = URL.createObjectURL(file);
        this.selectedFiles.push(file);
        this.selectedFilesPreview.push({
            file: file, url: url, name: file.name });
      }
      this.imageError = false;
      input.value = '';
    }
  }

  removeLocalPhoto(index: number): void {
    URL.revokeObjectURL(this.selectedFilesPreview[index].url);

    this.selectedFilesPreview.splice(index, 1);
    this.selectedFiles.splice(index, 1);
  }

  removeExistingPhoto(index: number): void {
    this.photoUrlsFormArray.removeAt(index);
  }

  onSubmit(): void {
    const totalImages = this.selectedFiles.length 
        + this.photoUrlsFormArray.length;

    if (totalImages === 0) {
      this.imageError = true;
      this.reportForm.markAllAsTouched();
      return;
    }

    if (this.reportForm.valid && !this.isSubmitting) {
      this.showConfirmationModal = true;
    } else {
      this.reportForm.markAllAsTouched();
    }
  }

  onConfirmSubmission(): void {
    this.showConfirmationModal = false;
    this.proceedWithSubmission();
  }

  onCancelSubmission(): void {
    this.showConfirmationModal = false;
  }

  private proceedWithSubmission(): void {
    this.isSubmitting = true;
    this.loadingMessage = this.isEditMode ? 
                'Updating Report...' : 'Submitting...';

    const rawForm = this.reportForm.getRawValue();

    const formatDateForMySQL = (dateInput: string | Date | null): string => {
        if (!dateInput) return '';
        const d = new Date(dateInput);
        const localDate = 
                    new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
        return localDate.toISOString().slice(0, 19).replace('T', ' ');
    };

    const cleanedPhotoUrls = this.photoUrlsFormArray.value
      .filter((url): url is string => !!url)
      .map((url: string) => {
        if (url.includes('/image/download/')) {
          return url.split('/image/download/')[1];
        }
        return url;
      });

    const basePayload: ReportSubmissionPayload = {
      type: this.formType,
      item_name: this.reportForm.controls.item_name.value!,
      category_id: this.reportForm.controls.category.value!,
      location: this.reportForm.controls.location.value!,
      surrendered_location_id: this.formType === 'found'
        ? this.reportForm.controls.surrendered_location.value
        : null,
      description: this.reportForm.controls.description.value!,
    };

    const finalPayload: ReportSubmissionWithFiles = {
      ...basePayload,
      reported_by_user_id: this.selectedUser ? this.selectedUser.user_id : null,
      reported_by: rawForm.reported_by,
      reporter_email: rawForm.reporter_email,
      reporter_phone: rawForm.reporter_phone,
      report_id: this.isEditMode ? this.initialData?.report_id : undefined,
      status: this.isAdminView
              ? ReportStatusEnum.APPROVED
              : ReportStatusEnum.PENDING,
      date_lost_found:
        formatDateForMySQL(this.reportForm.controls.date_lost_found.value),
      date_reported: formatDateForMySQL(new Date()),
      photoUrls: cleanedPhotoUrls,
      files: this.selectedFiles,
    };

    this.formSubmitted.emit(finalPayload);

    this.selectedFilesPreview.forEach((p: FilePreview) =>
        URL.revokeObjectURL(p.url));
    this.selectedFiles = [];
    this.selectedFilesPreview = [];
  }

  public handleSubmissionError(errorMessage: string): void {
    this.isSubmitting = false;
    this.submissionError = errorMessage;
  }

  onCancel(): void {
    this.reportForm.reset({
      date_lost_found: new Date().toISOString() as any,
    });
    
    this.imageError = false;
    this.photoUrlsFormArray.clear();
    this.selectedFilesPreview.forEach((p: FilePreview) =>
      URL.revokeObjectURL(p.url));
    this.selectedFiles = [];
    this.selectedFilesPreview = [];
    this.formCancelled.emit();
  }
}