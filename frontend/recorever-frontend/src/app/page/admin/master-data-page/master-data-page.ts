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
  takeUntil, switchMap, tap, catchError, map, debounceTime, distinctUntilChanged
} from 'rxjs/operators';

import { 
  ConfirmationModal 
} from '../../../modal/confirmation-modal/confirmation-modal';
import { 
  MasterDataModal
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

import { 
  MasterDataTab, 
  MasterDataItem, 
  SortColumn, 
  SortDirection,
  SavePayload,
  UpdatePayload
} from '../../../models/master-data-model';

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

  public sortColumn = signal<SortColumn>(null);
  public sortDirection = signal<SortDirection>('asc');

  public selectedItem = signal<MasterDataItem | null>(null);
  public itemToDelete = signal<MasterDataItem | null>(null);
  
  public currentSearchQuery = signal('');
  
  private readonly items = signal<MasterDataItem[]>([]);
  public searchForm!: FormGroup;

  public deleteConfirmMessage = computed((): string => {
    const item = this.itemToDelete();
    const entity = this.activeTab() === 'categories' ? 'category' : 'program';
    return item 
        ? `Are you sure you want to delete the ${entity} '${item.name}'?`
        : `Are you sure you want to delete this ${entity}?`;
  });

  public filteredItems = computed((): MasterDataItem[] => {
    const q = this.currentSearchQuery();
    let result = this.items();

    if (q) {
      result = result.filter((item: MasterDataItem) => {
        const matchName = item.name.toLowerCase().includes(q);
        const matchCode = item.code?.toLowerCase().includes(q) ?? false;
        return matchName || matchCode;
      });
    }

    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (column) {
      result = [...result].sort((a: MasterDataItem, b: MasterDataItem) => {
        const valA = (a[column] ?? '').toLowerCase();
        const valB = (b[column] ?? '').toLowerCase();
        
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
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
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((val: string): void => {
        this.currentSearchQuery.set(val.toLowerCase().trim());
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

  public toggleSort(column: SortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((d: SortDirection) => 
          d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  public switchTab(tab: MasterDataTab): void {
    if (this.activeTab() === tab) return;
    
    this.activeTab.set(tab);
    this.searchForm.get('query')?.setValue('');
    this.currentSearchQuery.set('');
    
    this.sortColumn.set(null);
    this.sortDirection.set('asc');

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