import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  signal,
  computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidatorFn,
  ValidationErrors
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { 
  MasterDataItem, 
  SavePayload, 
  UpdatePayload 
} from '../../models/master-data-model';

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

@Component({
  selector: 'app-master-data-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './master-data-modal.html',
  styleUrl: './master-data-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MasterDataModal implements OnInit, OnChanges {
  @Input() public editItem: MasterDataItem | null = null;
  @Input() public context: 'category' | 'program' = 'category';

  @Output() public close = new EventEmitter<void>();
  @Output() public save = new EventEmitter<SavePayload>();
  @Output() public update = new EventEmitter<UpdatePayload>();

  public dataForm!: FormGroup;

  private readonly editItemSignal = signal<MasterDataItem | null>(null);

  public isEditMode = computed((): boolean => this.editItemSignal() !== null);

  constructor(private readonly fb: FormBuilder) {}

  public ngOnInit(): void {
    this.initForm();
    this.editItemSignal.set(this.editItem);
    this.patchForm();
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['editItem'] && this.dataForm) {
      this.editItemSignal.set(changes['editItem'].currentValue);
      this.patchForm();
    }
  }

  private initForm(): void {
    const isProgram = this.context === 'program';
    
    this.dataForm = this.fb.group({
      name: ['', {
        validators: [Validators.required, noWhitespaceValidator()],
        updateOn: 'change'
      }],
      code: ['', {
        validators: isProgram 
            ? [Validators.required, noWhitespaceValidator()] 
            : [],
        updateOn: 'change'
      }]
    });
  }

  private patchForm(): void {
    const current = this.editItemSignal();
    this.dataForm.patchValue({
      name: current?.name ?? '',
      code: current?.code ?? ''
    });
  }

  public getControl(name: string): AbstractControl {
    return this.dataForm.get(name)!;
  }

  public onSave(): void {
    this.dataForm.markAllAsTouched(); 
    
    if (this.dataForm.invalid) {
      return; 
    }

    const nameVal = (this.getControl('name').value as string).trim();
    const codeVal = (this.getControl('code').value as string)?.trim();

    const current = this.editItemSignal();
    
    const payload: SavePayload = this.context === 'program'
        ? { name: nameVal, code: codeVal }
        : { name: nameVal };

    if (current) {
      this.update.emit({ id: current.id, ...payload });
    } else {
      this.save.emit(payload);
    }

    this.dataForm.reset();
  }

  public onClose(): void {
    this.dataForm.reset();
    this.close.emit();
  }

  public onOverlayClick(): void {
    this.onClose();
  }
}