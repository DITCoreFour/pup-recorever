import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminResponse,
  AdminRegistrationRequest
} from '../../models/user-management-model';

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private API_BASE_URL = `${environment.apiUrl}/superadmin`;
  private http = inject(HttpClient);

  getAdminAccounts(): Observable<AdminResponse[]> {
    return this.http
      .get<AdminResponse[]>(`${this.API_BASE_URL}/users`)
      .pipe(catchError(() => of([])));
  }

  registerAdmin(request: AdminRegistrationRequest): Observable<AdminResponse> {
    return this.http.post<AdminResponse>(`${this.API_BASE_URL}/register-admin`, request);
  }

  updateAdmin(request: any): Observable<AdminResponse> {
    // Assuming your backend endpoint follows this pattern
    return this.http.put<AdminResponse>(`${this.API_BASE_URL}/users/${request.id}`, request);
  }

  deleteAdmin(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE_URL}/users/${id}`);
  }
}