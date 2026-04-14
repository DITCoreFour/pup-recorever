import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { RegisterForm } from './register-form/register-form';
import { AuthService } from '../../../core/auth/auth-service';
import { ToastService } from '../../../core/services/toast-service';
import { RegisterRequest } from '../../../models/auth-model';
import { RegisterFormPayload } from '../../../models/user-model';
import { VerificationModalComponent } from '../../../modal/verification-modal/verification-modal';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [
    CommonModule,
    RegisterForm,
    RouterLink,
    VerificationModalComponent
  ],
  templateUrl: './register-page.html',
  styleUrls: ['./register-page.scss']
})
export class RegisterPage {
  private authService: AuthService = inject(AuthService);
  private router: Router = inject(Router);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private toastService: ToastService = inject(ToastService);

  public isLoading: boolean = false;
  public serverErrorMessage: string | null = null;
  
  // State management for the form panels
  public currentStep: 'register' | 'verify' = 'register';
  public registeredEmail: string = '';

  public onRegister(payload: RegisterFormPayload): void {
    this.isLoading = true;
    this.serverErrorMessage = null;

    const rawPayload: RegisterRequest = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      password: payload.password,
      programId: payload.programId || null, 
      year: payload.year || null
    };

    this.authService.register(rawPayload)
      .pipe(
        finalize((): void => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (): void => {
          this.toastService.showSuccess('Registration successful!');
          this.registeredEmail = payload.email;
          this.currentStep = 'verify'; // Switch to verification panel
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse): void => {
          this.serverErrorMessage = this.extractErrorMessage(err);
          console.error('Registration error:', err);
          this.cdr.detectChanges();
        }
      });
  }

  private extractErrorMessage(err: HttpErrorResponse): string {
    if (err.error && typeof err.error.error === 'string') {
      return err.error.error;
    }
    
    if (err.error && Array.isArray(err.error.errors)) {
      const messages = err.error.errors
        .map((e: { defaultMessage: string }) => e.defaultMessage)
        .filter((msg: string) => msg);
        
      if (messages.length > 0) {
        return messages.join(' • ');
      }
    }
    
    return 'Registration failed. Please check your data.';
  }
}