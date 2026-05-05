import {
  Component,
  signal,
  computed,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CategoryModal } from '../../../modal/category-modal/category-modal';

type MasterDataItem = {
  id: number;
  name: string;
};

type UpdatePayload = {
  id: number;
  name: string;
};

@Component({
  selector: 'app-master-data-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    CategoryModal
  ],
  templateUrl: './master-data-page.html',
  styleUrl: './master-data-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MasterDataPage implements OnInit, OnDestroy {

  private readonly destroy$ = new Subject<void>();
  private nextId = 100;

  private readonly items = signal<MasterDataItem[]>([
    { id: 1, name: 'Electronics' },
    { id: 2, name: 'Documents' },
    { id: 3, name: 'Clothing' },
    { id: 4, name: 'Accessories' },
    { id: 5, name: 'Books' },
    { id: 6, name: 'Tumblers' },
    { id: 7, name: 'Others' }
  ]);

  public showModal = signal(false);
  public selectedItem = signal<MasterDataItem | null>(null);

  public searchForm!: FormGroup;

  public filteredItems = computed((): MasterDataItem[] => {
    const q = (this.searchForm?.get('query')?.value ?? '').toLowerCase().trim();
    if (!q) return this.items();
    return this.items().filter((item: MasterDataItem) =>
      item.name.toLowerCase().includes(q)
    );
  });

  constructor(private readonly fb: FormBuilder) {}

  public ngOnInit(): void {
    this.searchForm = this.fb.group({
      query: ['']
    });

    this.searchForm.get('query')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((): void => {
        this.items.update((v: MasterDataItem[]) => [...v]);
      });
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public openAddModal(): void {
    this.selectedItem.set(null);
    this.showModal.set(true);
  }

  public openEditModal(item: MasterDataItem): void {
    this.selectedItem.set(item);
    this.showModal.set(true);
  }

  public closeModal(): void {
    this.selectedItem.set(null);
    this.showModal.set(false);
  }

  public onSaveCategory(name: string): void {
    const newItem: MasterDataItem = { id: ++this.nextId, name };
    this.items.update((current: MasterDataItem[]) => [...current, newItem]);
    this.closeModal();
  }

  public onUpdateCategory(payload: UpdatePayload): void {
    this.items.update((current: MasterDataItem[]) =>
      current.map((item: MasterDataItem) =>
        item.id === payload.id ? { ...item, name: payload.name } : item
      )
    );
    this.closeModal();
  }

  public deleteItem(id: number): void {
    this.items.update((current: MasterDataItem[]) =>
      current.filter((item: MasterDataItem) => item.id !== id)
    );
  }
}