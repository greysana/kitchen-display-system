/* eslint-disable @typescript-eslint/no-explicit-any */

// Types
export interface KDSUser {
  id: number;
  name: string;
  login: string;
  email: string;
  roles: string[];
  permissions: {
    can_view_orders: boolean;
    can_update_orders: boolean;
    can_manage_config: boolean;
    can_manage_tokens: boolean;
    can_view_all_stations: boolean;
    [key: string]: boolean;
  };
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: KDSUser;
  expires_at?: string;
  error?: string;
}

export interface LogoutResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface VerifyResponse {
  valid: boolean;
  user?: KDSUser;
  error?: string;
}

export interface OdooJsonRpcRequest {
  jsonrpc: string;
  method: string;
  params: Record<string, any>;
}

export interface OdooJsonRpcResponse<T = any> {
  jsonrpc?: string;
  id?: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: {
      message?: string;
    };
  };
}

