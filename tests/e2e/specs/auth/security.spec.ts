// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { test, expect } from "@playwright/test";
// import {
//   loginUser,
//   loginUserProgrammatically,
//   TEST_USERS,
//   getAuthData,
//   clearAuthData,
// } from "../../helpers/auth.helper";
// import {
//   mockAuthenticatedKDSAPI,
//   createMockOrders,
// } from "../../helpers/api.helper";

// const KDS_URL = "http://localhost:3000/";
// const API_BASE_URL = "http://localhost:8073";

// test.describe("Security Tests", () => {
//   test.beforeEach(async ({ page }) => {
//     await page.context().clearCookies();
//     await clearAuthData(page);
//   });

//   test.describe("Authentication Security", () => {
//     test("should not expose sensitive data in localStorage", async ({
//       page,
//     }) => {
//       await loginUser(page, "user");

//       // Check localStorage for sensitive data
//       const localStorageData = await page.evaluate(() => {
//         const data: Record<string, string> = {};
//         for (let i = 0; i < localStorage.length; i++) {
//           const key = localStorage.key(i);
//           if (key) {
//             data[key] = localStorage.getItem(key) || "";
//           }
//         }
//         return data;
//       });

//       // Should not contain passwords
//       for (const value of Object.values(localStorageData)) {
//         expect(value.toLowerCase()).not.toContain("password");
//         expect(value.toLowerCase()).not.toContain("secret");
//         expect(value.toLowerCase()).not.toContain("private_key");
//       }

//       // Token should exist but be opaque
//       expect(localStorageData["kds_token"]).toBeTruthy();
//       console.log("Stored token:", localStorageData["kds_token"]);
//     });

//     test("should not allow API access without token", async ({ page }) => {
//       let apiCallAttempted = false;
//       let tokenPresent = false;

//       await page.route(`${API_BASE_URL}/api/kds`, async (route) => {
//         apiCallAttempted = true;
//         const headers = route.request().headers();
//         tokenPresent = !!headers["x-api-token"];

//         if (!tokenPresent) {
//           await route.fulfill({
//             status: 401,
//             contentType: "application/json",
//             body: JSON.stringify({
//               jsonrpc: "2.0",
//               error: {
//                 code: 100,
//                 message: "Authentication required",
//                 data: {
//                   message: "No authentication token provided",
//                 },
//               },
//             }),
//           });
//           return;
//         }

//         await route.continue();
//       });

//       // Try to access without logging in
//       await page.goto(KDS_URL);
//       await page.waitForTimeout(2000);

//       // Should redirect to login instead of making API call
//       await page.waitForURL(/.*login/, { timeout: 5000 });

//       console.log("API call attempted:", apiCallAttempted);
//       console.log("Token present:", tokenPresent);
//     });

//     test("should invalidate token on logout", async ({ page }) => {
//       await loginUser(page, "user");

//       // Get token before logout
//       const { token: tokenBefore } = await getAuthData(page);
//       expect(tokenBefore).toBeTruthy();

//       // Logout
//       await page.click('button:has-text("Logout")');
//       await page.waitForURL(/.*login/, { timeout: 5000 });

//       // Token should be cleared
//       const { token: tokenAfter } = await getAuthData(page);
//       expect(tokenAfter).toBeFalsy();
//     });

//     test("should reject requests with invalid token format", async ({
//       page,
//     }) => {
//       // Set malformed token
//       await page.addInitScript(() => {
//         localStorage.setItem("kds_token", "invalid.token.format");
//       });

//       await page.route(`${API_BASE_URL}/api/kds`, async (route) => {
//         const headers = route.request().headers();
//         const token = headers["x-api-token"];

//         // Validate token format
//         if (!token || !token.startsWith("mock-")) {
//           await route.fulfill({
//             status: 401,
//             contentType: "application/json",
//             body: JSON.stringify({
//               jsonrpc: "2.0",
//               error: {
//                 code: 100,
//                 message: "Invalid token format",
//                 data: {
//                   message: "Token validation failed",
//                 },
//               },
//             }),
//           });
//           return;
//         }

