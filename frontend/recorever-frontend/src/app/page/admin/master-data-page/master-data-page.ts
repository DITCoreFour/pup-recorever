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
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, BehaviorSubject, of, Observable } from 'rxjs';
import { 
  takeUntil, switchMap, tap, catchError, finalize, map 
} from 'rxjs/operators';

import { 
  ConfirmationModal 
} from '../../../modal/confirmation-modal/confirmation-modal';
import { 
  MasterDataModal, 
  SavePayload, 
  UpdatePayload 
} from '../../../modal/master-data-modal/master-data-modal';

import { 
  CategoryService, 
  CategoryModel
} from '../../../core/services/category-service';
import { 
  ProgramService, 
  ProgramResponse 
} from '../../../core/services/program-service';
import { ToastService } from '../../../core/services/toast-service';

export type MasterDataTab = 'categories' | 'programs';

export type MasterDataItem = {
  id: number;
  name: string;
  code?: string; 
};

@Component({
  selector: 'app-master-data-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MasterDataModal,
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
  private readonly programService = inject(ProgramService);
  private readonly toastService = inject(ToastService);
  
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  public isLoading = signal(false); 
  public showModal = signal(false);
  public showDeleteConfirmModal = signal(false);

  public activeTab = signal<MasterDataTab>('categories');

  public selectedItem = signal<MasterDataItem | null>(null);
  public itemToDelete = signal<MasterDataItem | null>(null);
  
  public deleteConfirmMessage = computed((): string => {
    const item = this.itemToDelete();
    const entity = this.activeTab() === 'categories' ? 'category' : 'program';
    return item 
        ? `Are you sure you want to delete the ${entity} '${item.name}'?`
        : `Are you sure you want to delete this ${entity}?`;
  });
  
  private readonly items = signal<MasterDataItem[]>([]);
  public searchForm!: FormGroup;

  public filteredItems = computed((): MasterDataItem[] => {
    const q = (this.searchForm?.get('query')?.value ?? '')
        .toLowerCase().trim();
    
    if (!q) return this.items();

    return this.items().filter((item: MasterDataItem) => {
      const matchName = item.name.toLowerCase().includes(q);
      const matchCode = item.code?.toLowerCase().includes(q) ?? false;
      return matchName || matchCode;
    });
  });

  public ngOnInit(): void {
    const initialTab = this.route.snapshot.queryParamMap.get('tab');
    if (initialTab === 'programs' || initialTab === 'categories') {
      this.activeTab.set(initialTab as MasterDataTab);
    }

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
      switchMap((): Observable<MasterDataItem[]> => {
        if (this.activeTab() === 'categories') {
          return this.categoryService.getCategories().pipe(
            map((cats: CategoryModel[]) => cats.map((c: CategoryModel) => ({ 
              id: c.category_id, 
              name: c.category_name 
            })))
          );
        } else {
          return this.programService.getPrograms().pipe(
            map((progs: ProgramResponse[]) => 
                  progs.map((p: ProgramResponse) => ({
              id: p.programId,
              code: p.programCode,
              name: p.programName
            })))
          );
        }
      }),
      catchError((): Observable<MasterDataItem[]> => {
        this.toastService.showError('Failed to load data');
        return of([]);
      }),
      takeUntil(this.destroy$)
    ).subscribe((data: MasterDataItem[]): void => {
      this.items.set(data);
      this.isLoading.set(false);
    });
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public switchTab(tab: MasterDataTab): void {
    if (this.activeTab() === tab) return;
    
    this.activeTab.set(tab);
    this.searchForm.get('query')?.setValue('');
    
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab },
      queryParamsHandling: 'merge'
    });

    this.refreshTrigger$.next();
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

  private handleSuccess(message: string): void {
    this.toastService.showSuccess(message);
    this.closeModal();
    this.refreshTrigger$.next();
  }

  public onSaveItem(payload: SavePayload): void {
    if (this.activeTab() === 'categories') {
      this.categoryService.createCategory({ category_name: payload.name })
        .subscribe({
          next: (): void => this.handleSuccess('Category created'),
          error: (): void => this.toastService.showError('Failed to create')
        });
    } else {
      this.programService.createProgram({
        programCode: payload.code || '',
        programName: payload.name
      }).subscribe({
        next: (): void => this.handleSuccess('Program created'),
        error: (): void => this.toastService.showError('Failed to create')
      });
    }
  }

  public onUpdateItem(payload: UpdatePayload): void {
    if (this.activeTab() === 'categories') {
      this.categoryService.updateCategory(payload.id, { 
        category_name: payload.name 
      }).subscribe({
        next: (): void => this.handleSuccess('Category updated'),
        error: (): void => this.toastService.showError('Failed to update')
      });
    } else {
      this.programService.updateProgram(payload.id, {
        programCode: payload.code || '',
        programName: payload.name
      }).subscribe({
        next: (): void => this.handleSuccess('Program updated'),
        error: (): void => this.toastService.showError('Failed to update')
      });
    }
  }

  public confirmDelete(item: MasterDataItem): void {
    this.itemToDelete.set(item);
    this.showDeleteConfirmModal.set(true);
  }

  public proceedWithDeletion(): void {
    const item = this.itemToDelete();
    if (!item) return;

    if (this.activeTab() === 'categories') {
      this.categoryService.deleteCategory(item.id).subscribe({
        next: (): void => {
          this.toastService.showSuccess('Category deleted');
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
    } else {
      this.programService.deleteProgram(item.id).subscribe({
        next: (): void => {
          this.toastService.showSuccess('Program deleted');
          this.showDeleteConfirmModal.set(false);
          this.itemToDelete.set(null);
          this.refreshTrigger$.next();
        },
        error: (): void => {
          this.toastService.showError('Failed to delete program');
          this.showDeleteConfirmModal.set(false);
          this.itemToDelete.set(null);
        }
      });
    }
  }

  public cancelDelete(): void {
    this.showDeleteConfirmModal.set(false);
    this.itemToDelete.set(null);
  }
}