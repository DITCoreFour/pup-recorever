import {
  Component,
  signal,
  computed,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subject, BehaviorSubject, of } from 'rxjs';
import { takeUntil, switchMap, tap, catchError, finalize } from 'rxjs/operators';
import { CategoryModal } from '../../../modal/category-modal/category-modal';
import { ConfirmationModal } from '../../../modal/confirmation-modal/confirmation-modal';
import { CategoryService, CategoryModel, CategoryPayload } from '../../../core/services/category-service';
import { ToastService } from '../../../core/services/toast-service';

export type MasterDataItem = {
  id: number;
  name: string;
};

export type UpdatePayload = {
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
    CategoryModal,
    ConfirmationModal
  ],
  templateUrl: './master-data-page.html',
  styleUrl: './master-data-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MasterDataPage implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly refreshTrigger$ = new BehaviorSubject<void>(undefined);
  
  private readonly fb = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly toastService = inject(ToastService);

  public isLoading = signal(false); 
  public showModal = signal(false);
  public showDeleteConfirmModal = signal(false);

  public selectedItem = signal<MasterDataItem | null>(null);
  public itemToDelete = signal<MasterDataItem | null>(null);
  
  public deleteConfirmMessage = computed((): string => {
    const item = this.itemToDelete();
    return item ? `Are you sure you want to delete the category '${item.name}'?`
        : 'Are you sure you want to delete this category?';
  });
  
  private readonly items = signal<MasterDataItem[]>([]);
  public searchForm!: FormGroup;

  public filteredItems = computed((): MasterDataItem[] => {
    const q = (this.searchForm?.get('query')?.value ?? '').toLowerCase().trim();
    
    if (!q) {
      return this.items();
    }

    return this.items().filter((item: MasterDataItem) =>
      item.name.toLowerCase().includes(q)
    );
  });

  public ngOnInit(): void {

    this.searchForm = this.fb.group({
      query: ['', { updateOn: 'change' }] 
    });

    this.searchForm.get('query')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((): void => {
        this.items.update((v: MasterDataItem[]) => [...v]);
      });

    this.refreshTrigger$.pipe(
      tap((): void => this.isLoading.set(true)),
      switchMap(() => {
        return this.categoryService.getCategories().pipe(
          catchError(() => {
            this.toastService.showError('Failed to load categories');
            return of([]);
          }),
          finalize((): void => this.isLoading.set(false))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe((categories: CategoryModel[]): void => {
       const mappedItems: MasterDataItem[] =
         categories.map((cat: CategoryModel) => ({
         id: cat.category_id,
         name: cat.category_name
       }));
       this.items.set(mappedItems);
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
    const payload: CategoryPayload = { category_name: name };
    
    this.categoryService.createCategory(payload).subscribe({
      next: (): void => {
        this.toastService.showSuccess('Category created successfully');
        this.closeModal();
        this.refreshTrigger$.next();
      },
      error: (): void => {
        this.toastService.showError('Failed to create category');
      }
    });
  }

  public onUpdateCategory(payload: UpdatePayload): void {
    const updateData: CategoryPayload = { category_name: payload.name };
    
    this.categoryService.updateCategory(payload.id, updateData).subscribe({
      next: (): void => {
        this.toastService.showSuccess('Category updated successfully');
        this.closeModal();
        this.refreshTrigger$.next();
      },
      error: (): void => {
        this.toastService.showError('Failed to update category');
      }
    });
  }

  public confirmDelete(item: MasterDataItem): void {
    this.itemToDelete.set(item);
    this.showDeleteConfirmModal.set(true);
  }

  public proceedWithDeletion(): void {
    const item = this.itemToDelete();
    if (!item) return;

    this.categoryService.deleteCategory(item.id).subscribe({
      next: (): void => {
        this.toastService.showSuccess('Category deleted successfully');
        this.showDeleteConfirmModal.set(false);
        this.itemToDelete.set(null);
        this.refreshTrigger$.next();
      },
      error: (): void => {
        this.toastService.showError('Failed to delete category');
        this.showDeleteConfirmModal.set(false);
        this.itemToDelete.set(null);
      }
    });
  }

  public cancelDelete(): void {
    this.showDeleteConfirmModal.set(false);
    this.itemToDelete.set(null);
  }
}