//         await route.continue();
//       });

//       await page.goto(KDS_URL);
//       await page.waitForTimeout(2000);

//       // Should redirect to login due to invalid token
//       const url = page.url();
//       expect(url.includes("login")).toBeTruthy();
//     });

//     test("should use secure headers in API requests", async ({ page }) => {
//       await loginUserProgrammatically(page, "user");

//       let requestHeaders: Record<string, string> = {};

//       await page.route(`${API_BASE_URL}/api/kds`, async (route) => {
//         requestHeaders = route.request().headers();
//         await route.fulfill({
//           status: 200,
//           contentType: "application/json",
//           body: JSON.stringify({
//             jsonrpc: "2.0",
//             result: [],
//           }),
//         });
//       });

//       await page.reload();
//       await page.waitForTimeout(2000);

//       // Verify proper headers
//       expect(requestHeaders["x-api-token"]).toBeTruthy();
//       expect(requestHeaders["content-type"]).toBe("application/json");
//     });

//     test("should prevent token leakage in URLs", async ({ page }) => {
//       await loginUserProgrammatically(page, "user");

//       const requests: string[] = [];
//       page.on("request", (request) => {
//         requests.push(request.url());
//       });

//       await page.reload();
//       await page.waitForTimeout(2000);

//       // Verify token is not in any URL
//       for (const url of requests) {
//         expect(url).not.toContain(TEST_USERS.user.token);
//         expect(url).not.toMatch(/token=/i);
//       }
//     });
//   });

//   test.describe("XSS Protection", () => {
//     test("should sanitize malicious product names", async ({ page }) => {
//       await loginUserProgrammatically(page, "user");

//       const xssOrders = [
//         {
//           _id: "xss-test-1",
//           order_id: 1,
//           seat_id: "T1-S1",
//           stage: "new",
//           order_date: `${new Date().toISOString().split("T")[0]} 12:00:00`,
//           state: "draft",
//           cancelled: false,
//           items: [
//             {
//               product_name: '<script>alert("XSS")</script>Burger',
//               quantity: 1,
//             },
//             {
//               product_name: '<img src=x onerror=alert("XSS")>',
//               quantity: 2,
//             },
//           ],
//           customer_count: 1,
//           ref_ticket: "T001",
//         },
//       ];

//       await mockAuthenticatedKDSAPI(page, {
//         validTokens: [TEST_USERS.user.token],
//         responseData: xssOrders,
//       });

//       await page.reload();
//       await page.waitForTimeout(2000);

//       // Check that script tag is not executed
//       const alertFired = await page
//         .evaluate(() => {
//           return window.alert.toString().includes("XSS");
//         })
//         .catch(() => false);

//       expect(alertFired).toBeFalsy();

//       // Get page content
//       const pageContent = await page.content();

//       // Should not contain raw script tags
//       expect(pageContent).not.toContain("<script>alert");
//       expect(pageContent).not.toContain("onerror=alert");
//     });

//     test("should sanitize ticket numbers", async ({ page }) => {
//       await loginUserProgrammatically(page, "user");

//       const xssOrders = [
//         {
//           _id: "xss-ticket",
//           order_id: 1,
//           seat_id: "T1-S1",
//           stage: "new",
//           order_date: `${new Date().toISOString().split("T")[0]} 12:00:00`,
//           state: "draft",
//           cancelled: false,
//           items: [{ product_name: "Burger", quantity: 1 }],
//           customer_count: 1,
//           ref_ticket: '<img src=x onerror=alert(1)>',
//         },
//       ];

//       await mockAuthenticatedKDSAPI(page, {
//         validTokens: [TEST_USERS.user.token],
//         responseData: xssOrders,
//       });

//       await page.reload();
//       await page.waitForTimeout(2000);

//       const pageContent = await page.content();
//       expect(pageContent).not.toContain("onerror=alert");
//     });

//     test("should escape HTML entities in seat IDs", async ({ page }) => {
//       await loginUserProgrammatically(page, "user");

