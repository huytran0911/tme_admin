export type AdminSlide = {
  id: number;
  name: string;
  content?: string;
  image?: string;
  url?: string;
  sort?: number;
  groupId?: number;
  groupName?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type SlideInput = {
  name: string;
  content?: string;
  image?: string;
  url?: string;
  sort?: number;
  groupId?: number;
};

export type GetSlideListParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  groupId?: number;
};

export type PagedSlideResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
};
