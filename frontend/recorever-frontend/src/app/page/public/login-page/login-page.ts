import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

import { LoginForm } from './login-form/login-form';
import { LoginRequest } from '../../../models/auth-model';
import { User } from '../../../models/user-model';
import { AuthService } from '../../../core/auth/auth-service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    LoginForm,
    RouterLink 
  ],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss'
})
export class LoginPage {
  private authService: AuthService = inject(AuthService);
  private router: Router = inject(Router);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

  public isLoading: boolean = false;
  public loginErrorMessage: string | null = null;

  public onLogin(credentials: LoginRequest): void {
    this.isLoading = true;
    this.loginErrorMessage = null;

    this.authService.login(credentials)
      .pipe(
        finalize((): void => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (user: User): void => {
          if (user.role === 'superadmin') {
            this.router.navigate(['/superadmin/dashboard']);
          } else if (user.role === 'admin') {
            this.router.navigate(['/admin/dashboard']);
          } else {
            this.router.navigate(['/app/browse']);
          }
        },
        error: (err: HttpErrorResponse): void => {
          this.loginErrorMessage = this.extractErrorMessage(err);
          this.cdr.detectChanges();
        },
      });
  }

  public onClearError(): void {
    this.loginErrorMessage = null;
  }

  private extractErrorMessage(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'Network error. Please check your internet connection.';
    }
    return 'Invalid email or password. Please try again.';
  }
}