//       const xssOrders = [
//         {
//           _id: "xss-seat",
//           order_id: 1,
//           seat_id: '<b>T1</b>-<i>S1</i>',
//           stage: "new",
//           order_date: `${new Date().toISOString().split("T")[0]} 12:00:00`,
//           state: "draft",
//           cancelled: false,
//           items: [{ product_name: "Burger", quantity: 1 }],
//           customer_count: 1,
//           ref_ticket: "T001",
//         },
//       ];

//       await mockAuthenticatedKDSAPI(page, {
//         validTokens: [TEST_USERS.user.token],
//         responseData: xssOrders,
//       });

//       await page.reload();
//       await page.waitForTimeout(2000);

//       // HTML should be escaped
//       const orderCard = page.locator(".bg-white.rounded-2xl").first();
//       const textContent = await orderCard.textContent();

//       console.log("Seat ID displayed as:", textContent);
//     });
//   });

//   test.describe("CSRF Protection", () => {
//     test("should include proper headers in POST requests", async ({
//       page,
//     }) => {
//       await loginUserProgrammatically(page, "user");

//       let requestHeaders: Record<string, string> = {};
//       let requestBody: any = null;

//       await page.route(`${API_BASE_URL}/api/kds/stage`, async (route) => {
//         requestHeaders = route.request().headers();
//         requestBody = route.request().postDataJSON();

//         await route.fulfill({
//           status: 200,
//           contentType: "application/json",
//           body: JSON.stringify({
//             jsonrpc: "2.0",
//             result: { success: true },
//           }),
//         });
//       });

//       await mockAuthenticatedKDSAPI(page, {
//         validTokens: [TEST_USERS.user.token],
//         responseData: createMockOrders(5),
//       });

//       await page.reload();
//       await page.waitForTimeout(2000);

//       // Simulate drag and drop
//       const orderCards = page.locator(".cursor-move");
//       if ((await orderCards.count()) > 0) {
//         const firstOrder = orderCards.first();
//         const orderBox = await firstOrder.boundingBox();

//         if (orderBox) {
//           await page.mouse.move(
//             orderBox.x + orderBox.width / 2,
//             orderBox.y + orderBox.height / 2
//           );
//           await page.mouse.down();
//           await page.mouse.move(
//             orderBox.x + 150,
//             orderBox.y + 150,
//             { steps: 5 }
//           );
//           await page.mouse.up();

//           await page.waitForTimeout(1000);

//           // Verify headers
//           expect(requestHeaders["x-api-token"]).toBeTruthy();
//           expect(requestHeaders["content-type"]).toBe("application/json");

//           // Verify JSON-RPC format
//           expect(requestBody.jsonrpc).toBe("2.0");
//           expect(requestBody.method).toBe("call");
//         }
//       }
//     });

//     test("should reject requests without proper authentication", async ({
//       page,
//     }) => {
//       await loginUserProgrammatically(page, "user");

//       let rejectedCount = 0;

//       await page.route(`${API_BASE_URL}/api/kds/stage`, async (route) => {
//         const headers = route.request().headers();

//         if (!headers["x-api-token"]) {
//           rejectedCount++;
//           await route.fulfill({
//             status: 401,
//             contentType: "application/json",
//             body: JSON.stringify({
//               jsonrpc: "2.0",
//               error: {
//                 code: 100,
//                 message: "Authentication required",
//               },
//             }),
//           });
//           return;
//         }

//         await route.continue();
//       });

//       // Try to make request without token
//       await page.evaluate(async () => {
//         try {
//           await fetch("http://localhost:8073/api/kds/stage", {
//             method: "POST",
//             headers: {
//               "Content-Type": "application/json",
//             },
//             body: JSON.stringify({
//               jsonrpc: "2.0",
//               method: "call",
//               params: { order_id: 1, stage: "preparing" },
//             }),
//           });
//         } catch (e) {
//           console.error("Request failed:", e);
//         }
//       });

//       await page.waitForTimeout(1000);
//       expect(rejectedCount).toBeGreaterThan(0);
//     });
//   });

