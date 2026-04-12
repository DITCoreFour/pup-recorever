export type User = {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture: string;
  role: 'user' | 'admin';
  reports?: Report[];
  program_id: number | null;
  year_level: number | null;
};

export enum YearLevel {
  FIRST_YEAR = 1,
  SECOND_YEAR = 2,
  THIRD_YEAR = 3,
  FOURTH_YEAR = 4,
}

export type RegisterFormPayload = {
  firstName: string;
  lastName: string;
  programId?: number | null;
  year?: YearLevel | null;
  email: string;
  password: string;
};

export type NavItem = {
  label: string;
  route: string;
  iconPath: string;
};

export type ProfileNavItem = {
  label: string;
  iconPath: string;
  action: 'navigate' | 'emit' | 'addAccount' | 'logout' | 'openSettings';
  route?: string;
};

export type ChangePasswordRequest = {
  oldPassword: string;
  newPassword: string;
};

export type UniqueCheckResponse = {
  isUnique: boolean;
};