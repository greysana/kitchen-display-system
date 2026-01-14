/* eslint-disable @typescript-eslint/no-explicit-any */

import { Page, Route } from "@playwright/test";
import {
  mockLoginAPI,
  mockLogoutAPI,
  mockVerifyAPI,
  TEST_USERS,
  UserType,
} from "./auth.helper";

const API_BASE_URL = "http://localhost:8073";

/**
 * Mock all KDS-related API endpoints
 */
export async function mockAllKDSAPIs(
  page: Page,
  options: {
    validTokens?: string[];
    ordersData?: any[];
    stagesData?: any[];
    tablesData?: any[];
    delay?: number; // Add delay option
  } = {}
) {
  const {
    validTokens = [TEST_USERS.user.token],
    ordersData = [],
    stagesData = getDefaultStages(),
    tablesData = getDefaultTables(),
    delay = 0, // Default no delay
  } = options;

  // Mock main KDS endpoints (get orders)
  await mockKDSOrdersAPI(page, {
    validTokens,
    responseData: ordersData,
    delay,
  });

  // Mock Odoo direct endpoints
  await mockOdooStagesAPI(page, {
    validTokens,
    stagesData,
    delay,
  });

  await mockOdooTablesAPI(page, {
    validTokens,
    tablesData,
    delay,
  });

  // Mock stage update endpoint
  await mockStageUpdateAPI(page, {
    validTokens,
  });

  // Mock order state update
  await mockOrderStateUpdateAPI(page, {
    validTokens,
  });

  // Mock WebSocket connection (if applicable)
  await mockWebSocketConnection(page);
}

/**
 * Mock KDS orders API (/api/kds and /api/kds/all)
 */
export async function mockKDSOrdersAPI(
  page: Page,
  options: {
    requireAuth?: boolean;
    validTokens?: string[];
    responseData?: any[];
    statusCode?: number;
    errorCode?: number;
    errorMessage?: string;
    delay?: number;
  } = {}
) {
  const {
    requireAuth = true,
    validTokens = [TEST_USERS.user.token],
    responseData = [],
    statusCode = 200,
    errorCode,
    errorMessage,
    delay = 0,
  } = options;

  // Mock both /api/kds and /api/kds/all
  const endpoints = [`${API_BASE_URL}/api/kds`, `${API_BASE_URL}/api/kds/all`];

  for (const endpoint of endpoints) {
    await page.route(endpoint, async (route: Route) => {
      const headers = route.request().headers();
      const token = headers["x-api-token"] || headers["authorization"]?.replace("Bearer ", "");

      // Add delay if specified
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Check authentication
      if (requireAuth) {
        if (!token) {
          await route.fulfill({
            status: 401,
            contentType: "application/json",
            body: JSON.stringify({
              jsonrpc: "2.0",
              error: {
                code: 100,
                message: "Authentication required",
                data: {
                  message: "No authentication token provided",
                },
              },
            }),
          });
          return;
        }

        if (!validTokens.includes(token)) {
          await route.fulfill({
            status: 401,
            contentType: "application/json",
            body: JSON.stringify({
              jsonrpc: "2.0",
              error: {
                code: 100,
                message: "Invalid token",
                data: {
                  message: "Invalid authentication token",
                },
              },
            }),
          });
          return;
        }
      }

      // Return error if specified
      if (errorCode && errorMessage) {
        await route.fulfill({
          status: statusCode,
          contentType: "application/json",
          body: JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: errorCode,
              message: errorMessage,
              data: {
                message: errorMessage,
              },
            },
          }),
        });
        return;
      }

      // Return successful response
      await route.fulfill({
        status: statusCode,
        contentType: "application/json",
        body: JSON.stringify(responseData),
      });
    });
  }
}

/**
 * Mock Odoo stages endpoint (GET /get-stages)
 */
