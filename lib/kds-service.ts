import { KDSOrder, Stage, Table } from "@/types/types";

export class KDSService {
  private static baseURL = process.env.BASE_URL ?? "http://localhost:8073";
  private static odooURL = process.env.ODOO_URL ?? "http://localhost:8073";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static CACHE_DURATION = 30000;

  /**
   * Get authentication headers with token
   */
  private static getAuthHeaders(token?: string): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["X-API-Token"] = token;
    }

    return headers;
  }

  private static async fetchWithCache(
    url: string,
    token?: string,
    options?: RequestInit
  ) {
    const cacheKey = `${url}_${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        ...this.getAuthHeaders(token),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please login again.");
      }
      if (response.status === 403) {
        throw new Error("You do not have permission to access this resource.");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  static clearCache() {
    this.cache.clear();
  }

  /**
   * Transform KDSOrder data for Odoo API updates
   */
  private static transformForOdoo(updates: Partial<KDSOrder>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {};

    if (updates.stage !== undefined) {
      payload.stage = updates.stage;
    }
    if (updates.row_pos !== undefined) {
      payload.row_pos = updates.row_pos;
    }
    if (updates.state !== undefined) {
      payload.state = updates.state;
    }
    if (updates.items !== undefined) {
      payload.items = updates.items.map((item) => ({
        ordered_prod_id: item.ordered_prod_id,
        product_name: item.product_name || "",
        quantity: item.quantity || 1,
        note: item.note || "",
      }));
    }
    if (updates.ref_ticket !== undefined) {
      payload.ref_ticket =
        updates.ref_ticket !== "false" ? updates.ref_ticket : undefined;
    }

    return payload;
  }

  // ========================================================================
  // KDS OPERATIONS - ALL NOW REQUIRE TOKEN
  // ========================================================================

  /**
   * Get all KDS orders for today
   * @param token - Authentication token from login
   */
  static async getKDS(token: string): Promise<KDSOrder[]> {
    const url = `${this.baseURL}/api/kds`;

    const response = await fetch(url, {
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please login again.");
      }
      if (response.status === 403) {
        throw new Error("You do not have permission to access KDS orders.");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get all KDS orders (no date filter)
   * @param token - Authentication token from login
   */
  static async getAllKDS(token: string): Promise<KDSOrder[]> {
    const url = `${this.baseURL}/api/kds/all`;

    const response = await fetch(url, {
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please login again.");
      }
      if (response.status === 403) {
        throw new Error("You do not have permission to access KDS orders.");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Update a KDS order
   * @param id - KDS order ID
   * @param updates - Partial KDS order data to update
   * @param token - Authentication token from login
   */
  static async updateKDS(
    id: string,
    updates: Partial<KDSOrder>,
    token: string
  ) {
    console.log("Updating KDS order:", id, updates);

    const updatePayload = this.transformForOdoo(updates);
    console.log("Update payload:", updatePayload);

    const response = await fetch(`${this.baseURL}/api/kds/${id}`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(updatePayload),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please login again.");
      }
      if (response.status === 403) {
        throw new Error("You do not have permission to update KDS orders.");
      }
      const errorText = await response.text();
      console.error("Update KDS error:", errorText);
      throw new Error(
        `Failed to update KDS: ${response.status} - ${errorText}`
      );
    }

    this.clearCache();
    return response.json();
  }

  /**
   * Delete a KDS order
   * @param id - KDS order ID
   * @param token - Authentication token from login
   */
  static async deleteKDS(id: string, token: string) {
    console.log("Deleting KDS order:", id);

    const response = await fetch(`${this.baseURL}/api/kds/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please login again.");
      }
      if (response.status === 403) {
        throw new Error("You do not have permission to delete KDS orders.");
      }
      const errorText = await response.text();
      console.error("Delete KDS error:", errorText);
      throw new Error(
        `Failed to delete KDS: ${response.status} - ${errorText}`
      );
    }

    this.clearCache();
    return response.json();
  }

  // ========================================================================
  // ORDER STATE OPERATIONS
  // ========================================================================

  /**
   * Update POS order state
   * @param orderId - POS order ID
   * @param state - New state (e.g., 'done', 'cancel')
   * @param token - Authentication token from login
   */
  static async updateOrderState(
    orderId: number,
    state: string,
    token: string
  ) {
    console.log("Updating order state:", orderId, state);

    const response = await fetch(`${this.odooURL}/update-order-state`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({
        id: orderId,
        state: state,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please login again.");
      }
      if (response.status === 403) {
        throw new Error("You do not have permission to update order state.");
      }
      const errorText = await response.text();
      console.error("Update order state error:", errorText);
      throw new Error(`Failed to update order state: ${response.status}`);
    }

    this.clearCache();
    return response.json();
  }

  // ========================================================================
  // SUPPORTING DATA - ALL NOW REQUIRE TOKEN
  // ========================================================================

  /**
   * Get KDS stages
   * @param token - Authentication token from login
   */
  static async getStages(token: string): Promise<Stage[]> {
    return this.fetchWithCache(`${this.odooURL}/get-stages`, token);
  }

  /**
   * Get restaurant tables
   * @param token - Authentication token from login
   */
  static async getTables(token: string): Promise<Table[]> {
    return this.fetchWithCache(`${this.odooURL}/get-tables`, token);
  }

  // ========================================================================
  // AUTHENTICATION METHODS
  // ========================================================================

  /**
   * Login to KDS system
   * @param login - User login/email
   * @param password - User password
   * @returns Authentication response with token and user info
   */
  static async login(login: string, password: string) {
    const response = await fetch(`${this.baseURL}/api/kds/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: {
          login,
          password,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Login failed");
    }

    return data;
  }

  /**
   * Logout from KDS system
   * @param token - Authentication token to invalidate
   */
  static async logout(token: string) {
    const response = await fetch(`${this.baseURL}/api/kds/logout`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error(`Logout failed: ${response.status}`);
    }

    this.clearCache();
    return response.json();
  }

  /**
   * Verify if token is still valid
   * @param token - Authentication token to verify
   */
  static async verifyToken(token: string) {
    const response = await fetch(`${this.baseURL}/api/kds/verify`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error(`Token verification failed: ${response.status}`);
    }

    return response.json();
  }
}