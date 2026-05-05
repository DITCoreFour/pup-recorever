import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type CategoryModel = {
  category_id: number;
  category_name: string;
  is_deleted: boolean;
};

export type CategoryPayload = {
  category_name: string;
};

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private http = inject(HttpClient);
  private adminApiUrl = `${environment.apiUrl}/admin/categories`;
  private publicApiUrl = `${environment.apiUrl}/categories`;

  public getCategories(): Observable<CategoryModel[]> {
    return this.http.get<CategoryModel[]>(this.publicApiUrl);
  }

  public createCategory(payload: CategoryPayload): Observable<CategoryModel> {
    return this.http.post<CategoryModel>(this.adminApiUrl, payload);
  }

  public updateCategory(id: number, payload: CategoryPayload):
    Observable<CategoryModel> {
    return this.http.put<CategoryModel>(`${this.adminApiUrl}/${id}`, payload);
  }

  public deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminApiUrl}/${id}`);
  }
}