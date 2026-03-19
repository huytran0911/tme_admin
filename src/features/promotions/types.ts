// Promotion list item (matches API PromotionListItemResponse)
export type Promotion = {
  id: number;
  name: string | null;
  nameEn: string | null;
  applyFrom: string;
  applyTo: string;
  saleOff: number;
  isPercent: boolean;
  freeTransportFee: boolean;
  applyForTotal: number;
  forever: boolean;
  popup: boolean;
  status: string | null;
  createdAt: string;
};

// Promotion detail (matches API PromotionDetailResponse)
export type PromotionDetail = {
  id: number;
  name: string | null;
  nameEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  content: string | null;
  contentEn: string | null;
  applyFrom: string;
  applyTo: string;
  saleOff: number;
  isPercent: boolean;
  freeTransportFee: boolean;
  applyForTotal: number;
  sort: number;
  forever: boolean;
  popup: boolean;
  image: string | null;
  point: number;
  menu: boolean;
  status: string | null;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

// Create promotion request (matches API CreatePromotionRequest)
export type CreatePromotionRequest = {
  name?: string | null;
  nameEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  content?: string | null;
  contentEn?: string | null;
  applyFrom: string;
  applyTo: string;
  saleOff: number;
  isPercent: boolean;
  freeTransportFee: boolean;
  applyForTotal: number;
  sort: number;
  forever: boolean;
  popup: boolean;
  image?: string | null;
  point: number;
  menu: boolean;
};

// Update promotion request (same as create)
export type UpdatePromotionRequest = CreatePromotionRequest;

// Get promotions params
export type GetPromotionsParams = {
  Keyword?: string;
  Page?: number;
  PageSize?: number;
};

// Paged result
export type PagedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
