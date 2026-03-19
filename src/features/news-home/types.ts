export type NewsHomeItem = {
  newsId: number;
  newsName: string | null;
  newsImage: string | null;
  sort: number | null;
  status: number | null;
  dateAdded: string | null;
};

export type GetNewsHomeListResponse = {
  success: boolean;
  data: NewsHomeItem[];
};

export type UpdateNewsHomeRequest = {
  sort?: number | null;
  status?: number | null;
};

export type AddNewsToHomeRequest = {
  sort?: number | null;
  status?: number | null;
};

export type BatchAddNewsHomeItem = {
  newsId: number;
  sort?: number | null;
  status?: number | null;
};

export type AddNewsListToHomeRequest = {
  newsItems: BatchAddNewsHomeItem[];
};
