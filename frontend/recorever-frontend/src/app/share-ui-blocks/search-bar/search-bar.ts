import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  inject,
  DestroyRef
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.html',
  styleUrls: ['./search-bar.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatOptionModule
  ]
})
export class SearchBarComponent implements OnInit {
  @Input() suggestions: string[] = [];
  @Input() placeholder: string = 'Search';
  @Output() search = new EventEmitter<string>();
  @Output() queryChange = new EventEmitter<string>();

  searchControl = new FormControl<string>('');
  
  private searchSubject = new Subject<string>();
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe((value: string | null) => {
        this.queryChange.emit(value || '');
      });

    this.searchSubject
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        debounceTime(400),
        map((term: string) => term.trim()),
        distinctUntilChanged()
      )
      .subscribe((term: string) => {
        this.search.emit(term);
      });
  }

  onSearch(): void {
    const searchTerm = this.searchControl.value || '';
    this.searchSubject.next(searchTerm);
  }

  onOptionSelected(): void {
    this.onSearch();
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.searchSubject.next('');
  }
}