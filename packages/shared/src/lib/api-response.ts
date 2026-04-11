export interface ApiResponse<T> {
  data: T;
  timestamp: string;
  error?: string;
}
