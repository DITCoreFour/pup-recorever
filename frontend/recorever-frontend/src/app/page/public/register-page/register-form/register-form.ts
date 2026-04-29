import { 
  Component, 
  EventEmitter, 
  Input,
  OnInit, 
  Output, 
  inject,
  signal,
  HostListener
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
    if (!val || val.length === 0) return null;
    
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
  @Input() public showVerification: boolean = false;
  
  @Output() public registerSubmit = new EventEmitter<RegisterFormPayload>();
  @Output() public verifySubmit = new EventEmitter<string>();
  @Output() public resendCode = new EventEmitter<void>();

  public registerForm!: FormGroup;
  public verificationForm!: FormGroup;
  
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

  public isProgramOpen = signal<boolean>(false);
  public isYearOpen = signal<boolean>(false);

  public ngOnInit(): void {
    this.initForms();
    this.fetchPrograms();

    this.registerForm.controls['password'].valueChanges
      .subscribe((val: string) => {
        this.updatePasswordStrength(val || '');
      });
  }

  @HostListener('document:click')
  public closeDropdowns(): void {
    if (this.isProgramOpen()) this.isProgramOpen.set(false);
    if (this.isYearOpen()) this.isYearOpen.set(false);
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

  private initForms(): void {
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

  public getControl(
      form: 'register' | 'verify', 
      name: string
  ): AbstractControl | null {
    return form === 'register'
        ? this.registerForm.get(name)
        : this.verificationForm.get(name);
  }

  public toggleProgram(event: Event): void {
    event.stopPropagation();
    this.isProgramOpen.update((v: boolean) => !v);
    this.isYearOpen.set(false);
  }

  public toggleYear(event: Event): void {
    event.stopPropagation();
    this.isYearOpen.update((v: boolean) => !v);
    this.isProgramOpen.set(false);
  }

  public selectProgram(id: number | null): void {
    this.registerForm.get('programId')?.setValue(id);
    this.registerForm.get('programId')?.markAsTouched();
    this.isProgramOpen.set(false);
  }

  public selectYear(year: YearLevel | null): void {
    this.registerForm.get('year')?.setValue(year);
    this.registerForm.get('year')?.markAsTouched();
    this.isYearOpen.set(false);
  }

  public getSelectedProgramDisplay(): string {
    const id = this.registerForm.get('programId')?.value;
    if (!id) return 'Select Program...';
    const match = this.programs().find(
        (p: ProgramResponse) => p.programId === id
    );
    return match ? match.programCode : 'Select Program...';
  }

  public getSelectedYearDisplay(): string {
    const year = this.registerForm.get('year')?.value;
    return year ? year : 'Select Year...';
  }

  public submitRegister(): void {
    if (!navigator.onLine) {
      this.errorMessage = 
          'No internet connection. Please check your network.';
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

  public submitVerification(): void {
    if (this.verificationForm.valid && !this.isSubmitting) {
      this.verifySubmit.emit(this.verificationForm.get('code')?.value);
    } else {
      this.verificationForm.markAllAsTouched();
    }
  }

  public togglePasswordVisibility(field: 'password' | 'confirm'): void {
    if (field === 'password') this.hidePassword.update((v: boolean) => !v);
    if (field === 'confirm') this.hideConfirmPassword.update((v: boolean) => !v);
  }

  public onPasswordFocus(): void {
    this.isPasswordFocused.set(true);
  }

  public onPasswordBlur(): void {
    this.isPasswordFocused.set(false);
  }

  public getIconSrc(isHidden: boolean): string {
    return isHidden
      ? '../../../../../assets/eye-close.png'
      : '../../../../../assets/eye-open.png';
  }
}