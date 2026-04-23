import { 
  Component, 
  inject, 
  OnInit, 
  ChangeDetectorRef,
  OnDestroy, 
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  ReactiveFormsModule, 
  FormBuilder, 
  FormGroup 
} from '@angular/forms';
import { Subject, switchMap, takeUntil, startWith } from 'rxjs';

import { AdminService } from '../../../core/services/admin-service';
import { DashboardData } from '../../../models/admin-stats-model';
import { StatsCardComponent } from './stats-card/stats-card';
import { ChartComponent } from './chart-component/chart-component';

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StatsCardComponent,
    ChartComponent
  ],
  templateUrl: './admin-dashboard-page.html',
  styleUrl: './admin-dashboard-page.scss',
})
export class AdminDashboardPage implements OnInit, OnDestroy {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  
  private destroy$ = new Subject<void>();

  public dashboardData: DashboardData | null = null;
  public dashboardIcon = signal('assets/dashboard.png');

  public filterForm: FormGroup = this.fb.group({
    range: ['15'] 
  });

  public ngOnInit(): void {
    this.filterForm.get('range')?.valueChanges.pipe(
      startWith(this.filterForm.get('range')?.value),
      takeUntil(this.destroy$),
      switchMap((range: string) => {
        return this.adminService.getDashboardData(range);
      })
    ).subscribe({
      next: (data: DashboardData): void => {
        this.dashboardData = data;
        this.cdr.markForCheck();
      },
      error: (err: unknown): void => {
        console.error('Failed to load dashboard', err);
      }
    });
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public onIconError(): void {
    this.dashboardIcon.set('assets/found-items.png');
  }
}