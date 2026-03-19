export type Category = {
  id: number;
  name: string;
  nameEn: string | null;
  groupId: number | null;
  groupName?: string | null;
  parentId: number;
  sortOrder: number;
  status: number | null;
  isActive: boolean;
  price2point: number;
};

export type CategoryDetail = {
  id: number;
  name: string | null;
  nameEn: string | null;
  content: string | null;
  contentEn: string | null;
  image: string | null;
  groupId: number | null;
  parentId: number;
  sortOrder: number;
  displayType: number | null;
  groupKey: string | null;
  status: number | null;
  dateAdded: string | null;
  priceToPoint: number;
};

export type CreateCategoryRequest = {
  name: string;
  nameEn?: string | null;
  content?: string | null;
  contentEn?: string | null;
  image?: string | null;
  groupId: number;
  parentId: number;
  sortOrder: number;
  displayType?: number | null;
  status?: number | null;
  priceToPoint?: number;
};

export type UpdateCategoryRequest = {
  name?: string | null;
  nameEn?: string | null;
  content?: string | null;
  contentEn?: string | null;
  image?: string | null;
  groupId?: number | null;
  parentId?: number;
  sortOrder?: number;
  displayType?: number | null;
  isActive?: boolean;
  price2point?: number;
};

export type GetCategoryListParams = {
  Page?: number;
  PageSize?: number;
  Keyword?: string;
  GroupId?: number;
  ParentId?: number;
};

export type PagedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
