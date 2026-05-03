import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  OnInit, 
  OnDestroy, 
  inject, 
  signal, 
  ViewChildren, 
  QueryList, 
  ElementRef 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

import { UserService } from '../../core/services/user-service';
import { ToastService } from '../../core/services/toast-service';
import { AuthService } from '../../core/auth/auth-service';
import {
  MessageResponse,
  ErrorResponse,
  AuthActionResponse
} from '../../models/auth-model';
import { User } from '../../models/user-model';
@Component({
  selector: 'app-verification-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verification-modal.html',
  styleUrls: ['./verification-modal.scss']
})
export class VerificationModalComponent implements OnInit, OnDestroy {
  @Input() public email = '';
  @Input() public password = '';
  @Input() public context: 'register' | 'forgot-password' = 'register';
  
  @Output() public close = new EventEmitter<void>();

  @ViewChildren('otpInput') 
  public otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  private userService = inject(UserService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  public digits: string[] = ['', '', '', '', ''];
  
  public timeLeft = signal(60);
  public isLoading = signal(false);
  
  public serverErrorMessage = signal<string | null>(null);
  
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  public ngOnInit(): void {
    this.startTimer();
  }

  public ngOnDestroy(): void {
    this.stopTimer();
  }

  public startTimer(): void {
    this.timeLeft.set(60);
    this.stopTimer();
    this.timerInterval = setInterval((): void => {
      if (this.timeLeft() > 0) {
        this.timeLeft.update((v: number) => v - 1);
      } else {
        this.stopTimer();
      }
    }, 1000);
  }

  public stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  public onInput(event: Event, index: number): void {
    this.serverErrorMessage.set(null); 
    
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/\D/g, '');

    this.digits[index] = val;
    input.value = val;

    if (val && index < 4) {
      const inputsArray = this.otpInputs.toArray();
      if (inputsArray[index + 1]) {
        inputsArray[index + 1].nativeElement.focus();
      }
    }
  }

  public onKeyDown(event: KeyboardEvent, index: number): void {
    this.serverErrorMessage.set(null);
    
    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      const inputsArray = this.otpInputs.toArray();
      if (inputsArray[index - 1]) {
        inputsArray[index - 1].nativeElement.focus();
      }
    }
  }

  public isConfirmDisabled(): boolean {
    return this.digits.filter((d: string) => d !== '').length < 5 || 
           this.isLoading();
  }

  private extractError(err: HttpErrorResponse, defaultMsg: string): void {
    this.isLoading.set(false);
    if (err.status === 0) {
      this.serverErrorMessage.set('Network error. Check your connection.');
    } else if (err.status === 500) {
      this.serverErrorMessage.set('Service unavailable. Try again later.');
    } else {
      const errorData = err.error as ErrorResponse;
      this.serverErrorMessage.set(errorData?.error || defaultMsg);
    }
  }

  public backToRegistration(): void {
    if (this.context === 'forgot-password') {
      this.close.emit();
      return;
    }

    this.isLoading.set(true);
    this.userService.cancelRegistration(this.email).subscribe({
      next: (res: MessageResponse): void => {
        this.isLoading.set(false);
        this.toastService.showSuccess(res.message);
        this.close.emit(); 
      },
      error: (err: HttpErrorResponse): void => {
        this.extractError(err, 'Could not reset registration.');
      }
    });
  }

  public resendCode(): void {
    this.serverErrorMessage.set(null);
    this.isLoading.set(true);

    if (this.context === 'forgot-password') {
      this.authService.forgotPassword(this.email).subscribe({
        next: (): void => {
          this.isLoading.set(false);
          this.toastService.showSuccess('New verification code sent.');
          this.startTimer();
          this.digits = ['', '', '', '', '']; 
        },
        error: (err: HttpErrorResponse): void => {
          this.extractError(err, 'Failed to resend code.');
        }
      });
    } else {
      this.userService.sendNewVerificationCode(0, this.email).subscribe({
        next: (res: MessageResponse): void => {
          this.isLoading.set(false);
          this.toastService.showSuccess(res.message);
          this.startTimer();
          this.digits = ['', '', '', '', '']; 
        },
        error: (err: HttpErrorResponse): void => {
          this.extractError(err, 'Failed to resend code.');
        }
      });
    }
  }

public confirm(): void {
    const code = this.digits.join('');
    if (code.length !== 5) return;

    this.isLoading.set(true);
    this.serverErrorMessage.set(null);

    const verificationRequest$:
      Observable<AuthActionResponse | MessageResponse> = 
      this.context === 'forgot-password'
        ? this.authService.verifyResetCode(code)
        : this.userService.verifyUserEmail(code);

    verificationRequest$.pipe(
      switchMap((): Observable<string | User | null> => {
        if (this.context === 'forgot-password') {
          return of('forgot-password-success');
        }
        return this.authService.login({
          email: this.email,
          password: this.password
        });
      })
    ).subscribe({
      next: (res: string | User | null): void => {
        this.isLoading.set(false);
        this.close.emit(); 

        if (res === 'forgot-password-success') {
          this.toastService
            .showSuccess('Email verified! Proceed to change password.');
          this.router.navigate(['/reset-password'], { 
            queryParams: { 
              email: this.email,
              token: code 
            } 
          });
        } else if (res && typeof res !== 'string') {
          this.toastService.showSuccess('Account activated!');
          this.router.navigate(['/app/browse']);
        }
      },
      error: (err: HttpErrorResponse): void => {
        this.extractError(err, 'Verification failed. Please check the code.');
      }
    });
  }
}