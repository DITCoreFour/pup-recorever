import {
  Component,
  EventEmitter,
  input,
  OnInit,
  Output,
  ViewEncapsulation,
  signal,
  computed,
  inject,
  ElementRef,
  Renderer2,
  DestroyRef
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ScrollDispatcher, ScrollingModule } from '@angular/cdk/scrolling';

import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  startWith
} from 'rxjs/operators';
import { Observable, of, combineLatest } from 'rxjs';
import { ItemService } from '../../core/services/item-service';

export type FilterState = {
  sort: 'newest' | 'oldest';
  date: Date | null;
  location: string;
  status?: string;
  category?: string[];
  surrenderedLocation?: string;
};

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [
   CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatAutocompleteModule,
    ScrollingModule
  ],
  templateUrl: './filter.html',
  styleUrl: './filter.scss',
  encapsulation: ViewEncapsulation.None
})
export class Filter implements OnInit {
  public locations = input<string[]>([]);
  public itemType = input<'lost' | 'found'>('lost');
  public genericLabels = input<boolean>(false);
  public isUserPage = input<boolean>(false);
  
  public isAdminPage = input<boolean>(false);
  public adminStatusOptions = input<string[]>([]);
  public initialAdminStatus = input<string>('All Statuses');

  public categories = input<string[]>([
    'Electronics', 'Clothing', 'Accessories', 'Documents', 'Wallets/Bags'
  ]);

  @Output() public filterChange = new EventEmitter<FilterState>();

  protected filterForm: FormGroup;
  protected isDefaultState = signal<boolean>(true);
  protected isFilterVisible = signal<boolean>(false);
  protected filteredLocations$: Observable<string[]> = of([]);

  private locations$ = toObservable(this.locations);

  private scrollDispatcher = inject(ScrollDispatcher);
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);
  private destroyRef = inject(DestroyRef);
  private itemService = inject(ItemService);

  protected dateLabel = computed((): string => {
    if (this.genericLabels()) return 'Date';
    return this.itemType() === 'found' ? 'Date Found' : 'Date Lost';
  });

  protected locationLabel = computed((): string => {
    if (this.genericLabels()) return 'Location';
    return this.itemType() === 'found' ? 'Location Found' : 'Location Lost';
  });

  constructor(private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      sort: ['newest'],
      date: [null],
      location: [''],
      status: ['unresolved'],
      category: [[] as string[]],
      surrenderedLocation: ['']
    });

    this.destroyRef.onDestroy(() => {
      this.toggleParentScroll(true);
    });
  }

  public ngOnInit(): void {
    if (this.isAdminPage()) {
      const initialStatus = this.adminStatusOptions().length > 0 
          ? this.initialAdminStatus() 
          : 'unresolved';
      
      this.filterForm.patchValue({ status: initialStatus },
          { emitEvent: false });
    }

    const locControl = this.filterForm.get('location');
    if (locControl) {
      this.filteredLocations$ = combineLatest([
        locControl.valueChanges.pipe(
          startWith(locControl.value || ''),
          debounceTime(300),
          distinctUntilChanged()
        ),
        this.locations$
      ]).pipe(
        switchMap(([value, locations]: [string | null, string[]]): Observable<string[]> => {
          const filterValue = (value || '').trim();
          if (filterValue.length === 0) return of(locations);
          return this.itemService.searchLocations(filterValue);
        })
      );
    }

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((prev, curr) =>
            JSON.stringify(prev) === JSON.stringify(curr))
      )
      .subscribe((value: Partial<FilterState>) => {
        this.updateDefaultState(value);
        this.emitFilter(value);
      });
  }

  protected onLocationPanelOpened(): void {
    this.toggleParentScroll(false);
  }

  protected onLocationPanelClosed(): void {
    this.toggleParentScroll(true);
  }

  private toggleParentScroll(enable: boolean): void {
    const scrollContainers =
        this.scrollDispatcher.getAncestorScrollContainers(this.elementRef);
    if (scrollContainers && scrollContainers.length > 0) {
      const containerRef = scrollContainers[0].getElementRef();
      const value = enable ? '' : 'hidden';
      this.renderer.setStyle(containerRef.nativeElement, 'overflow', value);
    }
  }

  protected resetFilters(): void {
    const currentStatus = this.filterForm.get('status')?.value || 'unresolved';

    this.filterForm.patchValue({
      sort: 'newest',
      date: null,
      location: '',
      status: currentStatus,
      category: [],
      surrenderedLocation: ''
    });
  }

  protected clearLocation(event: Event): void {
    event.stopPropagation();
    this.filterForm.get('location')?.setValue('');
  }

  protected toggleFilter(): void {
    this.isFilterVisible.update(value => !value);
  }

  private updateDefaultState(formValue: Partial<FilterState>): void {
    const isLocationEmpty = !formValue.location || formValue.location === '';
    
    let isDefault = formValue.sort === 'newest' && formValue.date === null && isLocationEmpty;
    
    if (this.isUserPage()) {
      const isCategoryEmpty = !formValue.category || formValue.category.length === 0;
      isDefault = isDefault && isCategoryEmpty;
    }

    if (this.isAdminPage()) {
      const isSurrenderedLocationEmpty = !formValue.surrenderedLocation 
          || formValue.surrenderedLocation === '';
      isDefault = isDefault && isSurrenderedLocationEmpty;
    }

    this.isDefaultState.set(isDefault || false);
  }

  private emitFilter(formValue: Partial<FilterState>): void {
    const state: FilterState = {
      sort: (formValue.sort as 'newest' | 'oldest') || 'newest',
      date: formValue.date || null,
      location: formValue.location || ''
    };

    if (this.isUserPage()) {
      state.status = formValue.status || 'unresolved';
      state.category = formValue.category || [];
    }

    if (this.isAdminPage()) {
      if (this.adminStatusOptions().length > 0) {
        state.status = formValue.status || 'All Statuses';
      }
      state.surrenderedLocation = formValue.surrenderedLocation || '';
    }

    this.filterChange.emit(state);
  }
}