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
import { MessageResponse, ErrorResponse } from '../../models/auth-model';

@Component({
  selector: 'app-verification-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verification-modal.html',
  styleUrls: ['./verification-modal.scss']
})
export class VerificationModalComponent implements OnInit, OnDestroy {
  @Input() public email: string = '';
  @Input() public password: string = '';
  @Input() public context: 'register' | 'forgot-password' = 'register';
  
  @Output() public close = new EventEmitter<void>();

  // QA FIX: Angular way of querying DOM elements (No Vanilla JS)
  @ViewChildren('otpInput') 
  public otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  private userService = inject(UserService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  public digits: string[] = ['', '', '', '', ''];
  public timeLeft = signal<number>(60);
  public isLoading = signal<boolean>(false);
  
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

    if (!navigator.onLine) {
      this.serverErrorMessage.set('No internet connection.');
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
    if (!navigator.onLine) {
      this.serverErrorMessage.set('No internet connection to resend code.');
      return;
    }

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
    if (!navigator.onLine) {
      this.serverErrorMessage.set('No internet connection. Cannot verify.');
      return;
    }

    const code = this.digits.join('');
    if (code.length !== 5) return;

    this.isLoading.set(true);
    this.serverErrorMessage.set(null);
    
    this.userService.verifyUserEmail(code).pipe(
      switchMap((): Observable<unknown> => {
        if (this.context === 'forgot-password') {
          return of('forgot-password-success');
        }
        return this.authService.login({
          email: this.email,
          password: this.password
        });
      })
    ).subscribe({
      next: (res: unknown): void => {
        this.isLoading.set(false);
        if (res === 'forgot-password-success') {
          this.toastService.showSuccess('Email verified successfully!');
          this.close.emit();
          this.router.navigate(['/reset-password'], { 
              queryParams: { email: this.email } 
          });
        } else {
          this.toastService.showSuccess('Account activated!');
          this.close.emit();
          this.router.navigate(['/app/browse']);
        }
      },
      error: (err: HttpErrorResponse): void => {
        this.extractError(err, 'Verification failed. Invalid code.');
      }
    });
  }
}