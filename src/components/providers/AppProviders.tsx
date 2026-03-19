"use client";

import { QueryProvider } from "./QueryProvider";
import { ErrorBoundary } from "./ErrorBoundary";
import { AuthProvider } from "@/features/auth";

type Props = {
  children: React.ReactNode;
};

/**
 * Root provider component that wraps the application with all necessary providers.
 * Order matters - ErrorBoundary should be outermost to catch errors from any provider.
 */
export function AppProviders({ children }: Props) {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
