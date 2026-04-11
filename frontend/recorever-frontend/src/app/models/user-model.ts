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