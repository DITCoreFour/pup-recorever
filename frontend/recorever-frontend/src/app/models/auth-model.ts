export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  programId: number | null;
  year: number | null;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user_id: number;
  user_name: string;
};

export type LogoutResponse = {
  success: boolean;
  message: string;
}

export interface MessageResponse {
  message: string;
}

export interface ErrorResponse {
  error: string;
}

export interface VerificationResponse {
  success: boolean;
  message?: string;
  error?: string;
}