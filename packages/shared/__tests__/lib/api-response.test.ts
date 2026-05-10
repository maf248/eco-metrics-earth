import type { ApiResponse } from '../../src/lib/api-response';

describe('ApiResponse', () => {
  it('should narrow to data when success is true', () => {
    const response: ApiResponse<number> = { success: true, data: 42, status: 200 };
    expect(response.success).toBe(true);
    if (response.success) {
      expect(response.data).toBe(42);
    }
  });

  it('should narrow to error when success is false', () => {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Something went wrong',
      status: 500,
    };
    expect(response.success).toBe(false);
    if (!response.success) {
      expect(response.error).toBe('Something went wrong');
    }
  });

  it('should have status on the success branch', () => {
    const response: ApiResponse<string> = { success: true, data: 'ok', status: 200 };
    expect(response.status).toBe(200);
  });

  it('should have status on the error branch', () => {
    const response: ApiResponse<never> = { success: false, error: 'Not found', status: 404 };
    expect(response.status).toBe(404);
  });
});
