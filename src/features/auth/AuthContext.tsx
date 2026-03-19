"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { AuthUser, LoginRequest } from "./types";
import { login as loginApi, logout as logoutApi } from "./api";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_REFRESH_TOKEN_KEY = "auth_refresh_token";
const AUTH_USER_KEY = "auth_user";

function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(AUTH_USER_KEY);
    if (!stored) return null;
    const user = JSON.parse(stored) as AuthUser;
    // Check if token is expired
    if (user.expiresAt && new Date(user.expiresAt) < new Date()) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

function storeUser(user: AuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  localStorage.setItem(AUTH_TOKEN_KEY, user.accessToken);
  localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, user.refreshToken);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = getStoredUser();
    setUser(storedUser);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const isLoginPage = pathname === "/login";
    const isAuthenticated = !!user;

    if (!isAuthenticated && !isLoginPage) {
      router.replace("/login");
    } else if (isAuthenticated && isLoginPage) {
      router.replace("/sales-orders/create");
    }
  }, [user, isLoading, pathname, router]);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await loginApi(credentials);

      console.log("[Login] Response:", response);

      if (response.success && response.data?.accessToken && response.data?.refreshToken) {
        const authUser: AuthUser = {
          userName: response.data.userName || credentials.userName,
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          expiresAt: response.data.expiresAt || "",
        };
        console.log("[Login] Storing auth user with tokens");
        storeUser(authUser);
        setUser(authUser);
        return { success: true };
      }

      console.warn("[Login] Missing accessToken or refreshToken in response");

      return {
        success: false,
        error: response.data?.errorMessage || response.error?.message || "Đăng nhập thất bại",
      };
    } catch (error) {
      console.error("[Login] Error:", error);
      const message = error instanceof Error ? error.message : "Đăng nhập thất bại";
      return { success: false, error: message };
    }
  };

  const logout = () => {
    logoutApi();
    setUser(null);
    router.replace("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
