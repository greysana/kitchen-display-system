import { KDSOrder, Stage, Table } from "@/types/types";

export class KDSService {
  private static baseURL = process.env.BASE_URL ?? "http://localhost:8073";
  private static odooURL = process.env.ODOO_URL ?? "http://localhost:8073";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static CACHE_DURATION = 30000;

  private static async fetchWithCache(url: string, options?: RequestInit) {
    const cacheKey = `${url}_${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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

  // KDS Operations
  static async getKDS(): Promise<KDSOrder[]> {
    const url = `${this.baseURL}/api/kds`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  static async updateKDS(id: string, updates: Partial<KDSOrder>) {
    console.log("Updating KDS order:", id, updates);

    const updatePayload = this.transformForOdoo(updates);
    console.log("Update payload:", updatePayload);

    const response = await fetch(`${this.baseURL}/api/kds/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatePayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Update KDS error:", errorText);
      throw new Error(
        `Failed to update KDS: ${response.status} - ${errorText}`
      );
    }

    this.clearCache();
    return response.json();
  }

  static async deleteKDS(id: string) {
    console.log("Deleting KDS order:", id);

    const response = await fetch(`${this.baseURL}/api/kds/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Delete KDS error:", errorText);
      throw new Error(
        `Failed to delete KDS: ${response.status} - ${errorText}`
      );
    }

    this.clearCache();
    return response.json();
  }

  // Order State Operations
  static async updateOrderState(orderId: number, state: string) {
    console.log("Updating order state:", orderId, state);

    const response = await fetch(`${this.odooURL}/update-order-state`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: orderId,
        state: state,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Update order state error:", errorText);
      throw new Error(`Failed to update order state: ${response.status}`);
    }

    this.clearCache();
    return response.json();
  }

  // Supporting Data
  static async getStages(): Promise<Stage[]> {
    return this.fetchWithCache(`${this.odooURL}/get-stages`);
  }

  static async getTables(): Promise<Table[]> {
    return this.fetchWithCache(`${this.odooURL}/get-tables`);
  }
}