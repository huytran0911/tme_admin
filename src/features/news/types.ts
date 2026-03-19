/**
 * News feature type definitions
 * Based on swagger_admin.json schemas
 */

// News list item returned from API
export interface NewsListItem {
  id: number;
  name: string;
  nameEn: string | null;
  image: string | null;
  status: number;
  typeNews: string | null;
  sort: number;
  view: number;
  dateAdded: string;
}

// Full news detail returned from API
export interface NewsDetail {
  id: number;
  name: string;
  nameEn: string | null;
  image: string | null;
  shortDescription: string | null;
  shortDescriptionEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  status: number;
  typeNews: string | null;
  sort: number;
  view: number;
  dateAdded: string;
}

// Request payload for creating news
export interface CreateNewsRequest {
  name: string;
  nameEn?: string | null;
  image?: string | null;
  status: number;
  shortDescription?: string | null;
  shortDescriptionEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  typeNews?: string | null;
  sort: number;
}

// Request payload for updating news
export interface UpdateNewsRequest {
  name: string;
  nameEn?: string | null;
  image?: string | null;
  status: number;
  shortDescription?: string | null;
  shortDescriptionEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  typeNews?: string | null;
  sort: number;
}

// Request payload for inline update (sort/status only)
export interface UpdateNewsInlineRequest {
  sort?: number;
  status?: number;
}

// Query parameters for fetching news list
export interface NewsListParams {
  Keyword?: string;
  Status?: number;
  TypeNews?: string;
  Page?: number;
  PageSize?: number;
}

// News status enum
export const NewsStatus = {
  ACTIVE: 0,
  HIDDEN: 1,
} as const;

export type NewsStatusType = (typeof NewsStatus)[keyof typeof NewsStatus];

// Status labels for display
export const NewsStatusLabels: Record<number, string> = {
  [NewsStatus.ACTIVE]: "Hiển thị",
  [NewsStatus.HIDDEN]: "Ẩn",
};
