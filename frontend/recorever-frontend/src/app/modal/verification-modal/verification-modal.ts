import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../core/services/user-service';
import { ToastService } from '../../core/services/toast-service';
import { 
  MessageResponse, 
  VerificationResponse, 
  ErrorResponse 
} from '../../models/auth-model';

@Component({
  selector: 'app-verification-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verification-modal.html',
  styleUrls: ['./verification-modal.scss']
})
export class VerificationModalComponent implements OnInit, OnDestroy {
  @Input() email: string = '';
  @Output() close = new EventEmitter<void>();

  private userService = inject(UserService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  // State management
  public digits: string[] = ['', '', '', '', ''];
  public timeLeft = signal<number>(60);
  public isLoading = signal<boolean>(false);
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  startTimer(): void {
    this.timeLeft.set(60);
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (this.timeLeft() > 0) {
        this.timeLeft.update(v => v - 1);
      } else {
        this.stopTimer();
      }
    }, 1000);
  }

  stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    let val = input.value;
    
    if (!/^\d*$/.test(val)) {
      val = '';
    }

    this.digits[index] = val;

    if (val && index < 4) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement;
      if (prevInput) prevInput.focus();
    }
  }

  isConfirmDisabled(): boolean {
    return this.digits.filter(d => d !== '').length < 5 || this.isLoading();
  }

  backToRegistration(): void {
    this.isLoading.set(true);
    this.userService.cancelRegistration(this.email).subscribe({
      next: (res: MessageResponse) => {
        this.isLoading.set(false);
        this.toastService.showSuccess(res.message);
        this.close.emit(); // Switches back to registration step
      },
      error: (err: { error: ErrorResponse }) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error.error || 'Could not reset registration.');
      }
    });
  }

  resendCode(): void {
    this.userService.sendNewVerificationCode(0, this.email).subscribe({
      next: (res: MessageResponse) => {
        this.toastService.showSuccess(res.message);
        this.startTimer();
      },
      error: (err: { error: ErrorResponse }) => {
        this.toastService.showError(err.error.error || 'Failed to resend code.');
      }
    });
  }

  confirm(): void {
    const code = this.digits.join('');
    if (code.length !== 5) return;

    this.isLoading.set(true);
    this.userService.verifyUserEmail(code).subscribe({
      next: (res: VerificationResponse) => {
        this.isLoading.set(false);
        this.toastService.showSuccess(res.message || 'Account activated!');
        this.close.emit();
        this.router.navigate(['/login']);
      },
      error: (err: { error: ErrorResponse }) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error.error || 'Invalid verification code.');
      }
    });
  }
}