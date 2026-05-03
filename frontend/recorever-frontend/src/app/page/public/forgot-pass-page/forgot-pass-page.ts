import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
  AbstractControl
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../../core/auth/auth-service';
import { ToastService } from '../../../core/services/toast-service';
import { 
  VerificationModalComponent 
} from '../../../modal/verification-modal/verification-modal';

@Component({
  selector: 'app-forgot-pass-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    VerificationModalComponent
  ],
  templateUrl: './forgot-pass-page.html',
  styleUrls: ['./forgot-pass-page.scss']
})
export class ForgotPassPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  public forgotPasswordForm: FormGroup;
  
  public isLoading = false;
  public submittedEmail = '';
  
  public serverErrorMessage: string | null = null;
  public currentStep: 'email' | 'verify' = 'email';

  constructor() {
    this.forgotPasswordForm = this.fb.group({
      email: ['', {
        validators: [Validators.required, Validators.email],
        updateOn: 'change'
      }]
    });
  }

  public get emailControl(): AbstractControl | null {
    return this.forgotPasswordForm.get('email');
  }

  public onSubmit(): void {

    if (this.forgotPasswordForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.serverErrorMessage = null;
      const email = this.emailControl?.value.trim();

      this.authService.forgotPassword(email)
        .pipe(
          finalize((): void => {
            this.isLoading = false;
            this.cdr.detectChanges();
          })
        )
        .subscribe({
          next: (): void => {
            this.submittedEmail = email;
            this.currentStep = 'verify';
            this.toastService.showSuccess(
                'Verification code sent to your email.'
            );
          },
          error: (err: HttpErrorResponse): void => {
            if (err.status === 0) { this.serverErrorMessage = 
               'Server unreachable or no internet connection. Try again later.';
            } else if (err.status === 500) {
              this.serverErrorMessage = 
                  'Email service is currently unavailable. ' + 
                  'Please contact support or try again later.';
            } else if (err.status === 404) {
              this.serverErrorMessage = 
                  'Account not found. Please check the email address.';
            } else {
              const errorData = err.error as { error: string }; 
              this.serverErrorMessage = errorData?.error || 'Request failed.';
            }
          }
        });
    } else {
      this.forgotPasswordForm.markAllAsTouched();
    }
  }

  public resetToEmailStep(): void {
    this.currentStep = 'email';
    this.serverErrorMessage = null;
    this.forgotPasswordForm.reset();
  }
}