//   test.describe("Authorization Bypass Attempts", () => {
//     test("should not allow URL manipulation to access forbidden routes", async ({
//       page,
//     }) => {
//       await loginUser(page, "user");

//       // Try to access admin-only route
//       await page.goto(`${KDS_URL}admin`);
//       await page.waitForTimeout(2000);

//       const hasForbiddenError = await page
//         .getByText(/forbidden|access denied|not authorized/i)
//         .isVisible()
//         .catch(() => false);
//       const isOnErrorPage =
//         page.url().includes("error") || page.url().includes("403");

//       expect(hasForbiddenError || isOnErrorPage).toBeTruthy();
//     });

//     test("should not allow role escalation via localStorage manipulation", async ({
//       page,
//     }) => {
//       await loginUser(page, "user");

//       // Try to manipulate user roles in localStorage
//       await page.evaluate(() => {
//         const userStr = localStorage.getItem("kds_user");
//         if (userStr) {
//           const user = JSON.parse(userStr);
//           user.roles = ["admin", "manager", "user"];
//           user.permissions = {
//             can_view_kds: true,
//             can_manage_orders: true,
//             can_view_dashboard: true,
//             can_manage_users: true,
//           };
//           localStorage.setItem("kds_user", JSON.stringify(user));
//         }
//       });

//       // Reload to apply changes
//       await page.reload();
//       await page.waitForTimeout(2000);

//       // Try to access manager route
//       await page.goto(`${KDS_URL}dashboard`);
//       await page.waitForTimeout(2000);

//       // Server should validate roles and deny access
//       // (This assumes backend validates roles from token, not client data)
//       console.log(
//         "Testing role escalation - backend should validate against token"
//       );
//     });

//     test("should validate permissions on every API call", async ({ page }) => {
//       await loginUserProgrammatically(page, "user");

//       let apiCallCount = 0;
//       let allHaveToken = true;

//       await page.route(`${API_BASE_URL}/api/**`, async (route) => {
//         apiCallCount++;
//         const headers = route.request().headers();

//         if (!headers["x-api-token"]) {
//           allHaveToken = false;
//           await route.fulfill({
//             status: 401,
//             body: JSON.stringify({
//               jsonrpc: "2.0",
//               error: { code: 100, message: "Unauthorized" },
//             }),
//           });
//           return;
//         }

//         await route.continue();
//       });

//       await page.reload();
//       await page.waitForTimeout(3000);

//       expect(apiCallCount).toBeGreaterThan(0);
//       expect(allHaveToken).toBeTruthy();
//     });
//   });

//   test.describe("Session Security", () => {
//     test("should not expose session data in console", async ({ page }) => {
//       const consoleLogs: string[] = [];

//       page.on("console", (msg) => {
//         consoleLogs.push(msg.text().toLowerCase());
//       });

//       await loginUser(page, "user");
//       await page.waitForTimeout(3000);

//       // Check for sensitive data in logs
//       const sensitiveLogs = consoleLogs.filter(
//         (log) =>
//           log.includes("password") ||
//           log.includes("secret") ||
//           (log.includes("token") && log.includes(TEST_USERS.user.token))
//       );

//       console.log("Console logs count:", consoleLogs.length);
//       console.log("Sensitive logs:", sensitiveLogs);

//       // Tokens might be logged for debugging but should be truncated
//       expect(sensitiveLogs.filter((log) => log.includes("password"))).toEqual(
//         []
//       );
//     });

//     test("should handle concurrent logout across tabs", async ({
//       page,
//       context,
//     }) => {
//       await loginUser(page, "user");

//       // Open second tab
//       const page2 = await context.newPage();
//       await page2.goto(KDS_URL);
//       await page2.waitForTimeout(2000);

//       // Both tabs should be authenticated
//       await expect(page.getByText(TEST_USERS.user.name)).toBeVisible();
//       await expect(page2.getByText(TEST_USERS.user.name)).toBeVisible();

