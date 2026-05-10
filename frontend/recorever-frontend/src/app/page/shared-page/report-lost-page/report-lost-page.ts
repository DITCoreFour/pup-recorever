import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, EMPTY, finalize, tap } from 'rxjs';
import {
  ItemReportForm
} from '../../../share-ui-blocks/item-report-form/item-report-form';
import { FinalReportSubmission, Report } from '../../../models/item-model';
import { ItemService } from '../../../core/services/item-service';
import { ToastService } from '../../../core/services/toast-service';
import {
  SuccessLostModal
} from '../../../modal/success-lost-modal/success-lost-modal';
import { AppRoutePaths } from '../../../app.routes';

@Component({
  selector: 'app-report-lost-page',
  standalone: true,
  imports: [RouterModule, ItemReportForm, SuccessLostModal],
  templateUrl: './report-lost-page.html',
  styleUrls: ['./report-lost-page.scss']
})
export class ReportLostPage implements OnInit {
  @ViewChild(ItemReportForm) reportForm!: ItemReportForm;

  private router = inject(Router);
  private itemService = inject(ItemService);
  private toastService = inject(ToastService);
  
  protected showSuccessModal = signal<boolean>(false);
  protected submissionError = signal<string | null>(null);
  protected isSubmitting = signal<boolean>(false);
  protected isEditMode = signal<boolean>(false);
  protected pageTitle = signal<string>('Report Lost Item');
  protected initialData = signal<Report | null>(null);
  protected isAdminMode = false;

  private get postEditRoute(): string {
    return this.isAdminMode
      ? AppRoutePaths.REPORT_STATUS_MANAGEMENT
      : AppRoutePaths.MY_REPORTS;
  }

  private get cancelRoute(): string {
    return this.isAdminMode
      ? AppRoutePaths.ADMIN_REPORT_LOST
      : AppRoutePaths.REPORT_LOST;
  }

  private get searchItemRoute(): string {
    return this.isAdminMode
      ? AppRoutePaths.FOUND_ITEM_MANAGEMENT
      : AppRoutePaths.BROWSE;
  }

  private get viewReportRoute(): string {
    return this.isAdminMode
      ? AppRoutePaths.ADMIN_MY_REPORTS
      : AppRoutePaths.MY_REPORTS;
  }

  ngOnInit(): void {
    const state = history.state;
    if (state && state.mode === 'EDIT' && state.data) {
      this.isEditMode.set(true);
      this.initialData.set(state.data as Report);
      this.pageTitle.set('Edit Report Lost Item');
    }

    this.isAdminMode = this.router.url.includes('/admin');
  }

  handleSubmission(data: FinalReportSubmission & { files?: File[] }): void {
    const files = data.files ?? [];
    this.isSubmitting.set(true);
    this.submissionError.set(null);

    const request$ = this.isEditMode() 
      ? this.itemService.updateReport(data, files) 
      : this.itemService.submitFullReport(data, files);

    request$.pipe(
      tap(() => {
        this.reportForm.clearPhotos();

        if (this.isAdminMode) {
          this.toastService.showSuccess(this.isEditMode() ?
              'Report updated successfully' : 'Report submitted successfully');
          this.router.navigate([AppRoutePaths.REPORT_STATUS_MANAGEMENT]);
          return;
        }

        if (this.isEditMode()) {
          this.router.navigate([this.postEditRoute]);
          return;
        }
        this.showSuccessModal.set(true);
      }),
      catchError((error: HttpErrorResponse) => {
        this.toastService.showError('Submission failed. Please try again.');
        return EMPTY;
      }),
      finalize(() => this.isSubmitting.set(false))
    ).subscribe();
  }

  onViewReport(): void {
    this.showSuccessModal.set(false);
    this.router.navigate([this.viewReportRoute]);
  }

  onSearchItems(): void {
    this.showSuccessModal.set(false);
    const navigationExtras = this.isAdminMode
      ? {}
      : { queryParams: { type: 'found' } };

    this.router.navigate([this.searchItemRoute], navigationExtras);
  }

  handleCancel(): void {
    this.router.navigate([this.cancelRoute]);
  }
}