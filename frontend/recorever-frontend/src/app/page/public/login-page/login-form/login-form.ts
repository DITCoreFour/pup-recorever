import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LoginRequest } from '../../../../models/auth-model';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './login-form.html',
  styleUrls: ['./login-form.scss'],
})
export class LoginForm implements OnInit {
  private fb = inject(FormBuilder);

  @Input() public loginError = false;
  @Input() public isSubmitting = false;
  @Output() public loginSubmit = new EventEmitter<LoginRequest>();
  @Output() public clearError = new EventEmitter<void>();

  public isPasswordVisible = false;

  public loginForm = this.fb.group({
    email: ['', {
      validators: [Validators.required, Validators.email],
      updateOn: 'change'
    }],
    password: ['', {
      validators: [Validators.required],
      updateOn: 'change'
    }],
  });

  public ngOnInit(): void {
    this.loginForm.valueChanges.subscribe(() => {
      if (this.loginError) {
        this.clearError.emit();
      }
    });
  }

  public get emailControl() {
    return this.loginForm.get('email');
  }

  public get passwordControl() {
    return this.loginForm.get('password');
  }

  public submitForm(): void {
    if (this.loginForm.valid) {
      this.loginSubmit.emit(
        this.loginForm.getRawValue() as LoginRequest
      );
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  public togglePasswordVisibility(): void {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  public getPasswordInputType(): string {
    if (this.isPasswordVisible) {
      return 'text';
    }
    return 'password';
  }

  public getToggleIconSrc(): string {
    if (this.isPasswordVisible) {
      return '../../../../../assets/eye-open.png';
    }
    return '../../../../../assets/eye-close.png';
  }
}