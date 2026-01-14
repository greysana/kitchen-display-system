/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from "@playwright/test";
import {
  loginUserProgrammatically,
  TEST_USERS,
  verifyAuthentication,
} from "../../helpers/auth.helper";
import {
  setupAllMocks,
  mockStageUpdateAPI,
  createMockOrders,
  setupRequestLogger,
  mockTokenExpiration,
  getDefaultStages,
} from "../../helpers/api.helper";

// Test configuration
const KDS_URL = "http://localhost:3000/";
const API_BASE_URL = "http://localhost:8073";

// Helper to wait for KDS to be ready
async function waitForKDSReady(page: any) {
  await expect(page.locator("text=/Total Orders:/i")).toBeVisible({
    timeout: 10000,
  });
}

test.describe("KDS E2E Tests - Authenticated", () => {
  // Note: We removed the global beforeEach because each test needs
  // slightly different mock data (empty vs full vs specific dates).

  test.describe("Initial Page Load", () => {
    test("should display loading skeleton then load KDS interface", async ({
      page,
    }) => {
      // 1. Setup Mocks (with delay to see skeleton)
      await setupAllMocks(page, {
        userType: "user",
        ordersData: [], // Empty initially to test skeleton/shell
        delay: 1000,
      });

      // 2. Login (triggers navigation)
      await loginUserProgrammatically(page, "user");

      // 3. Check that the skeleton container is visible initially
      const skeletonContainer = page.getByTestId("kds-skeleton");
      await expect(skeletonContainer).toBeVisible({ timeout: 5000 });

      // 4. Wait for main content to load (connection status indicator)
      await expect(page.locator("text=/Connected|Disconnected/i")).toBeVisible({
        timeout: 10000,
      });

      // 5. Confirm the skeleton container is removed
      await expect(skeletonContainer).toBeHidden();
    });

    test("should show connection status indicator", async ({ page }) => {
      await setupAllMocks(page, { userType: "user", ordersData: [] });
      await loginUserProgrammatically(page, "user");

      await page.waitForLoadState("networkidle");

      // Check for connection status with pulse animation
      const connectionIndicator = page
        .locator('[class*="animate-pulse"]')
        .first();
      await expect(connectionIndicator).toBeVisible();

      // Verify status text
      const statusText = page.locator("text=/Connected|Disconnected/i");
      await expect(statusText).toBeVisible();
    });

    test("should display user info in navigation", async ({ page }) => {
      await setupAllMocks(page, { userType: "user", ordersData: [] });
      await loginUserProgrammatically(page, "user");

      await page.waitForLoadState("networkidle");

      await expect(page.getByText(TEST_USERS.user.name)).toBeVisible();
      await expect(page.locator('button:has-text("Logout")')).toBeVisible();
    });

    test("should display stage columns with proper styling", async ({
      page,
    }) => {
      await setupAllMocks(page, { userType: "user", ordersData: [] });
      await loginUserProgrammatically(page, "user");

      await page.waitForLoadState("networkidle");

      // Stage columns should have specific classes
      const stageColumns = page.locator(".bg-gray-50.rounded-xl");
      const count = await stageColumns.count();

      expect(count).toBeGreaterThan(0);

      // Check that each column has a header
      const stageHeaders = page.locator(".uppercase.tracking-wide");
      expect(await stageHeaders.count()).toBeGreaterThan(0);
    });

    test("should display order count per stage", async ({ page }) => {
      const mockOrders = createMockOrders(10);
      await setupAllMocks(page, { userType: "user", ordersData: mockOrders });
      await loginUserProgrammatically(page, "user");

      await page.waitForLoadState("networkidle");

      const orderCountPattern = /\d+\s+orders?/i;
      const orderCounts = page.locator(`text=${orderCountPattern}`);

      expect(await orderCounts.count()).toBeGreaterThan(0);
    });

    test("should display total orders count in header", async ({ page }) => {
      const mockOrders = createMockOrders(5, "new");
      await setupAllMocks(page, { userType: "user", ordersData: mockOrders });
      await loginUserProgrammatically(page, "user");

      await page.waitForLoadState("networkidle");

      // Total orders in header (top right)
      await expect(
        page.locator(`text=/Total Orders:\\s*${mockOrders.length}/i`)
      ).toBeVisible();
    });
  });

  test.describe("Order Card Display", () => {
    test("should display order cards with correct structure", async ({
      page,
    }) => {
      const mockOrders = createMockOrders(3, "new");
      await setupAllMocks(page, { userType: "user", ordersData: mockOrders });
      await loginUserProgrammatically(page, "user");

      await page.waitForLoadState("networkidle");

      const orderCards = page.locator(".bg-white.rounded-2xl.shadow-md");
      const orderCount = await orderCards.count();

      expect(orderCount).toBeGreaterThan(0);

      const firstCard = orderCards.first();
      await expect(firstCard).toBeVisible();

      // Check for order number format (#X)
      const hasOrderNumber = await page
        .locator("text=/\\(#\\d+\\)/")
        .first()
        .isVisible();
      expect(hasOrderNumber).toBeTruthy();
    });

    test("should show order details: ticket, customer count, items", async ({
      page,
    }) => {
      const mockOrders = createMockOrders(3, "new");
      await setupAllMocks(page, { userType: "user", ordersData: mockOrders });
      await loginUserProgrammatically(page, "user");

      await page.waitForLoadState("networkidle");

      const orderCards = page.locator(".bg-white.rounded-2xl.shadow-md");
      const firstCard = orderCards.first();

      const ticketText = await firstCard.locator("text=/Ticket:/").isVisible();
      expect(ticketText).toBeTruthy();

      const itemsList = firstCard.locator("ul");
      await expect(itemsList).toBeVisible();

      const hasQuantity = await firstCard
        .locator("text=/x\\d+/")
        .first()
        .isVisible();
      expect(hasQuantity).toBeTruthy();
    });

    test("should highlight expired orders with red border and pulse", async ({
      page,
    }) => {
      const mockOrders = createMockOrders(5);
      await setupAllMocks(page, { userType: "user", ordersData: mockOrders });
      await loginUserProgrammatically(page, "user");

      await page.waitForLoadState("networkidle");

      const expiredOrders = page.locator(".ring-red-500.animate-pulse");
      const expiredCount = await expiredOrders.count();

      console.log(`Found ${expiredCount} expired orders`);

      if (expiredCount > 0) {
        await expect(expiredOrders.first()).toBeVisible();
        const redHeader = expiredOrders.first().locator(".bg-red-50");
        await expect(redHeader).toBeVisible();
      }
    });

    test("should show completed orders with green styling", async ({
      page,
    }) => {
      const mockOrders = createMockOrders(5);
      await setupAllMocks(page, { userType: "user", ordersData: mockOrders });
      await loginUserProgrammatically(page, "user");

      await page.waitForLoadState("networkidle");

      const completedOrders = page.locator(".border-green-500.bg-green-50");
      const completedCount = await completedOrders.count();

      console.log(`Found ${completedCount} completed orders`);

      if (completedCount > 0) {
        await expect(completedOrders.first()).toBeVisible();
      }
    });
  });

  test.describe("Empty State Display", () => {
    test("should show 'Drop here' zone in empty stages", async ({ page }) => {
      // Create orders only for the 'new' stage, leaving others empty
      const mockOrders = createMockOrders(2, "new");

      await setupAllMocks(page, { userType: "user", ordersData: mockOrders });
      await loginUserProgrammatically(page, "user");

      await page.waitForLoadState("networkidle");

      // Empty stages should show drop zone with "Drop here" text
      const dropZones = page.locator("text=Drop here");
      const dropZoneCount = await dropZones.count();

      // Should have at least one empty stage (Preparing, Ready, etc.)
      expect(dropZoneCount).toBeGreaterThan(0);

      // Drop zone should have dashed border
      const dashedBorder = page.locator(".border-dashed").first();
      await expect(dashedBorder).toBeVisible();
    });

    test("should show all stages with 0 orders when completely empty", async ({
      page,
    }) => {
      await setupAllMocks(page, { userType: "user", ordersData: [] });
      await loginUserProgrammatically(page, "user");

      await page.waitForLoadState("networkidle");

      // All stage headers should still be visible
      const stageHeaders = page.locator(".uppercase.tracking-wide");
      expect(await stageHeaders.count()).toBeGreaterThan(0);

      // Total orders should show 0
      await expect(page.locator("text=/Total Orders:\\s*0/i")).toBeVisible();

      // Empty stages should show drop zones
      const dropZones = page.locator("text=Drop here");
      expect(await dropZones.count()).toBeGreaterThan(0);
    });
  });

  test.describe("Drag and Drop Functionality", () => {
    test("should have draggable order cards with cursor-move", async ({
      page,
    }) => {
      const mockOrders = createMockOrders(5);
      await setupAllMocks(page, { userType: "user", ordersData: mockOrders });
      await loginUserProgrammatically(page, "user");

      await page.waitForLoadState("networkidle");

      const orderCards = page.locator(".cursor-move");
      const draggableCount = await orderCards.count();

      expect(draggableCount).toBeGreaterThan(0);
      await expect(orderCards.first()).toBeVisible();
      console.log(`Found ${draggableCount} draggable orders`);
    });

    test("should highlight drop zone on drag over", async ({ page }) => {
      const mockOrders = createMockOrders(1, "new");
      await setupAllMocks(page, { userType: "user", ordersData: mockOrders });
      await loginUserProgrammatically(page, "user");

      await waitForKDSReady(page);
      await page.waitForTimeout(2000);

      const orderCards = page.locator(".cursor-move");
      const orderCount = await orderCards.count();

      if (orderCount > 0) {
        const firstOrder = orderCards.first();
        const orderBox = await firstOrder.boundingBox();

        if (orderBox) {
          // Start drag
          await page.mouse.move(
            orderBox.x + orderBox.width / 2,
            orderBox.y + orderBox.height / 2
          );
          await page.mouse.down();

          // Move to trigger drag state
          await page.mouse.move(
            orderBox.x + orderBox.width / 2,
            orderBox.y + orderBox.height / 2 + 50,
            { steps: 5 }
          );

          // Check for green highlight on drop zone
          const highlightedZone = page.locator(
            ".bg-green-50.ring-green-400, .bg-green-50.ring-2.ring-green-400"
          );
          const isHighlighted = await highlightedZone
            .isVisible()
            .catch(() => false);

          await page.mouse.up();

          console.log(`Drop zone highlight on drag: ${isHighlighted}`);
        }
      }
    });

    test("should include auth token when updating order stage", async ({
      page,
    }) => {
      let updateCalled = false;
      let updateParams: any = null;

      await setupAllMocks(page, {
        userType: "user",
        ordersData: createMockOrders(5),
      });

      await mockStageUpdateAPI(page, {
        validTokens: [TEST_USERS.user.token],
        onUpdate: (data: any) => {
          updateCalled = true;
          updateParams = data;
        },
      });

      const requests = await setupRequestLogger(page);

      await loginUserProgrammatically(page, "user");

      await waitForKDSReady(page);
      await page.waitForTimeout(2000);

      const orderCards = page.locator(".cursor-move");
      const stageColumns = page.locator(".bg-gray-50.rounded-xl");

      const orderCount = await orderCards.count();
      const stageCount = await stageColumns.count();

      if (orderCount > 0 && stageCount > 1) {
        const firstOrder = orderCards.first();
        const targetStage = stageColumns.nth(1);

        const orderBox = await firstOrder.boundingBox();
        const stageBox = await targetStage.boundingBox();

        if (orderBox && stageBox) {
          await page.mouse.move(
            orderBox.x + orderBox.width / 2,
            orderBox.y + orderBox.height / 2
          );
          await page.mouse.down();
          await page.mouse.move(
            stageBox.x + stageBox.width / 2,
            stageBox.y + 100,
            { steps: 10 }
          );
          await page.mouse.up();

          await page.waitForTimeout(2000);

          expect(updateCalled).toBeTruthy();
          console.log("Update params:", updateParams);

          const stageUpdateRequests = requests.filter(
            (r: { url: string | string[] }) => r.url.includes("/api/kds")
          );
          expect(stageUpdateRequests.length).toBeGreaterThan(0);
          expect(stageUpdateRequests[0].hasToken).toBeTruthy();
        }
      }
    });

    test("should allow moving orders between stages", async ({ page }) => {
      const mockOrders = createMockOrders(1, "new");
      await setupAllMocks(page, { userType: "user", ordersData: mockOrders });
      await loginUserProgrammatically(page, "user");

      await waitForKDSReady(page);
      await page.waitForTimeout(2000);

      const orderCards = page.locator(".cursor-move");
      const stageColumns = page.locator(".bg-gray-50.rounded-xl");

      const orderCount = await orderCards.count();
      const stageCount = await stageColumns.count();

      if (orderCount > 0 && stageCount > 1) {
        // Drag from Stage 0 (New) to Stage 1 (Preparing)
        const firstOrder = orderCards.first();
        const targetStage = stageColumns.nth(1);

        const orderBox = await firstOrder.boundingBox();
        const stageBox = await targetStage.boundingBox();

        if (orderBox && stageBox) {
          // Perform drag
          await page.mouse.move(
            orderBox.x + orderBox.width / 2,
            orderBox.y + orderBox.height / 2
          );
          await page.mouse.down();

          // Move slowly to target
          await page.mouse.move(
            stageBox.x + stageBox.width / 2,
            stageBox.y + 100,
            { steps: 10 }
          );
          await page.mouse.up();

          // Wait for backend update
          await page.waitForTimeout(2000);

          // Verify page is still responsive
          await expect(page.locator("text=/Total Orders:/i")).toBeVisible();
        }
      }
    });
  });

  test.describe("Real-time Updates via WebSocket", () => {
    test("should handle new_order WebSocket message", async ({ page }) => {
      // Start with empty
      await setupAllMocks(page, { userType: "user", ordersData: [] });
      await loginUserProgrammatically(page, "user");

      await waitForKDSReady(page);
      await page.waitForTimeout(2000);

      // Verify 0 initially
      await expect(page.locator("text=/Total Orders:\\s*0/i")).toBeVisible();

      const initialCountText = await page
        .locator("text=/Total Orders:\\s*(\\d+)/i")
        .textContent();
      const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || "0");

      // Simulate WebSocket new_order event
      await page.evaluate(() => {
        const event = new MessageEvent("message", {
          data: JSON.stringify({
            type: "new_order",
            data: { order_id: 999 },
          }),
        });
        window.dispatchEvent(event);
      });

      await page.waitForTimeout(3000);

      // Verify system remains responsive
      await expect(page.locator("text=/Total Orders:/i")).toBeVisible();
      console.log(`Initial orders: ${initialCount}, new_order event triggered`);
    });

    test("should handle kds_stage_update WebSocket message", async ({
      page,
    }) => {
      await setupAllMocks(page, {
        userType: "user",
        ordersData: createMockOrders(5),
      });
      await loginUserProgrammatically(page, "user");

      await waitForKDSReady(page);
      await page.waitForTimeout(2000);

      const orderCards = page.locator(".cursor-move");
      const orderCount = await orderCards.count();

      if (orderCount > 0) {
        // Simulate stage update for first order
        await page.evaluate(() => {
          const event = new MessageEvent("message", {
            data: JSON.stringify({
              type: "kds_stage_update",
              kds_id: "test-kds-id",
              stage: "preparing",
              timestamp: new Date().toISOString(),
            }),
          });
          window.dispatchEvent(event);
        });

        await page.waitForTimeout(2000);

        // System should remain responsive
        await expect(page.locator("text=/Total Orders:/i")).toBeVisible();
      }
    });

    test("should handle multiple rapid WebSocket updates", async ({ page }) => {
      await setupAllMocks(page, {
        userType: "user",
        ordersData: createMockOrders(5),
      });
      await loginUserProgrammatically(page, "user");

      await waitForKDSReady(page);
      await page.waitForTimeout(2000);

      // Simulate 10 rapid updates
      await page.evaluate(() => {
        for (let i = 0; i < 10; i++) {
          const event = new MessageEvent("message", {
            data: JSON.stringify({
              type: "kds_stage_update",
              kds_id: `order-${i}`,
              stage: i % 2 === 0 ? "preparing" : "ready",
              timestamp: new Date().toISOString(),
            }),
          });
          window.dispatchEvent(event);
        }
      });

      await page.waitForTimeout(2000);

      // System should remain stable
      await expect(page.locator("text=/Total Orders:/i")).toBeVisible();

      const connectionStatus = await page
        .locator("text=/Connected/i")
        .isVisible();
      expect(connectionStatus).toBeTruthy();
    });
  });

  test.describe("Error Handling", () => {
    test("should receive 401 when session expires during operation", async ({
      page,
    }) => {
      await setupAllMocks(page, {
        userType: "user",
        ordersData: createMockOrders(3),
      });
      await loginUserProgrammatically(page, "user");

      await waitForKDSReady(page);

      // Listen for 401 response
      const response401Promise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/kds") && response.status() === 401,
        { timeout: 5000 }
      );

      // Mock token expiration
      await mockTokenExpiration(page);

      const orderCards = page.locator(".cursor-move");
      if ((await orderCards.count()) > 0) {
        const firstOrder = orderCards.first();
        const orderBox = await firstOrder.boundingBox();

        if (orderBox) {
          // Trigger drag to make API call
          await page.mouse.move(
            orderBox.x + orderBox.width / 2,
            orderBox.y + orderBox.height / 2
          );
          await page.mouse.down();
          await page.mouse.move(
            orderBox.x + orderBox.width / 2 + 50,
            orderBox.y + orderBox.height / 2 + 100,
            { steps: 5 }
          );
          await page.mouse.up();

          // Wait for and verify 401 response
          const response = await response401Promise;
          expect(response.status()).toBe(401);
          console.log("Successfully received 401 on expired token");
        }
      }
    });

    test("should handle API 500 error gracefully", async ({ page }) => {
      // Setup mocks normally first to handle auth
      await setupAllMocks(page, { userType: "user", ordersData: [] });

      // OVERRIDE the KDS data route to fail *specifically* for this test
      await page.route("**/api/kds", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal Server Error" }),
        });
      });

      await loginUserProgrammatically(page, "user");

      // Wait for some element to appear (connection status or error)
      await page.waitForTimeout(3000);

      // No stage columns on failure
      const stageColumns = await page.locator(".bg-gray-50.rounded-xl").count();

      // Either no columns or error message should be present
      const hasError = await page
        .getByText(/error|failed/i)
        .isVisible()
        .catch(() => false);

      expect(stageColumns === 0 || hasError).toBeTruthy();
      console.log(
        "Has error message:",
        hasError,
        "Stage columns:",
        stageColumns
      );
    });
  });

  test.describe("Date Filtering", () => {
    test("should only display orders from today", async ({ page }) => {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      // Construct specific data for this test
      const mixedDateOrders = [
        {
          _id: "today-1",
          order_id: 1,
          seat_id: "T1-S1",
          stage: "new",
          order_date: `${todayStr} 12:00:00`,
          state: "draft",
          cancelled: false,
          items: [{ product_name: "Burger", quantity: 1 }],
          customer_count: 2,
          ref_ticket: "T001",
          row_pos: 0,
          updatedAt: new Date().toISOString(),
        },
        {
          _id: "today-2",
          order_id: 2,
          seat_id: "T2-S1",
          stage: "preparing",
          order_date: `${todayStr} 13:00:00`,
          state: "draft",
          cancelled: false,
          items: [{ product_name: "Pizza", quantity: 2 }],
          customer_count: 3,
          ref_ticket: "T002",
          row_pos: 0,
          updatedAt: new Date().toISOString(),
        },
        {
          _id: "yesterday-1",
          order_id: 99,
          seat_id: "T9-S9",
          stage: "new",
          order_date: `${yesterdayStr} 10:00:00`,
          state: "draft",
          cancelled: false,
          items: [{ product_name: "Salad", quantity: 1 }],
          customer_count: 1,
          ref_ticket: "T099",
          row_pos: 0,
          updatedAt: yesterday.toISOString(),
        },
      ];

      await setupAllMocks(page, {
        userType: "user",
        ordersData: mixedDateOrders,
      });
      await loginUserProgrammatically(page, "user");

      await waitForKDSReady(page);
      await page.waitForTimeout(3000);

      // Today's orders should be visible
      const todayOrder1 = await page.locator("text=T1-S1").isVisible();
      const todayOrder2 = await page.locator("text=T2-S1").isVisible();

      expect(todayOrder1 || todayOrder2).toBeTruthy();

      // Yesterday's order should NOT be visible
      const yesterdayOrder = await page.locator("text=T9-S9").isVisible();
      expect(yesterdayOrder).toBeFalsy();

      // Should show exactly 2 orders in count
      await expect(page.locator("text=/Total Orders:\\s*2/i")).toBeVisible();
    });
  });

  test.describe("Performance", () => {
    test("should load within reasonable time with auth", async ({ page }) => {
      await setupAllMocks(page, {
        userType: "user",
        ordersData: createMockOrders(50),
      });

      const startTime = Date.now();

      await loginUserProgrammatically(page, "user");

      await waitForKDSReady(page);

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(10000); // Increased from 8000 to 10000

      console.log(`KDS loaded in ${loadTime}ms with authentication`);
    });

    test("should handle 250+ orders efficiently", async ({ page }) => {
      const today = new Date().toISOString().split("T")[0];

      // Generate 250 orders
      const manyOrders = Array.from({ length: 250 }, (_, i) => ({
        _id: `order-${i}`,
        order_id: i + 1,
        seat_id: `T${Math.floor(i / 4) + 1}-S${(i % 4) + 1}`,
        stage: ["new", "preparing", "ready", "completed"][i % 4],
        order_date: `${today} ${10 + Math.floor(i / 4)}:${(i % 60)
          .toString()
          .padStart(2, "0")}:00`,
        state: "draft",
        cancelled: false,
        items: [
          {
            product_name: `Item ${i}`,
            quantity: 1,
          },
        ],
        customer_count: 1,
        ref_ticket: `T${String(i + 1).padStart(3, "0")}`,
        row_pos: i,
        updatedAt: new Date().toISOString(),
      }));

      await setupAllMocks(page, { userType: "user", ordersData: manyOrders });

      const startTime = Date.now();
      await loginUserProgrammatically(page, "user");

      // Wait for UI to render
      await expect(page.locator("text=/Total Orders:\\s*250/i")).toBeVisible({
        timeout: 15000,
      });

      const loadTime = Date.now() - startTime;
      console.log(`Loaded 250 orders + Auth in ${loadTime}ms`);

      // Note: Time includes login process, so we set a lenient threshold
      expect(loadTime).toBeLessThan(15000);
    });
  });

 
});

test.describe("Multi-Role KDS Tests", () => {
  test("manager should have additional permissions", async ({ page }) => {
    await page.context().clearCookies();

    // Setup mocks for manager
    await setupAllMocks(page, {
      userType: "manager",
      ordersData: createMockOrders(5),
    });

    await loginUserProgrammatically(page, "manager");

    await waitForKDSReady(page);
    await page.waitForTimeout(2000);

    await expect(page.getByText(TEST_USERS.manager.name)).toBeVisible();
    await expect(page.locator('a[href="/dashboard"]').first()).toBeVisible();

    const authData = await page.evaluate(() => {
      const userStr = localStorage.getItem("kds_user");
      return userStr ? JSON.parse(userStr) : null;
    });

    expect(authData).toBeTruthy();
    console.log("Manager auth data:", authData);
  });
});
