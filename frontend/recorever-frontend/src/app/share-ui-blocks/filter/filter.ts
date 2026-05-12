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
  ViewChild,
  AfterViewInit,
  DestroyRef
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  ReactiveFormsModule
} from '@angular/forms';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { 
  MatAutocompleteModule, 
  MatAutocompleteTrigger 
} from '@angular/material/autocomplete';

import { Observable, fromEvent } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  startWith
} from 'rxjs/operators';

import { ItemService } from '../../core/services/item-service';
import { Category, SurrenderLocation } from '../../models/item-model';

export type FilterState = {
  sort: 'newest' | 'oldest';
  startDate: Date | null;
  endDate: Date | null;
  location: string;
  status?: string;
  category?: string[];
  surrenderedLocation?: string;
};

type ResetValue = {
  sort: 'newest' | 'oldest';
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  location: string;
  status: string;
  category: string[];
  surrenderedLocation: string;
};

export type RawFilterValue = Partial<{
  sort: 'newest' | 'oldest' | null;
  dateRange: Partial<{ start: Date | null; end: Date | null }> | null;
  location: string | null;
  status: string | null;
  category: string[] | null;
  surrenderedLocation: string | null;
}>;

export type FilterFormType = FormGroup<{
  sort: FormControl<'newest' | 'oldest' | null>;
  dateRange: FormGroup<{
    start: FormControl<Date | null>;
    end: FormControl<Date | null>;
  }>;
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
    MatAutocompleteModule
  ],
  templateUrl: './filter.html',
  styleUrl: './filter.scss',
  encapsulation: ViewEncapsulation.None
})
export class Filter implements OnInit, AfterViewInit {
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

  @ViewChild('locationTrigger') 
  public autoTrigger!: MatAutocompleteTrigger;

  protected filterForm: FilterFormType;
  protected isDefaultState = signal(true);
  protected isFilterVisible = signal(false);
  
  protected filteredLocations$!: Observable<string[]>;
  protected fetchedCategories = signal<string[]>([]);
  protected fetchedSurrenderedLocs = signal<string[]>([]);
  protected allLocations: string[] = [];

  private destroyRef = inject(DestroyRef);
  private itemService = inject(ItemService);
  private document = inject(DOCUMENT);
  private fb = inject(FormBuilder);

  protected dateLabel = computed((): string => {
    if (this.genericLabels()) return 'Date Range';
    return this.itemType() === 'found' ? 'Date Found' : 'Date Lost';
  });

  protected locationLabel = computed((): string => {
    if (this.genericLabels()) return 'Location';
    return this.itemType() === 'found' ? 'Location Found' : 'Location Lost';
  });

  constructor() {
    this.filterForm = this.fb.group({
      sort: new FormControl<'newest' | 'oldest'>('newest'),
      dateRange: this.fb.group({
        start: new FormControl<Date | null>(null),
        end: new FormControl<Date | null>(null)
      }),
      location: new FormControl(''),
      status: new FormControl('unresolved'),
      category: new FormControl<string[]>([]),
      surrenderedLocation: new FormControl('')
    }) as FilterFormType;
  }

  public ngOnInit(): void {
    this.itemService.getTopLocations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (locations: string[]): void => {
          this.allLocations = locations || [];
          this.setupFiltering();
        },
        error: (): void => {
          this.allLocations = [];
          this.setupFiltering();
        }
      });

    this.itemService.getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cats: Category[]): void => {
        this.fetchedCategories.set(
            cats.map((c: Category) => c.category_name)
        );
      });
    
    this.itemService.getSurrenderLocations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((locs: SurrenderLocation[]): void => {
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

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((prev: RawFilterValue, curr: RawFilterValue):
          boolean =>
            JSON.stringify(prev) === JSON.stringify(curr)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((value: RawFilterValue): void => {
        const mappedState: Partial<FilterState> = {
          sort: (value.sort as 'newest' | 'oldest') || 'newest',
          startDate: value.dateRange?.start || null,
          endDate: value.dateRange?.end || null,
          location: value.location || '',
          status: value.status || undefined,
          category: value.category || undefined,
          surrenderedLocation: value.surrenderedLocation || undefined
        };
        this.updateDefaultState(mappedState);
        this.emitFilter(mappedState);
      });
  }

  public ngAfterViewInit(): void {
    fromEvent(this.document, 'scroll', { capture: true })
      .pipe(
        debounceTime(10), 
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((): void => {
        if (this.autoTrigger && this.autoTrigger.panelOpen) {
          this.autoTrigger.closePanel();
        }
      });
  }

  private setupFiltering(): void {
    const locControl = this.filterForm.controls.location;
    if (locControl) {
      this.filteredLocations$ = locControl.valueChanges.pipe(
        startWith(locControl.value || ''),
        map((val: string | null): string[] => this.filterLocations(val || ''))
      );
    }
  }

  private filterLocations(value: string): string[] {
    const filterValue = value.trim().toLowerCase();
    
    if (!filterValue) {
      return this.allLocations.slice(0, 5);
    }

    return this.allLocations.filter((option: string): boolean =>
      option.toLowerCase().includes(filterValue)
    );
  }

  protected resetFilters(): void {
    let defaultStatus = 'unresolved';
    if (this.isAdminPage()) {
      defaultStatus = 'All Statuses';
    }

    const resetValue: ResetValue = {
      sort: 'newest',
      dateRange: { start: null, end: null },
      location: '',
      status: defaultStatus,
      category: [],
      surrenderedLocation: ''
    };

    this.filterForm.reset(resetValue, { emitEvent: false });
    this.updateDefaultState(resetValue);
    this.emitFilter(resetValue);
  }

  protected clearLocation(event: Event): void {
    event.stopPropagation();
    this.filterForm.controls.location.setValue('');
  }

  protected clearDate(event: Event): void {
    event.stopPropagation();
    this.filterForm.controls.dateRange.setValue({ start: null, end: null });
  }

  protected toggleFilter(): void {
    this.isFilterVisible.update((value: boolean) => !value);
  }

  private updateDefaultState(formValue: Partial<FilterState>): void {
    const isLocationEmpty = !formValue.location || formValue.location === '';
    const isDateEmpty = formValue.startDate === null && formValue.endDate === null;
    const isSortDefault = formValue.sort === 'newest';
    
    let isDefault = isSortDefault && isDateEmpty && isLocationEmpty;
    
    if (this.isUserPage()) {
      const isCategoryEmpty = !formValue.category || formValue.category.length === 0;
      const isUnresolved = formValue.status === 'unresolved';
      isDefault = isDefault && isCategoryEmpty && isUnresolved;
    }

    if (this.isAdminPage()) {
      let isSurrenderedLocEmpty = true;
      if (this.itemType() === 'found') {
        isSurrenderedLocEmpty = !formValue.surrenderedLocation ||
            formValue.surrenderedLocation === '';
      }
      const isStatusDefault = formValue.status === 'All Statuses';
      const isCategoryEmpty = !formValue.category || formValue.category.length === 0;

      isDefault = isDefault && isSurrenderedLocEmpty &&
          isStatusDefault && isCategoryEmpty;
    }

    this.isDefaultState.set(isDefault);
  }

  private emitFilter(formValue: Partial<FilterState>): void {
    const state: FilterState = {
      sort: (formValue.sort as 'newest' | 'oldest') || 'newest',
      startDate: formValue.startDate || null,
      endDate: formValue.endDate || null,
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
      
      if (this.itemType() === 'found') {
        state.surrenderedLocation = formValue.surrenderedLocation || '';
      }
      
      state.category = formValue.category || [];
    }

    this.filterChange.emit(state);
  }
}