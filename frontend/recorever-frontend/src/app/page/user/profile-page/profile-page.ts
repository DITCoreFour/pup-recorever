import { 
  Component, 
  OnInit, 
  inject, 
  signal,
  HostListener 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { 
  AbstractControl,
  FormBuilder, 
  FormGroup, 
  ReactiveFormsModule, 
  ValidationErrors,
  ValidatorFn,
  Validators 
} from '@angular/forms';
import { take, catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { AuthService } from '../../../core/auth/auth-service';
import { UserService } from '../../../core/services/user-service';
import { 
  ProgramService, 
  ProgramResponse 
} from '../../../core/services/program-service';
import { User, YearLevel } from '../../../models/user-model';
import { environment } from '../../../../environments/environment';

import { 
  ConfirmationModal 
} from '../../../modal/confirmation-modal/confirmation-modal';

function programYearDependencyValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const progId = control.get('programId')?.value;
    const year = control.get('year')?.value;

    const hasProg = progId !== null && progId !== '';
    const hasYear = year !== null && year !== '';

    if ((hasProg && !hasYear) || (!hasProg && hasYear)) {
      return { dependencyError: 'Program and Year must be selected together' };
    }
    return null;
  };
}

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ConfirmationModal
  ],
  templateUrl: './profile-page.html',
  styleUrls: ['./profile-page.scss']
})
export class ProfilePage implements OnInit {
  private fb: FormBuilder = inject(FormBuilder);
  private authService: AuthService = inject(AuthService);
  private userService: UserService = inject(UserService);
  private programService: ProgramService = inject(ProgramService);

  public currentUser = toSignal<User | null>(
    this.authService.currentUser$.pipe(
      catchError(() => of(null))
    ),
    { initialValue: null }
  );

  public programs = signal<ProgramResponse[]>([]);
  public profileForm!: FormGroup;
  public isSubmitting: boolean = false;
  
  public readonly years: YearLevel[] = [
    YearLevel.FIRST_YEAR,
    YearLevel.SECOND_YEAR,
    YearLevel.THIRD_YEAR,
    YearLevel.FOURTH_YEAR
  ];

  public selectedAvatarFile: File | null = null;
  public avatarPreviewUrl: string | null = null;

  public showSuccessModal = signal<boolean>(false);
  public errorMessage: string | null = null; 

  public isProgramOpen = signal<boolean>(false);
  public isYearOpen = signal<boolean>(false);

  public ngOnInit(): void {
    this.initForm();
    this.fetchPrograms();
    this.patchUserData();
  }

  @HostListener('document:click')
  public closeDropdowns(): void {
    if (this.isProgramOpen()) this.isProgramOpen.set(false);
    if (this.isYearOpen()) this.isYearOpen.set(false);
  }

  private initForm(): void {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', {
        validators: [Validators.required, Validators.email],
        asyncValidators: [this.userService.uniqueValidator('email', '')],
        updateOn: 'change'
      }],
      programId: [null],
      year: [null]
    }, { 
      validators: [programYearDependencyValidator()] 
    });
  }

  private fetchPrograms(): void {
    this.programService.getPrograms()
      .pipe(take(1))
      .subscribe({
        next: (data: ProgramResponse[]): void => {
          this.programs.set(data);
        }
      });
  }

  private patchUserData(): void {
    const user: User | null = this.currentUser();
    if (user) {
      this.profileForm.patchValue({
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        programId: user.program_id || null,
        year: user.year_level || null
      });
    }
  }

  public getControl(controlName: string): AbstractControl | null {
    return this.profileForm.get(controlName);
  }

  public toggleProgram(event: Event): void {
    event.stopPropagation();
    this.isProgramOpen.update((v: boolean) => !v);
    this.isYearOpen.set(false);
  }

  public toggleYear(event: Event): void {
    event.stopPropagation();
    this.isYearOpen.update((v: boolean) => !v);
    this.isProgramOpen.set(false);
  }

  public selectProgram(id: number | null): void {
    this.profileForm.get('programId')?.setValue(id);
    this.profileForm.get('programId')?.markAsTouched();
    this.isProgramOpen.set(false);
  }

  public selectYear(year: YearLevel | null): void {
    this.profileForm.get('year')?.setValue(year);
    this.profileForm.get('year')?.markAsTouched();
    this.isYearOpen.set(false);
  }

  public getSelectedProgramDisplay(): string {
    const id = this.profileForm.get('programId')?.value;
    if (!id) return 'Select Program...';
    const match = this.programs().find(
        (p: ProgramResponse) => p.programId === id
    );
    return match ? match.programCode : 'Select Program...';
  }

  public getSelectedYearDisplay(): string {
    const year = this.profileForm.get('year')?.value;
    return year ? year : 'Select Year...';
  }

  public getProfileImageUrl(path: string | null | undefined): string {
    if (this.avatarPreviewUrl) return this.avatarPreviewUrl;
    if (!path) return 'assets/profile-avatar.png';
    if (path.startsWith('http')) return path.replace('http://', 'https://');
    const secureBaseUrl = environment.apiUrl.replace('http://', 'https://');
    return `${secureBaseUrl}/image/download/${path}`;
  }

  public onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedAvatarFile = input.files[0];
      this.avatarPreviewUrl = URL.createObjectURL(this.selectedAvatarFile);
    }
  }

  public closeSuccessModal(): void {
    this.showSuccessModal.set(false);
  }

  public onSaveChanges(): void {
    if (!navigator.onLine) {
      this.errorMessage = 'No internet connection. Please check your network.';
      return;
    }

    if (this.profileForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.errorMessage = null;

      const currentUserData: User | null = this.currentUser();
      if (!currentUserData) {
        this.isSubmitting = false;
        this.errorMessage = 'Error: User data not found.';
        return;
      }

      const updatedUser: User = {
        ...currentUserData,
        first_name: this.profileForm.get('firstName')?.value.trim(),
        last_name: this.profileForm.get('lastName')?.value.trim(),
        email: this.profileForm.get('email')?.value.trim(),
        program_id: this.profileForm.get('programId')?.value,
        year_level: this.profileForm.get('year')?.value
      };

      this.userService.updateProfile(updatedUser, this.selectedAvatarFile)
        .pipe(finalize((): void => { this.isSubmitting = false; }))
        .subscribe({
          next: (savedUser: User): void => {
            this.showSuccessModal.set(true);
            this.profileForm.patchValue({
              firstName: savedUser.first_name,
              lastName: savedUser.last_name,
              email: savedUser.email,
              programId: savedUser.program_id || null,
              year: savedUser.year_level || null
            });
            this.selectedAvatarFile = null;
          },
          error: (err: HttpErrorResponse | unknown): void => {
            if (err instanceof HttpErrorResponse && err.status === 0) {
              this.errorMessage = 'Server unreachable. Please try again later.';
            } else {
              this.errorMessage = 'Failed to update. Email may be taken.';
            }
          }
        });
    } else {
      this.profileForm.markAllAsTouched();
    }
  }
}