export async function mockOdooStagesAPI(
  page: Page,
  options: {
    requireAuth?: boolean;
    validTokens?: string[];
    stagesData?: any[];
    delay?: number;
  } = {}
) {
  const {
    requireAuth = true,
    validTokens = [TEST_USERS.user.token],
    stagesData = getDefaultStages(),
    delay = 0,
  } = options;

  await page.route(`${API_BASE_URL}/get-stages`, async (route: Route) => {
    const headers = route.request().headers();
    const token = headers["x-api-token"] || headers["authorization"]?.replace("Bearer ", "");

    // Add delay if specified
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    if (requireAuth && (!token || !validTokens.includes(token))) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Unauthorized",
          message: "Invalid or missing authentication token",
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(stagesData),
    });
  });
}

/**
 * Mock Odoo tables endpoint (GET /get-tables)
 */
export async function mockOdooTablesAPI(
  page: Page,
  options: {
    requireAuth?: boolean;
    validTokens?: string[];
    tablesData?: any[];
    delay?: number;
  } = {}
) {
  const {
    requireAuth = true,
    validTokens = [TEST_USERS.user.token],
    tablesData = getDefaultTables(),
    delay = 0,
  } = options;

  await page.route(`${API_BASE_URL}/get-tables`, async (route: Route) => {
    const headers = route.request().headers();
    const token = headers["x-api-token"] || headers["authorization"]?.replace("Bearer ", "");

    // Add delay if specified
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    if (requireAuth && (!token || !validTokens.includes(token))) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Unauthorized",
          message: "Invalid or missing authentication token",
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(tablesData),
    });
  });
}

/**
 * Mock stage update API (POST /api/kds/stage or /api/kds/:id)
 */
export async function mockStageUpdateAPI(
  page: Page,
  options: {
    requireAuth?: boolean;
    validTokens?: string[];
    onUpdate?: (data: any) => void;
    shouldFail?: boolean;
  } = {}
) {
  const {
    requireAuth = true,
    validTokens = [TEST_USERS.user.token],
    onUpdate,
    shouldFail = false,
  } = options;

  // Mock both /api/kds/stage and /api/kds/:id patterns
  await page.route(`${API_BASE_URL}/api/kds/**`, async (route: Route) => {
    // Only handle POST requests (updates)
    if (route.request().method() !== "POST" && route.request().method() !== "DELETE") {
      return route.continue();
    }

    const headers = route.request().headers();
    const token = headers["x-api-token"] || headers["authorization"]?.replace("Bearer ", "");

    if (requireAuth && (!token || !validTokens.includes(token))) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: 100,
            message: "Unauthorized",
            data: {
              message: "Invalid or missing authentication token",
            },
          },
        }),
      });
      return;
    }

    const postData = route.request().postDataJSON?.() || {};
    const params = postData?.params || postData;

    if (onUpdate) {
      onUpdate(params);
    }

    if (shouldFail) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: 500,
            message: "Internal Server Error",
            data: {
              message: "Failed to update stage",
            },
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: params,
      }),
    });
  });
}

/**
 * Mock order state update API (POST /update-order-state)
 */
export async function mockOrderStateUpdateAPI(
  page: Page,
  options: {
    requireAuth?: boolean;
    validTokens?: string[];
    onUpdate?: (data: any) => void;
    shouldFail?: boolean;
  } = {}
) {
  const {
    requireAuth = true,
    validTokens = [TEST_USERS.user.token],
    onUpdate,
    shouldFail = false,
  } = options;

  await page.route(`${API_BASE_URL}/update-order-state`, async (route: Route) => {
    const headers = route.request().headers();
    const token = headers["x-api-token"] || headers["authorization"]?.replace("Bearer ", "");

    if (requireAuth && (!token || !validTokens.includes(token))) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Unauthorized",
          message: "Invalid or missing authentication token",
        }),
      });
      return;
    }

    const postData = route.request().postDataJSON?.() || {};

    if (onUpdate) {
      onUpdate(postData);
    }

    if (shouldFail) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to update order state",
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: postData,
      }),
    });
  });
}

