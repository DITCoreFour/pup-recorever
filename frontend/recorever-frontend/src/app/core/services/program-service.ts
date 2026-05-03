import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ProgramResponse = {
  programId: number;
  programCode: string;
  programName: string;
};

@Injectable({
  providedIn: 'root'
})
export class ProgramService {
  private http = inject(HttpClient);

  public getPrograms(): Observable<ProgramResponse[]> {
    return this.http.get<ProgramResponse[]>(`${environment.apiUrl}/programs`);
  }
}