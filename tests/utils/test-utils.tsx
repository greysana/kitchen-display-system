/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ReactNode } from "react";
import { render as rtlRender, RenderOptions } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  KDSOrder,
  Stage,
  Table,
  Order,
  ProductOrdered,
  OrderItem,
} from "@/types/types";

// Mock WebSocket
export class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  public readyState = MockWebSocket.OPEN;
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private messageQueue: any[] = [];

  constructor(public url: string) {
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
    }, 0);
  }

  send(data: string) {
    this.messageQueue.push(JSON.parse(data));
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent("close"));
    }
  }

  // Test helper to simulate receiving messages
  simulateMessage(message: any) {
    if (this.onmessage) {
      this.onmessage(
        new MessageEvent("message", { data: JSON.stringify(message) })
      );
    }
  }

  // Test helper to get sent messages
  getSentMessages() {
    return this.messageQueue;
  }
}

// Mock fetch globally
global.fetch = jest.fn();

// Mock WebSocket globally
(global as any).WebSocket = MockWebSocket;

// Helper to reset all mocks
export const resetAllMocks = () => {
  jest.clearAllMocks();
  (global.fetch as jest.Mock).mockReset();
};

// ============================================================================
// Factory functions for creating mock data
// ============================================================================

export const createMockStage = (overrides: Partial<Stage> = {}): Stage => ({
  id: Math.floor(Math.random() * 1000),
  name: "New",
  holding_time: 10,
  last_stage: false,
  cancel_stage: false,
  ...overrides,
});

export const createMockTable = (overrides: Partial<Table> = {}): Table => ({
  id: Math.floor(Math.random() * 1000),
  floor_id: [1, "Main Floor"],
  ...overrides,
});

export const createMockOrderItem = (
  overrides: Partial<OrderItem> = {}
): OrderItem => ({
  ordered_prod_id: Math.floor(Math.random() * 1000),
  product_id: Math.floor(Math.random() * 1000),
  quantity: 1,
  order_id: 1,
  product_name: "Test Product",
  note: "",
  ...overrides,
});

export const createMockKDSOrder = (
  overrides: Partial<KDSOrder> = {}
): KDSOrder => ({
  _id: `kds-${Math.random().toString(36).substr(2, 9)}`,
  order_id: Math.floor(Math.random() * 1000),
  order_name: `Order-${Math.floor(Math.random() * 1000)}`,
  order_date: new Date().toISOString(),
  cancelled: false,
  ref_ticket: `T${Math.floor(Math.random() * 10000)}`,
  take_away: false,
  seat_id: "MF Seat 1",
  customer_count: 2,
  ref_id: `REF-${Math.floor(Math.random() * 1000)}`,
  items: [createMockOrderItem()],
  stage: "new",
  state: "draft",
  duration: 0,
  row_pos: 0,
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockOrder = (overrides: Partial<Order> = {}): Order => ({
  id: Math.floor(Math.random() * 1000),
  name: `Order-${Math.floor(Math.random() * 1000)}`,
  date_order: new Date().toISOString(),
  write_date: new Date().toISOString(),
  state: "draft",
  stage: "new",
  table_id: [1, "Table 1"],
  tracking_number: `T${Math.floor(Math.random() * 10000)}`,
  take_away: false,
  customer_count: 2,
  pos_reference: `POS-${Math.floor(Math.random() * 1000)}`,
  lines: [],
  ...overrides,
});

export const createMockProductOrdered = (
  overrides: Partial<ProductOrdered> = {}
): ProductOrdered => ({
  id: Math.floor(Math.random() * 1000),
  product_id: [1],
  qty: 1,
  full_product_name: "Test Product",
  customer_note: "",
  ...overrides,
});

// ============================================================================
// Utility functions for creating multiple mock items
// ============================================================================

export const createMockStages = (
  count: number,
  overrides: Partial<Stage> = {},
  options: { makeFinal?: boolean; startId?: number } = {}
): Stage[] => {
  const { makeFinal = true, startId = 1 } = options;

  return Array.from({ length: count }, (_, i) =>
    createMockStage({
      id: startId + i,
      name: ["New", "Preparing", "Ready", "Completed"][i] || `Stage ${startId + i}`,
      last_stage: makeFinal ? i === count - 1 : false,
      ...overrides,
    })
  );
};  


export const createMockTables = (
  count: number,
  overrides: Partial<Table> = {}
): Table[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockTable({
      id: i + 1,
      ...overrides,
    })
  );
};

export const createMockKDSOrders = (
  count: number,
  overrides: Partial<KDSOrder> = {}
): KDSOrder[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockKDSOrder({
      order_id: i + 1,
      order_name: `Order-${i + 1}`,
      row_pos: i,
      ...overrides,
    })
  );
};

export const createMockOrders = (
  count: number,
  overrides: Partial<Order> = {}
): Order[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockOrder({
      id: i + 1,
      name: `Order-${i + 1}`,
      ...overrides,
    })
  );
};

