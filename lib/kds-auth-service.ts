import { KDSUser, LoginResponse, LogoutResponse, OdooJsonRpcRequest, OdooJsonRpcResponse, VerifyResponse } from "@/types/auth.types";
const API_BASE_URL = "http://localhost:8073";

class KDSApiClient {
  public token: string | null = null;
  public user: KDSUser | null = null;

  /**
   * Initialize client with stored token (e.g., from localStorage)
   */
  init(): void {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('kds_token');
      const userStr = localStorage.getItem('kds_user');
      this.user = userStr ? JSON.parse(userStr) : null;
    }
  }

  /**
   * Save authentication data to localStorage
   */
  saveAuth(token: string, user: KDSUser): void {
    this.token = token;
    this.user = user;
    if (typeof window !== 'undefined') {
      localStorage.setItem('kds_token', token);
      localStorage.setItem('kds_user', JSON.stringify(user));
    }
  }

  /**
   * Clear authentication data
   */
  clearAuth(): void {
    this.token = null;
    this.user = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('kds_token');
      localStorage.removeItem('kds_user');
    }
  }

  /**
   * Get current user info
   */
  getUser(): KDSUser | null {
    return this.user;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    return this.user?.roles?.includes(role) || false;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    return this.user?.permissions?.[permission] || false;
  }

  /**
   * Login to KDS API
   * @param login - User email/login
   * @param password - User password
   * @returns Login response
   */
  async login(login: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/kds/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            login,
            password,
          },
        } as OdooJsonRpcRequest),
      });

      const data: OdooJsonRpcResponse<LoginResponse> = await response.json();
      
      if (data.error) {
        throw new Error(data.error.data?.message || 'Login failed');
      }

      const result = data.result!;

      if (result.success && result.token && result.user) {
        this.saveAuth(result.token, result.user);
        return result;
      } else {
        throw new Error(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout from KDS API
   * @returns Logout response
   */
  async logout(): Promise<LogoutResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/kds/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Token': this.token || '',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {},
        } as OdooJsonRpcRequest),
      });

      const data: OdooJsonRpcResponse<LogoutResponse> = await response.json();
      
      if (data.error) {
        throw new Error(data.error.data?.message || 'Logout failed');
      }

      const result = data.result!;
      this.clearAuth();
      
      return result;
    } catch (error) {
      console.error('Logout error:', error);
      // Clear auth even if request fails
      this.clearAuth();
      throw error;
    }
  }

  /**
   * Verify current token
   * @returns Verification response
   */
  async verifyToken(): Promise<VerifyResponse> {
    try {
      if (!this.token) {
        return { valid: false, error: 'No token found' };
      }

      const response = await fetch(`${API_BASE_URL}/api/kds/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Token': this.token,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {},
        } as OdooJsonRpcRequest),
      });

      const data: OdooJsonRpcResponse<VerifyResponse> = await response.json();
      
      if (data.error) {
        throw new Error(data.error.data?.message || 'Verification failed');
      }

      const result = data.result!;

      if (result.valid && result.user) {
        // Update user info with latest data
        this.user = result.user;
        if (typeof window !== 'undefined') {
          localStorage.setItem('kds_user', JSON.stringify(result.user));
        }
      } else {
        this.clearAuth();
      }

      return result;
    } catch (error) {
      console.error('Token verification error:', error);
      this.clearAuth();
      throw error;
    }
  }

  /**
   * Generic authenticated request
   * @param endpoint - API endpoint
   * @param params - Request parameters
   * @returns API response
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async request<T = any>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    try {
      if (!this.token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Token': this.token,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params,
        } as OdooJsonRpcRequest),
      });

      const data: OdooJsonRpcResponse<T> = await response.json();
      
      if (data.error) {
        // Check if it's an authentication error
        if (data.error.code === 100 || data.error.message?.includes('Invalid token')) {
          this.clearAuth();
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(data.error.data?.message || 'Request failed');
      }

      return data.result!;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const kdsApi = new KDSApiClient();

// Initialize on import (client-side only)
if (typeof window !== 'undefined') {
  kdsApi.init();
}

export default kdsApi;