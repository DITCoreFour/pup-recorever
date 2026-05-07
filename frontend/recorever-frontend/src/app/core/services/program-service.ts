import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ProgramResponse = {
  programId: number;
  programCode: string;
  programName: string;
};

export type ProgramPayload = {
  programCode: string;
  programName: string;
};

@Injectable({
  providedIn: 'root'
})
export class ProgramService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/programs`;

  public getPrograms(): Observable<ProgramResponse[]> {
    return this.http.get<ProgramResponse[]>(this.apiUrl);
  }

  public createProgram(payload: ProgramPayload): Observable<ProgramResponse> {
    return this.http.post<ProgramResponse>(this.apiUrl, payload);
  }

  public updateProgram(
      id: number, 
      payload: ProgramPayload
  ): Observable<ProgramResponse> {
    return this.http.put<ProgramResponse>(`${this.apiUrl}/${id}`, payload);
  }

  public deleteProgram(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}