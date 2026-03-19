import api from "@/lib/api";
import type {
  LoginRequest,
  AuthApiResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  UserProfile,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from "./types";

export async function login(credentials: LoginRequest): Promise<AuthApiResponse> {
  const response = await api.post<AuthApiResponse>("/admin/v1/auth/login", credentials);
  return response.data;
}

export async function refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
  const response = await api.post<RefreshTokenResponse>("/admin/v1/auth/refresh", request);
  return response.data;
}

export async function logout(): Promise<void> {
  // Clear token from storage
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_refresh_token");
    localStorage.removeItem("auth_user");
  }
}

// ============= USER PROFILE =============

export async function getProfile(): Promise<UserProfile> {
  const { data } = await api.get("/admin/v1/auth/me");
  return (data as any)?.data ?? data;
}

export async function updateProfile(request: UpdateProfileRequest): Promise<void> {
  await api.put("/admin/v1/auth/me", request);
}

export async function changePassword(request: ChangePasswordRequest): Promise<void> {
  await api.post("/admin/v1/auth/change-password", request);
}
