export type NewsStatus = "draft" | "published" | "archived";

export interface NewsItem {
  id: number;
  title: string;
  slug: string;
  summary?: string;
  contentHtml: string;
  status: NewsStatus;
  category?: string;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewsListResponse {
  items: NewsItem[];
  total: number;
  page: number;
  pageSize: number;
}
