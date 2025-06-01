export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface DecodedToken {
  id: string;
  username: string;
  email: string;
  roles: number[];
} 