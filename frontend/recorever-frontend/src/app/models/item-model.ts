import { FormArray, FormControl, FormGroup } from '@angular/forms';

export type PaginatedResponse<T> = {
  items: T[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
};

export type ReportStatus = {
  status_id: number;
  status_name: string;
}

export enum ReportStatusEnum {
  PENDING = 1,
  MATCHED = 2,
  REJECTED = 3,
  APPROVED = 4,
  CLAIMED = 5,
  RESOLVED = 6
}

export type Report = {
  report_id: number;
  user_id: number;
  type: 'lost' | 'found';
  item_name: string;
  category: Category;
  location: string;
  surrendered_location?: SurrenderLocation | null;
  date_lost_found?: string;
  date_reported: string;
  date_posted?: string;
  date_resolved: string | null;
  description: string;
  status: ReportStatus;
  matching_lost_report_id: number | null;
  surrender_code: string | null;
  claim_code: string | null;
  expiry_date?: string;
  reporter_name?: string;
  remarks?: string;
  photoUrls?: string[];
  images?: { imageUrl: string; fileName: string }[];
  reporter_profile_picture?: string | null;
  reporter_details?: {
    reported_by_user_id: number | null;
    person_name: string;
    person_email: string;
    person_phone: string;
    admin_id: number | null;
  };
  updated_at?: string;
  is_admin_edit?: boolean;
};

export type ReportFilters = {
  type?: 'lost' | 'found';
  status_id?: number | number[];
  location?: string;
  query?: string;
  user_id?: number;
  page?: number;
  size?: number;
};

export enum StandardLocations {
  ZONTA_PARK = 'Zonta Park',
  LOCATION_ONE = 'Location 1',
  LOCATION_TWO = 'Location 2',
  OTHERS = 'Others...',
}

export const StandardRelativeDateFilters: string[] = [
  'Past hour',
  'Past 24 hours',
  'Past week',
  'Past month',
  'Past year',
];

export type ItemReportForm = FormGroup<{
  reported_by: FormControl<string | null>;
  reporter_email: FormControl<string | null>;
  reporter_phone: FormControl<string | null>;
  item_name: FormControl<string | null>;
  category: FormControl<number | null>;
  location: FormControl<string | null>;
  surrendered_location: FormControl<number | null>;
  date_lost_found: FormControl<string | null>;
  description: FormControl<string | null>;
  photoUrls: FormArray<FormControl<string | null>>;
}>;

export type ReportSubmissionPayload = {
  reported_by_user_id?: number | null;
  reported_by?: string | null;
  reporter_email?: string | null;
  reporter_phone?: string | null;
  type: 'lost' | 'found';
  item_name: string;
  category_id: number;
  location: string;
  surrendered_location_id?: number | null;
  description: string;
};

export type FinalReportSubmission = {
  report_id?: number;
  reported_by_user_id?: number | null;
  reported_by?: string | null;
  reporter_email?: string | null;
  reporter_phone?: string | null;
  type: 'lost' | 'found';
  status: ReportStatusEnum;
  item_name: string;
  category_id: number;
  location: string;
  surrendered_location_id?: number | null;
  date_lost_found: string;
  date_reported: string;
  description: string;
  photoUrls: string[];
};

export type ReportSubmissionWithFiles = FinalReportSubmission & {
  files: File[];
};

export type FilePreview = {
  file: File;
  url: string;
  name: string;
};

export interface Category {
  category_id: number;
  category_name: string;
}

export interface SurrenderLocation {
  surrendered_location_id: number;
  surrendered_location_name: string;
}