//       // Logout from first tab
//       await page.click('button:has-text("Logout")');
//       await page.waitForURL(/.*login/, { timeout: 5000 });

//       // Second tab should detect logout
//       await page2.reload();
//       await page2.waitForTimeout(2000);

//       const { token } = await getAuthData(page2);
//       expect(token).toBeFalsy();

//       await page2.close();
//     });

//     test("should prevent session fixation attacks", async ({
//       page,
//       context,
//     }) => {
//       // Set a pre-existing session token (simulating session fixation attempt)
//       await page.addInitScript(() => {
//         localStorage.setItem("kds_token", "attacker-controlled-token");
//       });

//       await page.goto(`${KDS_URL}login`);

//       // Attempt login
//       await page.fill('input[type="email"]', TEST_USERS.user.email);
//       await page.fill('input[type="password"]', TEST_USERS.user.password);
//       await page.click('button[type="submit"]');

//       await page.waitForURL(KDS_URL, { timeout: 10000 });

//       // Token should be replaced with a new one from server
//       const { token } = await getAuthData(page);
//       expect(token).not.toBe("attacker-controlled-token");
//       expect(token).toBe(TEST_USERS.user.token);
//     });

//     test("should timeout inactive sessions", async ({ page }) => {
//       await loginUserProgrammatically(page, "user");

//       // Simulate long inactivity
//       await page.waitForTimeout(3000);

//       // Mock timeout response on next request
//       await page.route(`${API_BASE_URL}/api/kds`, async (route) => {
//         await route.fulfill({
//           status: 401,
//           contentType: "application/json",
//           body: JSON.stringify({
//             jsonrpc: "2.0",
//             error: {
//               code: 100,
//               message: "Session expired",
//               data: {
//                 message: "Session timeout due to inactivity",
//               },
//             },
//           }),
//         });
//       });

//       await page.reload();
//       await page.waitForTimeout(2000);

//       const url = page.url();
//       const hasError = await page
//         .getByText(/session expired|login again/i)
//         .isVisible()
//         .catch(() => false);

//       expect(url.includes("login") || hasError).toBeTruthy();
//     });
//   });

//   test.describe("Rate Limiting", () => {
//     test("should handle rapid API calls gracefully", async ({ page }) => {
//       await loginUserProgrammatically(page, "user");

//       let requestCount = 0;
//       const startTime = Date.now();

//       await page.route(`${API_BASE_URL}/api/kds`, async (route) => {
//         requestCount++;
//         await route.fulfill({
//           status: 200,
//           contentType: "application/json",
//           body: JSON.stringify({
//             jsonrpc: "2.0",
//             result: [],
//           }),
//         });
//       });

//       // Make 10 rapid reloads
//       for (let i = 0; i < 10; i++) {
//         await page.reload();
//         await page.waitForTimeout(100);
//       }

//       const duration = Date.now() - startTime;

//       // App should remain responsive
//       await expect(page.getByText("Kitchen Display System")).toBeVisible();

//       console.log(`Made ${requestCount} requests in ${duration}ms`);
//     });

//     test("should implement request debouncing", async ({ page }) => {
//       await loginUserProgrammatically(page, "user");

//       let requestCount = 0;

//       await page.route(`${API_BASE_URL}/api/kds/stage`, async (route) => {
//         requestCount++;
//         await route.fulfill({
//           status: 200,
//           contentType: "application/json",
//           body: JSON.stringify({
//             jsonrpc: "2.0",
//             result: { success: true },
//           }),
//         });
//       });

//       // Simulate rapid drag and drop events
//       await page.evaluate(() => {
//         for (let i = 0; i < 10; i++) {
//           const event = new CustomEvent("stage-update", {
//             detail: { orderId: i, stage: "preparing" },
//           });
//           window.dispatchEvent(event);
//         }
//       });

//       await page.waitForTimeout(2000);

//       // Should debounce and make fewer requests
//       console.log(`Debounced to ${requestCount} requests from 10 events`);
//       expect(requestCount).toBeLessThan(10);
//     });
//   });
// });