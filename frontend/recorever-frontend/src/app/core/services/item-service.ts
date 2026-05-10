import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, tap, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Report,
  ReportFilters,
  FinalReportSubmission,
  PaginatedResponse,
  Category,
  SurrenderLocation
} from '../../models/item-model';
import { MatchResponseDTO } from '../../models/match-model';

@Injectable({
  providedIn: 'root',
})
export class ItemService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private cachedLocations: string[] | null = null;
  private searchLocationCache = new Map<string, string[]>();

  submitFullReport(
      report: FinalReportSubmission,
      files: File[]
  ): Observable<Report> {
    const formData = new FormData();

    if (report.reported_by != null) {
      formData.append('reported_by', String(report.reported_by));
    }

    if (report.reporter_email != null) {
      formData.append('reporter_email', report.reporter_email);
    }

    if (report.reporter_phone != null) {
      formData.append('reporter_phone', report.reporter_phone);
    }

    if (report.reported_by_user_id != null) {
      formData.append(
        'reported_by_user_id',
        report.reported_by_user_id.toString()
      );
    }

    formData.append('type', report.type);
    formData.append('item_name', report.item_name);
    formData.append('category_id', report.category_id.toString());
    formData.append('location', report.location);

    if (report.status != null) {
      formData.append('status', report.status.toString());
    }

    if (report.surrendered_location_id != null) {
      formData.append(
        'surrendered_location_id',
        report.surrendered_location_id.toString()
      );
    }

    formData.append('description', report.description);

    if (report.date_lost_found) {
      formData.append('date_lost_found', report.date_lost_found);
    }

    if (files && files.length > 0) {
      files.forEach((file: File) => {
        formData.append('files', file, file.name);
      });
    }

    return this.http.post<Report>(
        `${this.apiUrl}/reports/full-submit`,
        formData
    );
  }

  updateReport(
    report: FinalReportSubmission,
    files: File[]
  ): Observable<Report> {
    const formData = new FormData();

    if (report.reported_by) {
      formData.append('reported_by', String(report.reported_by));
    }

    if (report.reporter_email) {
      formData.append('reporter_email', report.reporter_email);
    }

    if (report.reporter_phone) {
      formData.append('reporter_phone', report.reporter_phone);
    }

    if (report.reported_by_user_id) {
      formData.append(
        'reported_by_user_id',
        report.reported_by_user_id.toString()
      );
    }

    formData.append('type', report.type);
    formData.append('item_name', report.item_name);
    formData.append('category_id', report.category_id.toString());
    formData.append('location', report.location);
    formData.append('description', report.description);

    if (report.status) {
      formData.append('status', report.status.toString());
    }

    if (report.surrendered_location_id) {
      formData.append(
        'surrendered_location_id',
        report.surrendered_location_id.toString()
      );
    }

    if (report.date_lost_found) {
      formData.append('date_lost_found', report.date_lost_found);
    }

    if (files && files.length > 0) {
      files.forEach((file: File) => {
        formData.append('files', file, file.name);
      });
    }

    const id = report.report_id;

    return this.http.put<Report>(
      `${this.apiUrl}/report/${id}`,
      formData
    );
  }

  getReports(filters: ReportFilters): Observable<PaginatedResponse<Report>> {
    let params = new HttpParams();
    const endpoint = `${this.apiUrl}/reports`;

    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.size) params = params.set('size', filters.size.toString());
    if (filters.type) params = params.set('type', filters.type);
    
    if (filters.status_id) {
      if (Array.isArray(filters.status_id)) {
        filters.status_id.forEach(id => {
          params = params.append('status', id.toString());
        });
      } else {
        params = params.set('status', filters.status_id.toString());
      }
    }

    if (filters.user_id) {
      params = params.set('user_id', filters.user_id.toString());
    }

    if (filters.query) params = params.set('query', filters.query);
    if (filters.location) params = params.set('location', filters.location);

    return this.http.get<PaginatedResponse<Report>>(endpoint, { params });
  }

  getReportById(id: number): Observable<Report> {
    return this.http.get<Report>(`${this.apiUrl}/report/${id}`);
  }

  deleteReport(reportId: number): Observable<void> {
    return this.http.delete<void>(
        `${this.apiUrl}/report/${reportId}`
    );
  }

  createReport(report: FinalReportSubmission): Observable<Report> {
    return this.http.post<Report>(
        `${this.apiUrl}/report`,
        report
    );
  }

  updateReportStatus(reportId: number, status: string): Observable<Report> {
    return this.http.put<Report>(
      `${this.apiUrl}/report/${reportId}/status`,
      { status }
    );
  }

  updateMatchStatus(matchId: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/match/${matchId}`, { status });
  }

  getMatchForReport(reportId: number): Observable<MatchResponseDTO | undefined> {
    return this.http.get<MatchResponseDTO[]>(`${this.apiUrl}/matches`).pipe(
      map((matches) =>
        matches.find(m => m.lost_report_id === reportId ||
            m.found_report_id === reportId)
      )
    );
  }

  getTopLocations(): Observable<string[]> {
    if (this.cachedLocations) {
      return of(this.cachedLocations);
    }

    return this.http.get<string[]>(`${this.apiUrl}/reports/top-locations`).pipe(
      tap(locations => this.cachedLocations = locations)
    );
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`);
  }

  getSurrenderLocations(): Observable<SurrenderLocation[]> {
    return this.http.get<SurrenderLocation[]>(
      `${this.apiUrl}/surrender-locations`
    );
  }

  searchLocations(query: string): Observable<string[]> {
    if (this.searchLocationCache.has(query)) {
      return of(this.searchLocationCache.get(query)!);
    }

    const params = new HttpParams().set('query', query);
    return this.http.get<string[]>(`${this.apiUrl}/reports/locations`,
        { params }).pipe(
      tap((locations: string[]) =>
          this.searchLocationCache.set(query, locations))
    );
  }

  getPotentialMatches(reportId: number, claimantId: number): Observable<Report[]> {
    return this.http.get<Report[]>(
      `${this.apiUrl}/reports/${reportId}/potential-matches/${claimantId}`
    );
  }

  keepReportActive(reportId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/reports/${reportId}/keep-active`, {});
  }
}