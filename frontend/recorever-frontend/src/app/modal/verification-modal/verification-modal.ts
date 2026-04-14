import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../core/services/user-service';
import { ToastService } from '../../core/services/toast-service';

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

  // Using an array to track digits
  public digits = ['', '', '', '', ''];
  public timeLeft = signal(60);
  private timerInterval: any;

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
    if (this.timerInterval) clearInterval(this.timerInterval);
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

  isConfirmDisabled(): boolean {
    return this.digits.filter(d => d !== '').length < 5;
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement;
      if (prevInput) prevInput.focus();
    }
  }

  resendCode(): void {
    this.userService.sendNewVerificationCode(0, this.email).subscribe({
      next: () => {
        this.toastService.showSuccess('New code sent!');
        this.startTimer();
      },
      error: (err) => this.toastService.showError(err.error?.error || 'Failed to resend.')
    });
  }

  confirm(): void {
    const code = this.digits.join('');
    if (code.length !== 5) return;

    this.userService.verifyUserEmail(code).subscribe({
      next: () => {
        this.toastService.showSuccess('Account activated!');
        this.close.emit();
        this.router.navigate(['/login']);
      },
      error: (err) => this.toastService.showError(err.error?.error || 'Invalid code.')
    });
  }
}