/**
 * Mock authenticated KDS API with JSON-RPC format (DEPRECATED - use mockKDSOrdersAPI)
 */
export async function mockAuthenticatedKDSAPI(
  page: Page,
  options: {
    requireAuth?: boolean;
    validTokens?: string[];
    responseData?: any[];
    statusCode?: number;
    errorCode?: number;
    errorMessage?: string;
  } = {}
) {
  // Just call the new function for backward compatibility
  return mockKDSOrdersAPI(page, options);
}

/**
 * Mock WebSocket connection for real-time updates
 */
export async function mockWebSocketConnection(page: Page) {
  // Block actual WebSocket connections
  await page.route("ws://**", (route) => route.abort());
  await page.route("wss://**", (route) => route.abort());

  // Inject mock WebSocket behavior
  await page.addInitScript(() => {
    // Store original WebSocket
    const OriginalWebSocket = window.WebSocket;
    
    // Create mock WebSocket class
    class MockWebSocket extends EventTarget {
      public readyState = 1; // OPEN
      public url: string;
      public CONNECTING = 0;
      public OPEN = 1;
      public CLOSING = 2;
      public CLOSED = 3;

      constructor(url: string) {
        super();
        this.url = url;
        
        // Simulate connection opening
        setTimeout(() => {
          const openEvent = new Event("open");
          this.dispatchEvent(openEvent);
          if (this.onopen) this.onopen(openEvent);
        }, 100);
      }

      send(data: string) {
        console.log("Mock WebSocket send:", data);
      }

      close() {
        this.readyState = 3;
        const closeEvent = new CloseEvent("close");
        this.dispatchEvent(closeEvent);
        if (this.onclose) this.onclose(closeEvent);
      }

      onopen: ((ev: Event) => any) | null = null;
      onmessage: ((ev: MessageEvent) => any) | null = null;
      onerror: ((ev: Event) => any) | null = null;
      onclose: ((ev: CloseEvent) => any) | null = null;
    }

    // Replace WebSocket with mock
    (window as any).WebSocket = MockWebSocket;
  });
}

/**
 * Mock all API endpoints to prevent real connections
 */
export async function mockAllAPIEndpoints(page: Page, validTokens: string[] = [TEST_USERS.user.token]) {
  // Catch-all for any unmocked API endpoints - but don't interfere with specific mocks
  await page.route(`${API_BASE_URL}/**`, async (route: Route) => {
    const url = route.request().url();
    
    // Skip if already handled by specific mocks
    if (
      url.includes("/api/kds/login") ||
      url.includes("/api/kds/logout") ||
      url.includes("/api/kds/verify") ||
      url.includes("/api/kds/all") ||
      url.includes("/api/kds/stage") ||
      url.includes("/get-stages") ||
      url.includes("/get-tables") ||
      url.includes("/update-order-state")
    ) {
      return route.continue();
    }

    // Check if GET /api/kds (main endpoint)
    if (url === `${API_BASE_URL}/api/kds` && route.request().method() === "GET") {
      return route.continue();
    }

    const headers = route.request().headers();
    const token = headers["x-api-token"] || headers["authorization"]?.replace("Bearer ", "");

    // Check if it's an authenticated request
    if (!token || !validTokens.includes(token)) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Unauthorized",
          message: "Invalid or missing authentication token",
        }),
      });
      return;
    }

    // Default success response for unhandled endpoints
    console.log(`Unmocked API endpoint called: ${url}`);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {},
      }),
    });
  });
}

/**
 * Create mock orders
 */
