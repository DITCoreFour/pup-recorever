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
import {
  FormBuilder,
  FormGroup,
  FormControl,
  ReactiveFormsModule
} from '@angular/forms';

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

import { Category, SurrenderLocation } from '../../models/item-model';

export type FilterState = {
  sort: 'newest' | 'oldest';
  date: Date | null;
  location: string;
  status?: string;
  category?: string[];
  surrenderedLocation?: string;
};

export type RawFilterValue = Partial<{
  sort: 'newest' | 'oldest' | null;
  date: Date | null;
  location: string | null;
  status: string | null;
  category: string[] | null;
  surrenderedLocation: string | null;
}>;

export type FilterFormType = FormGroup<{
  sort: FormControl<'newest' | 'oldest' | null>;
  date: FormControl<Date | null>;
  location: FormControl<string | null>;
  status: FormControl<string | null>;
  category: FormControl<string[] | null>;
  surrenderedLocation: FormControl<string | null>;
}>;

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
  
  public genericLabels = input(false);
  public isUserPage = input(false);
  public isAdminPage = input(false);
  public adminStatusOptions = input<string[]>([]);
  public initialAdminStatus = input('All Statuses');

  public categories = input<string[]>([
    'Electronics', 'Clothing', 'Accessories', 'Documents', 'Wallets/Bags'
  ]);

  @Output() public filterChange = new EventEmitter<FilterState>();

  protected filterForm: FilterFormType;
  
  protected isDefaultState = signal(true);
  protected isFilterVisible = signal(false);
  
  protected filteredLocations$: Observable<string[]> = of([]);
  protected fetchedCategories = signal<string[]>([]);
  protected fetchedSurrenderedLocs = signal<string[]>([]);

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
      sort: new FormControl<'newest' | 'oldest'>('newest'),
      date: new FormControl<Date | null>(null),
      location: new FormControl(''),
      status: new FormControl('unresolved'),
      category: new FormControl<string[]>([]),
      surrenderedLocation: new FormControl('')
    }) as FilterFormType;

    this.destroyRef.onDestroy((): void => {
      this.toggleParentScroll(true);
    });
  }

  public ngOnInit(): void {
    this.itemService.getCategories().subscribe((cats: Category[]): void => {
      this.fetchedCategories.set(
          cats.map((c: Category) => c.category_name)
      );
    });
    
    this.itemService.getSurrenderLocations().subscribe(
        (locs: SurrenderLocation[]): void => {
      this.fetchedSurrenderedLocs.set(
          locs.map((l: SurrenderLocation) => l.surrendered_location_name)
      );
    });

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
        switchMap(([val, locs]: [string | null, string[]]):
            Observable<string[]> => {
          const filterValue = (val || '').trim();
          if (filterValue.length === 0) return of(locs);
          return this.itemService.searchLocations(filterValue);
        })
      );
    }

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((prev: RawFilterValue, curr: RawFilterValue): 
            boolean => JSON.stringify(prev) === JSON.stringify(curr))
      )
      .subscribe((value: RawFilterValue): void => {
        const mappedState: Partial<FilterState> = {
          sort: (value.sort as 'newest' | 'oldest') || 'newest',
          date: value.date || null,
          location: value.location || '',
          status: value.status || undefined,
          category: value.category || undefined,
          surrenderedLocation: value.surrenderedLocation || undefined
        };
        this.updateDefaultState(mappedState);
        this.emitFilter(mappedState);
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
    let defaultStatus = 'unresolved';
    if (this.isAdminPage()) {
      defaultStatus = this.adminStatusOptions().length > 0
          ? this.initialAdminStatus()
          : 'All Statuses';
    }

    this.filterForm.patchValue({
      sort: 'newest',
      date: null,
      location: '',
      status: defaultStatus,
      category: [],
      surrenderedLocation: ''
    });
  }

  protected clearLocation(event: Event): void {
    event.stopPropagation();
    this.filterForm.get('location')?.setValue('');
  }

  protected toggleFilter(): void {
    this.isFilterVisible.update((value: boolean) => !value);
  }

  private updateDefaultState(formValue: Partial<FilterState>): void {
    const isLocationEmpty = !formValue.location || formValue.location === '';
    
    let isDefault = formValue.sort === 'newest' &&
        formValue.date === null &&
        isLocationEmpty;
    
    if (this.isUserPage()) {
      const isCategoryEmpty = !formValue.category ||
          formValue.category.length === 0;
      const isUnresolved = formValue.status === 'unresolved';
      isDefault = isDefault && isCategoryEmpty && isUnresolved;
    }

    if (this.isAdminPage()) {
      const isSurrenderedLocEmpty = !formValue.surrenderedLocation 
          || formValue.surrenderedLocation === '';
      
      const defaultAdminStatus = this.adminStatusOptions().length > 0
          ? this.initialAdminStatus()
          : 'All Statuses';
      
      const isStatusDefault = formValue.status === defaultAdminStatus;

      isDefault = isDefault && isSurrenderedLocEmpty && isStatusDefault;
    }

    this.isDefaultState.set(isDefault || false);
  }

  private emitFilter(formValue: Partial<FilterState>): void {
    const state: FilterState = {
      sort: (formValue.sort as 'newest' | 'oldest') || 'newest',
      date: formValue.date || null,
      location: formValue.location || '',
      category: formValue.category || []
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