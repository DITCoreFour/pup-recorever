import { 
  Component, 
  EventEmitter, 
  Input,
  OnInit, 
  Output, 
  inject,
  signal
} from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { take } from 'rxjs/operators';

import { 
  ProgramService, 
  ProgramResponse 
} from '../../../../core/services/program-service';
import { UserService } from '../../../../core/services/user-service';
import { 
  RegisterFormPayload, 
  YearLevel 
} from '../../../../models/user-model';

type PasswordStrength = 'none' | 'weak' | 'medium' | 'strong';

function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;

    const hasNumber = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    return (hasNumber && hasSpecialChar) 
      ? null 
      : { 
          passwordStrength: { 
            hasNumber: !hasNumber, 
            hasSpecialChar: !hasSpecialChar 
          } 
        };
  };
}

function noWhitespaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value;
    if (!val || val.length === 0) {
      return null;
    }
    const isWhitespace = val.trim().length === 0;
    return !isWhitespace 
      ? null 
      : { whitespace: 'Cannot contain only spaces' };
  };
}

function programYearDependencyValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const progId = control.get('programId')?.value;
    const year = control.get('year')?.value;

    const hasProg = progId !== null && progId !== '';
    const hasYear = year !== null && year !== '';

    if ((hasProg && !hasYear) || (!hasProg && hasYear)) {
      return { dependencyError: 'Program and Year must be selected together' };
    }
    
    return null;
  };
}

@Component({
  selector: 'app-register-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgClass
  ],
  templateUrl: './register-form.html',
  styleUrls: ['./register-form.scss'],
})
export class RegisterForm implements OnInit {
  private fb: FormBuilder = inject(FormBuilder);
  private programService: ProgramService = inject(ProgramService);
  private userService: UserService = inject(UserService);

  @Input() public isSubmitting: boolean = false;
  @Input() public errorMessage: string | null = null;
  @Output() public registerSubmit = new EventEmitter<RegisterFormPayload>();

  public registerForm!: FormGroup;
  protected hidePassword = signal(true);
  protected hideConfirmPassword = signal(true);
  protected isPasswordFocused = signal(false);
  protected passwordStrength = signal<PasswordStrength>('none');
  
  protected programs = signal<ProgramResponse[]>([]);
  public readonly years: YearLevel[] = [
    YearLevel.FIRST_YEAR,
    YearLevel.SECOND_YEAR,
    YearLevel.THIRD_YEAR,
    YearLevel.FOURTH_YEAR
  ];

  public ngOnInit(): void {
    this.initForm();
    this.fetchPrograms();

    this.registerForm.controls['password'].valueChanges
      .subscribe(val => {
        this.updatePasswordStrength(val || '');
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

  private initForm(): void {
    this.registerForm = this.fb.group({
      firstName: ['', {
        validators: [Validators.required, noWhitespaceValidator()],
        updateOn: 'change'
      }],
      lastName: ['', {
        validators: [Validators.required, noWhitespaceValidator()],
        updateOn: 'change'
      }],
      programId: [null], 
      year: [null],    
      email: ['', {
        validators: [Validators.required, Validators.email],
        asyncValidators: [this.userService.uniqueValidator('email', '')],
        updateOn: 'change'
      }],
      password: ['', {
        validators: [
          Validators.required, 
          Validators.minLength(8),
          strongPasswordValidator()
        ],
        updateOn: 'change'
      }],
      confirmPassword: ['', {
        validators: [Validators.required],
        updateOn: 'change'
      }]
    }, { 
      validators: [
        this.passwordMatchValidator(),
        programYearDependencyValidator() 
      ] 
    });
  }

  private passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get('password');
      const confirmPass = control.get('confirmPassword');

      if (!password || !confirmPass) return null;
      
      if (password.value !== confirmPass.value) {
        if (!confirmPass.hasError('mismatch')) {
          confirmPass.setErrors(
            { ...confirmPass.errors, mismatch: true }, 
            { emitEvent: false }
          );
        }
        return { mismatch: true };
      }
      
      if (confirmPass.hasError('mismatch')) {
        const errors = { ...confirmPass.errors };
        delete errors['mismatch'];

        confirmPass.setErrors(
          Object.keys(errors).length ? errors : null,
          { emitEvent: false }
        );
      }
      return null;
    };
  }

  private updatePasswordStrength(value: string): void {
    if (!value) {
      this.passwordStrength.set('none');
      return;
    }

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

  public getControl(controlName: string): AbstractControl | null {
    return this.registerForm.get(controlName);
  }

  public submitForm(): void {
    if (!navigator.onLine) {
      this.errorMessage = 'No internet connection. Please check your network.';
      return;
    }

    if (this.registerForm.valid && !this.isSubmitting) {
      this.registerSubmit.emit(
        this.registerForm.getRawValue() as RegisterFormPayload
      );
    } else {
      this.registerForm.markAllAsTouched();
    }
  }

  public togglePasswordVisibility(field: 'password' | 'confirm'): void {
    if (field === 'password') this.hidePassword.update(v => !v);
    if (field === 'confirm') this.hideConfirmPassword.update(v => !v);
  }

  public onPasswordFocus(): void {
    this.isPasswordFocused.set(true);
  }

  public onPasswordBlur(): void {
    this.isPasswordFocused.set(false);
  }

  public getIconSrc(isHidden: boolean): string {
    if (isHidden) {
      return '../../../../../assets/eye-close.png';
    }
    return '../../../../../assets/eye-open.png';
  }
}