export function createMockOrders(count: number, stage?: string) {
  const today = new Date().toISOString().split("T")[0];
  const stages = stage ? [stage] : ["new", "preparing", "ready", "completed"];

  return Array.from({ length: count }, (_, i) => ({
    _id: `order-${i}`,
    order_id: i + 1,
    seat_id: `T${Math.floor(i / 4) + 1}-S${(i % 4) + 1}`,
    stage: stages[i % stages.length],
    order_date: `${today} ${10 + Math.floor(i / 4)}:${(i % 60)
      .toString()
      .padStart(2, "0")}:00`,
    state: "draft",
    cancelled: false,
    items: [
      {
        product_name: `Item ${i}`,
        quantity: Math.floor(Math.random() * 3) + 1,
      },
    ],
    customer_count: Math.floor(Math.random() * 4) + 1,
    ref_ticket: `T${String(i + 1).padStart(3, "0")}`,
    row_pos: i,
    updatedAt: new Date().toISOString(),
  }));
}

/**
 * Get default stages configuration
 */
export function getDefaultStages() {
  return [
    {
      id: "new",
      name: "New",
      sequence: 1,
      color: "#3B82F6",
    },
    {
      id: "preparing",
      name: "Preparing",
      sequence: 2,
      color: "#F59E0B",
    },
    {
      id: "ready",
      name: "Ready",
      sequence: 3,
      color: "#10B981",
    },
    {
      id: "completed",
      name: "Completed",
      sequence: 4,
      color: "#6B7280",
    },
  ];
}

/**
 * Get default tables configuration
 */
export function getDefaultTables() {
  return Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: `Table ${i + 1}`,
    seats: 4,
    area: "Main",
  }));
}

/**
 * Mock all authentication-related APIs
 */
export async function setupAuthMocks(page: Page, userType: UserType = "user") {
  const user = TEST_USERS[userType];

  await mockLoginAPI(page);
  await mockVerifyAPI(page, [user.token]);
  await mockLogoutAPI(page);
}

/**
 * Complete setup for all mocks (auth + KDS)
 */
export async function setupAllMocks(
  page: Page,
  options: {
    userType?: UserType;
    ordersData?: any[];
    stagesData?: any[];
    tablesData?: any[];
    delay?: number;
  } = {}
) {
  const {
    userType = "user",
    ordersData = [],
    stagesData = getDefaultStages(),
    tablesData = getDefaultTables(),
    delay = 0,
  } = options;

  const user = TEST_USERS[userType];

  // Setup auth mocks
  await setupAuthMocks(page, userType);

  // Setup KDS mocks
  await mockAllKDSAPIs(page, {
    validTokens: [user.token],
    ordersData,
    stagesData,
    tablesData,
    delay,
  });

  // Block any unmocked endpoints - but do this LAST
  // await mockAllAPIEndpoints(page, [user.token]);
}

/**
 * Mock token expiration
 */
export async function mockTokenExpiration(page: Page) {
  await page.route(`${API_BASE_URL}/**`, async (route: Route) => {
    // Don't block login endpoint
    if (route.request().url().includes("/api/kds/login")) {
      return route.continue();
    }

    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Invalid token",
        message: "Token has expired. Please login again.",
      }),
    });
  });
}

/**
 * Mock permission denied
 */
export async function mockPermissionDenied(page: Page, endpoint: string) {
  await page.route(`${API_BASE_URL}${endpoint}`, async (route: Route) => {
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Forbidden",
        message: "You do not have permission to perform this action",
      }),
    });
  });
}

/**
 * Setup request interceptor to log all API calls
 */
export async function setupRequestLogger(page: Page) {
  const requests: Array<{
    url: string;
    method: string;
    headers: Record<string, string>;
    hasToken: boolean;
  }> = [];

  page.on("request", (request) => {
    if (request.url().includes(API_BASE_URL)) {
      const headers = request.headers();
      const token = headers["x-api-token"] || headers["authorization"]?.replace("Bearer ", "");
      requests.push({
        url: request.url(),
        method: request.method(),
        headers,
        hasToken: !!token,
      });
      console.log(`[API Request] ${request.method()} ${request.url()} - Token: ${token ? "✓" : "✗"}`);
    }
  });

  return requests;
}