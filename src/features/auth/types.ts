export interface LoginRequest {
  userName: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  accessToken: string | null;
  expiresAt: string | null;
  refreshToken: string | null;
  userName: string | null;
  errorMessage: string | null;
}

export interface AuthApiResponse {
  success: boolean;
  data: AuthResult | null;
  error: {
    code: string;
    message: string;
  } | null;
  traceId: string | null;
}

export interface AuthUser {
  userName: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  data: AuthResult | null;
  error: {
    code: string;
    message: string;
  } | null;
  traceId: string | null;
}

// ============= USER PROFILE =============

export interface UserProfile {
  id: number;
  username: string;
  name: string;
  email: string;
  status: number;
  lastLogin: string | null;
  dateAdded: string | null;
  passwordHint?: string | null;
}

export interface UpdateProfileRequest {
  name: string;
  email: string;
  passwordHint?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
