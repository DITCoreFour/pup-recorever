import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  FormBuilder, 
  FormGroup, 
  ReactiveFormsModule, 
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
import { User } from '../../../models/user-model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
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
  public updateMessage: string | null = null; 

  public selectedAvatarFile: File | null = null;
  public avatarPreviewUrl: string | null = null;

  public ngOnInit(): void {
    this.initForm();
    this.fetchPrograms();
    this.patchUserData();
  }

  private initForm(): void {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  private fetchPrograms(): void {
    this.programService.getPrograms()
      .pipe(take(1))
      .subscribe({
        next: (data: ProgramResponse[]): void => {
          this.programs.set(data);
        },
        error: (err: unknown): void => {
          console.error('Failed to load programs', err);
        }
      });
  }

  private patchUserData(): void {
    const user: User | null = this.currentUser();
    if (user) {
      this.profileForm.patchValue({
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email
      });
    }
  }

  public getProgramCode(programId: number | null | undefined): string {
    if (!programId) return 'N/A';
    const match = this.programs().find(p => p.programId === programId);
    return match ? match.programCode : 'Unknown Program';
  }

  public getProfileImageUrl(path: string | null | undefined): string {
    if (this.avatarPreviewUrl) {
      return this.avatarPreviewUrl;
    }
    if (!path) {
      return 'assets/profile-avatar.png';
    }
    if (path.startsWith('http')) {
      return path.replace('http://', 'https://');
    }
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

  public onSaveChanges(): void {
    if (this.profileForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.updateMessage = null;

      const currentUserData: User | null = this.currentUser();
      
      if (!currentUserData) {
        this.isSubmitting = false;
        this.updateMessage = 'Error: User data not found.';
        return;
      }

      const first = this.profileForm.get('firstName')?.value.trim();
      const last = this.profileForm.get('lastName')?.value.trim();
      const email = this.profileForm.get('email')?.value.trim();

      const updatedUser: User = {
        ...currentUserData,
        first_name: first,
        last_name: last,
        email: email
      };

      this.userService.updateProfile(updatedUser, this.selectedAvatarFile)
        .pipe(
          finalize((): void => {
            this.isSubmitting = false;
          })
        )
        .subscribe({
          next: (savedUser: User): void => {
            this.updateMessage = 'Profile updated successfully!';
            this.profileForm.patchValue({
              firstName: savedUser.first_name,
              lastName: savedUser.last_name,
              email: savedUser.email
            });
            this.selectedAvatarFile = null;
            
          },
          error: (err: unknown): void => {
            console.error('Update failed', err);
            this.updateMessage = 'Failed to update. Email may be taken.';
          }
        });
    } else {
      this.profileForm.markAllAsTouched();
    }
  }
}