// ============================================================================
// Utility functions for specific scenarios
// ============================================================================

export const createOrdersInStage = (
  stageName: string,
  count: number
): KDSOrder[] => {
  return createMockKDSOrders(count, { stage: stageName });
};

export const createCompletedOrder = (
  overrides: Partial<KDSOrder> = {}
): KDSOrder => {
  return createMockKDSOrder({
    state: "done",
    stage: "completed",
    ...overrides,
  });
};

export const createCancelledOrder = (
  overrides: Partial<KDSOrder> = {}
): KDSOrder => {
  return createMockKDSOrder({
    state: "cancel",
    cancelled: true,
    stage: "cancelled",
    ...overrides,
  });
};

// ============================================================================
// API Mock Utilities
// ============================================================================

// Utility to mock successful API responses
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockSuccessfulFetch = (data: any) => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  });
};

// Utility to mock failed API responses
export const mockFailedFetch = (status = 500, message = "Server error") => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status,
    text: async () => message,
    json: async () => ({ error: message }),
  });
};

// Utility to mock pending API responses
export const mockPendingFetch = () => {
  (global.fetch as jest.Mock).mockImplementationOnce(
    () =>
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              ok: true,
              json: async () => ({}),
            }),
          100
        )
      )
  );
};

// ============================================================================
// KDS Service Mock Utilities
// ============================================================================

export const mockKDSServiceGetKDS = (orders: KDSOrder[] = []) => {
  mockSuccessfulFetch(orders);
};

export const mockKDSServiceGetStages = (stages: Stage[] = []) => {
  mockSuccessfulFetch(stages);
};

export const mockKDSServiceGetTables = (tables: Table[] = []) => {
  mockSuccessfulFetch(tables);
};

export const mockKDSServiceUpdateKDS = (
  updatedOrder: Partial<KDSOrder> = {}
) => {
  mockSuccessfulFetch({ success: true, data: updatedOrder });
};

export const mockKDSServiceUpdateOrderState = (state: string) => {
  mockSuccessfulFetch({ success: true, state });
};

// ============================================================================
// WebSocket Mock Utilities
// ============================================================================

export const createMockWebSocketMessage = (type: string, data: any = {}) => {
  const messages = {
    new_order: {
      type: "new_order",
      order_id: data.order_id || 1,
      timestamp: data.timestamp || new Date().toISOString(),
    },
    kds_stage_update: {
      type: "kds_stage_update",
      kds_id: data.kds_id || "kds-1",
      stage: data.stage || "preparing",
      timestamp: data.timestamp || new Date().toISOString(),
    },
    order_update: {
      type: "order_update",
      order_id: data.order_id || 1,
      state: data.state,
      cancelled: data.cancelled,
      ref_ticket: data.ref_ticket,
      timestamp: data.timestamp || new Date().toISOString(),
    },
    kds_update: {
      type: "kds_update",
      kds_id: data.kds_id || "kds-1",
      stage: data.stage || "preparing",
      timestamp: data.timestamp || new Date().toISOString(),
    },
  };

  return messages[type as keyof typeof messages] || { type, ...data };
};

// ============================================================================
// Custom render options
// ============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  initialStages?: Stage[];
  initialOrders?: KDSOrder[];
}
// Main render function
export function renderWithProviders(
  ui: React.ReactElement,
  { ...renderOptions }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <>{children}</>;
  }

  return {
    ...rtlRender(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// ============================================================================
// Test Data Helpers
// ============================================================================

export const createTodayOrders = (count: number): KDSOrder[] => {
  const today = new Date().toISOString().split("T")[0];
  return createMockKDSOrders(count, {
    order_date: `${today} 12:00:00`,
  });
};

export const createOrdersWithItems = (
  orderCount: number,
  itemsPerOrder: number
): KDSOrder[] => {
  return Array.from({ length: orderCount }, (_, i) => {
    const items = Array.from({ length: itemsPerOrder }, (_, j) =>
      createMockOrderItem({
        ordered_prod_id: i * 100 + j,
        product_name: `Product ${j + 1}`,
        quantity: Math.floor(Math.random() * 3) + 1,
      })
    );

    return createMockKDSOrder({
      order_id: i + 1,
      items,
    });
  });
};

export const createGroupedOrders = (
  stages: Stage[]
): Record<string, KDSOrder[]> => {
  const grouped: Record<string, KDSOrder[]> = {};

  stages.forEach((stage, index) => {
    const stageName = stage.name.toLowerCase();
    grouped[stageName] = createMockKDSOrders(
      Math.floor(Math.random() * 5) + 1,
      {
        stage: stageName,
        row_pos: index,
      }
    );
  });

  return grouped;
};

// ============================================================================
// Time and Date Utilities
// ============================================================================

export const getTodayDateString = (): string => {
  return new Date().toISOString().split("T")[0];
};

export const getYesterdayDateString = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
};

export const waitForAsync = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// ============================================================================
// Re-export everything from testing-library
// ============================================================================

export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
