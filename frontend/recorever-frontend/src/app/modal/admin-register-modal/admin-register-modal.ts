import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, ValidatorFn, AbstractControl, ValidationErrors, NgForm, FormGroupDirective, FormControl } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { debounceTime, switchMap, of, Observable, merge, catchError, startWith, distinctUntilChanged } from 'rxjs';
import { UserService } from '../../core/services/user-service';
import type { User } from '../../models/user-model';
import { UserManagementService } from '../../core/services/user-management-service';
import { ErrorStateMatcher } from '@angular/material/core';
import { environment } from '../../../environments/environment.prod';

function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;

    const hasNumber = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    const hasCapital = /[A-Z]/.test(value);

    return (hasNumber && hasSpecialChar && hasCapital)
      ? null 
      : { 
          passwordStrength: { 
            hasNumber: !hasNumber, 
            hasSpecialChar: !hasSpecialChar,
            hasCapital: !hasCapital
          } 
        };
  };
}

export class ImmediateErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    // Show error if the control is invalid OR the parent group has a mismatch error
    return !!(control && (control.invalid || form?.hasError('mismatch')) && (control.dirty || control.touched || isSubmitted));
  }
}

@Component({
  selector: 'app-admin-register-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatButtonModule,
  ],
  templateUrl: './admin-register-modal.html',
  styleUrls: ['./admin-register-modal.scss']
})
export class AdminRegisterModal {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AdminRegisterModal>);
  private userManagementService = inject(UserManagementService);
  private userService = inject(UserService);
  public data = inject(MAT_DIALOG_DATA, { optional: true });

  protected selectedUser: User | null = null;
  protected isEditMode = false;

  filteredUsers$!: Observable<User[]>;
  showPassword = false;
  showConfirmPassword = false;
  selectedProfilePicture: string | null = null;
  passwordStrength = signal<'none' | 'weak' | 'medium' | 'strong'>('none');
  isPasswordFocused = signal(false);
  matcher = new ImmediateErrorStateMatcher();

  displayFn(user: User): string {
    return user && user.first_name ? `${user.first_name} ${user.last_name}` : '';
  }

  noEmptyStrings(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value;
      
      // If it's an object (selected user), it's not empty, so it's valid
      if (val && typeof val === 'object') return null;

      // If it's a string, perform the trim check
      const isWhitespace = (val || '').toString().trim().length === 0;
      return !isWhitespace ? null : { 'required': true };
    };
  }

  passwordMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    const passwordControl = group.get('password');
    const confirmControl = group.get('confirmPassword');

    if (!passwordControl || !confirmControl) return null;

    // Ignore validation if controls are disabled
    if (passwordControl.disabled || confirmControl.disabled) {
      return null;
    }

    const password = passwordControl.value;
    const confirm = confirmControl.value;

    if (password !== confirm) {
      confirmControl.setErrors({
        ...(confirmControl.errors || {}),
        mismatch: true
      });

      return { mismatch: true };
    } else {
      const errors = confirmControl.errors;

      if (errors) {
        delete errors['mismatch'];

        confirmControl.setErrors(
          Object.keys(errors).length ? errors : null
        );
      }

      return null;
    }
  };

  onPasswordFocus(): void {
    this.isPasswordFocused.set(true);
  }

  onPasswordBlur(): void {
    this.isPasswordFocused.set(false);
  }

  registerForm: FormGroup = this.fb.group({
    assignedLocation: ['', [Validators.required, this.noEmptyStrings()]],
    name: ['', [Validators.required, this.noEmptyStrings()]],
    email: ['', {
      validators: [
        Validators.required, 
        Validators.email, 
        this.noEmptyStrings()
      ],
      asyncValidators: [this.userService.uniqueValidator('email', '')],
      updateOn: 'change' // Triggers unique check immediately as user types
    }],
    password: ['', [
      Validators.required, 
      Validators.minLength(8), 
      this.noEmptyStrings(),
      strongPasswordValidator() // STRONG PASSWORD RULES
    ]],
    confirmPassword: ['', {
      validators: [Validators.required, this.noEmptyStrings()],
      updateOn: 'change' // Ensures the value is checked on every keystroke
    }]
  }, { validators: this.passwordMatchValidator });

  ngOnInit(): void {
    if (this.data && this.data.admin) {
      this.isEditMode = true;
      this.populateEditForm(this.data.admin);
    }

    this.filteredUsers$ = this.registerForm.controls['name'].valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        // Only search if the input is a string and at least 2 characters
        if (typeof value === 'string' && value.length >= 2) {
          return this.userService.searchUsers(value);
        }
        return of([]);
      })
    );

    // Watch for manual name changes to reset selection and re-enable email
    this.registerForm.controls['name'].valueChanges
      .pipe(distinctUntilChanged())
      .subscribe(value => {
        const selectedFullName = this.selectedUser
          ? `${this.selectedUser.first_name} ${this.selectedUser.last_name}`.trim()
          : null;

        // If user types something different than the selected name, unlock email
        if (typeof value === 'string' && value.trim() !== selectedFullName) {
          this.selectedUser = null;
          
          // Re-enable fields
          this.registerForm.controls['password'].enable();
          this.registerForm.controls['confirmPassword'].enable();

          // Restore validators
          this.registerForm.controls['email'].setValidators([
            Validators.required,
            Validators.email,
            this.noEmptyStrings()
          ]);
          this.registerForm.controls['password'].setValidators([
            Validators.required, 
            Validators.minLength(8), 
            this.noEmptyStrings(),
            strongPasswordValidator()
          ]);
          this.registerForm.controls['confirmPassword'].setValidators([
            Validators.required, 
            this.noEmptyStrings()
          ]);

          this.registerForm.controls['email'].setAsyncValidators([
            this.userService.uniqueValidator('email', '')
          ]);

          this.registerForm.controls['email'].updateValueAndValidity();
          this.registerForm.controls['password'].updateValueAndValidity();
          this.registerForm.controls['confirmPassword'].updateValueAndValidity();
        }
      });

    // Password strength subscription remains the same
    this.registerForm.get('password')?.valueChanges.subscribe(val => {
      this.updatePasswordStrength(val || '');
    });
  }

  private populateEditForm(admin: any): void {
    this.registerForm.patchValue({
      assignedLocation: admin.location,
      name: admin.name,
      email: admin.email
    });

    // Disable password fields for Edit Mode
    this.registerForm.controls['password'].disable();
    this.registerForm.controls['confirmPassword'].disable();

    // Clear validators to allow submission without passwords
    this.registerForm.controls['password'].clearValidators();
    this.registerForm.controls['confirmPassword'].clearValidators();
    
    // Email is usually not editable if linked to a real user account
    this.registerForm.controls['email'].disable(); 
    this.registerForm.controls['email'].clearAsyncValidators();

    this.registerForm.updateValueAndValidity();
  }

  private updatePasswordStrength(value: string): void {
    if (!value) { this.passwordStrength.set('none'); return; }
    let score = 0;
    if (value.length >= 8) score++;
    if (/\d/.test(value)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(value)) score++;
    if (/[a-z]/.test(value)) score++;
    if (/[A-Z]/.test(value)) score++;

    if (score <= 2) this.passwordStrength.set('weak');
    else if (score <= 4) this.passwordStrength.set('medium');
    else this.passwordStrength.set('strong');
  }

    // Update onUserSelected to capture the image
  onUserSelected(event: MatAutocompleteSelectedEvent): void {
    const user = event.option.value as User;
    this.selectedUser = user;
    this.selectedProfilePicture = user.profile_picture || null;

    // Auto-fill both fields
    this.registerForm.patchValue({
      name: `${user.first_name} ${user.last_name}`,
      email: user.email
    });

    this.registerForm.controls['password'].disable();
    this.registerForm.controls['confirmPassword'].disable();

    this.registerForm.controls['password'].clearValidators();
    this.registerForm.controls['confirmPassword'].clearValidators();

    this.registerForm.controls['email'].clearValidators();
    this.registerForm.controls['email'].clearAsyncValidators();

    this.registerForm.controls['password'].updateValueAndValidity();
    this.registerForm.controls['confirmPassword'].updateValueAndValidity();
    this.registerForm.controls['email'].updateValueAndValidity();

    this.registerForm.updateValueAndValidity();
  }

  displayUser(user: User | string): string {
    if (!user) return '';
    if (typeof user === 'string') return user;
    return `${user.first_name} ${user.last_name}`;
  }

  displayEmailFn(user: User | string): string {
    if (!user) return '';
    if (typeof user === 'string') return user;
    return user.email;
  }

  protected getProfileImageUrl(path: string | null): string {
    if (!path) return 'assets/default-avatar.png';
    if (path.startsWith('http')) return path.replace('http://', 'https://');
    
    const secureBaseUrl = environment.apiUrl.replace('http://', 'https://');
    return `${secureBaseUrl}/image/download/${path}`;
  }

  onSubmit() {
    if (this.registerForm.valid) {
      // getRawValue() is critical here to capture the disabled email/name fields
      const formValues = this.registerForm.getRawValue();
      
      const cleanedData = {
        ...formValues,
        // If editing, include the ID; if registering, it remains null
        id: this.isEditMode ? this.data.admin.id : null,
        profilePicture: this.selectedProfilePicture || (this.isEditMode ? this.data.admin.profilePicture : null)
      };

      // Trim all string values in the object
      Object.keys(cleanedData).forEach(key => {
        const val = (cleanedData as any)[key];
        if (typeof val === 'string') {
          (cleanedData as any)[key] = val.trim();
        }
      });

      // Choose the appropriate service method based on the mode
      const request$ = this.isEditMode 
        ? this.userManagementService.updateAdmin(cleanedData) 
        : this.userManagementService.registerAdmin(cleanedData);

      request$.subscribe({
        next: (response) => {
          this.dialogRef.close(response);
        },
        error: (err: any) => {
          console.error(`${this.isEditMode ? 'Update' : 'Registration'} failed:`, err);
        }
      });
    }
  }
}