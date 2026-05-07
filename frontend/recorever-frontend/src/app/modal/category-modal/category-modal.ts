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
  AbstractControl
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button'; 

type MasterDataItem = {
  id: number;
  name: string;
};

type UpdatePayload = {
  id: number;
  name: string;
};

@Component({
  selector: 'app-category-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule
],
  templateUrl: './category-modal.html',
  styleUrl: './category-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryModal implements OnInit, OnChanges {

  @Input() editItem: MasterDataItem | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<string>();
  @Output() update = new EventEmitter<UpdatePayload>();

  public categoryForm!: FormGroup;

  private readonly editItemSignal = signal<MasterDataItem | null>(null);

  public isEditMode = computed((): boolean => this.editItemSignal() !== null);

  public get nameControl(): AbstractControl {
    return this.categoryForm.get('name')!;
  }

  constructor(private readonly fb: FormBuilder) {}

  public ngOnInit(): void {
    this.categoryForm = this.fb.group({
      name: [this.editItem?.name ?? '', {
        validators: [Validators.required],
        updateOn: 'change'
      }]
    });

    this.editItemSignal.set(this.editItem);
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['editItem'] && this.categoryForm) {
      this.editItemSignal.set(changes['editItem'].currentValue);
      this.categoryForm.reset({
        name: changes['editItem'].currentValue?.name ?? ''
      });
    }
  }

  public onSave(): void {
    this.categoryForm.markAllAsTouched();
    if (this.categoryForm.invalid) return;

    const trimmed = (this.nameControl.value as string).trim();
    if (!trimmed) return;

    const current = this.editItemSignal();

    if (current) {
      this.update.emit({ id: current.id, name: trimmed });
    } else {
      this.save.emit(trimmed);
    }

    this.categoryForm.reset();
  }

  public onClose(): void {
    this.categoryForm.reset();
    this.close.emit();
  }

  public onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.onClose();
    }
  }
}