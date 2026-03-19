import { QueryClient } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Thời gian data được coi là fresh (không refetch)
        staleTime: 60 * 1000, // 1 phút
        // Thời gian cache được giữ sau khi không còn component nào subscribe
        gcTime: 5 * 60 * 1000, // 5 phút
        // Retry failed requests
        retry: 1,
        // Không refetch khi window focus (có thể bật nếu cần)
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Retry mutations
        retry: 0,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  // Server: always create a new query client
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  // Browser: create once and reuse
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
