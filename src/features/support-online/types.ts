export type SupportOnlineItem = {
  id: number;
  name: string;
  link: string | null;
  phone: string | null;
  email: string | null;
  sort: number | null;
  status: number; // 0 = hidden, 1 = visible
  style?: number | null;
  language?: string | null;
};

export type GetSupportOnlineListResponse = {
  success: boolean;
  data: {
    items: SupportOnlineItem[];
    page: number;
    pageSize: number;
    total: number;
  };
  message?: string;
};

export type GetSupportOnlineResponse = {
  success: boolean;
  data: SupportOnlineItem;
  message?: string;
};

export type CreateSupportOnlineRequest = {
  name: string;
  link?: string | null;
  phone?: string | null;
  email?: string | null;
  sort?: number | null;
  status?: number;
  language?: string | null;
};

export type UpdateSupportOnlineRequest = {
  name?: string;
  link?: string | null;
  phone?: string | null;
  email?: string | null;
  sort?: number | null;
  status?: number;
  language?: string | null;
};
