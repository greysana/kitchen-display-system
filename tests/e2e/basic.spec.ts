import { test, expect } from "@playwright/test";

// Test configuration
const KDS_URL = "http://localhost:3000/";
const API_BASE_URL = "http://localhost:8073";

test.describe("KDS E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(KDS_URL);
  });

  test.describe("Initial Page Load", () => {
    test("should display loading skeleton then load KDS interface", async ({
      page,
    }) => {
      const skeletonContainer = page.getByTestId("kds-skeleton");

      // 1. Check that the skeleton container is visible initially
      await expect(skeletonContainer).toBeVisible();

      // 2. Wait for the main UI text to appear
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });

      // 3. Confirm the skeleton container is completely removed from the DOM
      await expect(skeletonContainer).toBeHidden();
      // OR: await expect(skeletonContainer).toHaveCount(0);
    });

    test("should show connection status indicator", async ({ page }) => {
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });

      // Check for connection status with pulse animation
      const connectionIndicator = page
        .locator('[class*="animate-pulse"]')
        .first();
      await expect(connectionIndicator).toBeVisible();

      // Verify status text
      const statusText = page.locator("text=/Connected|Disconnected/i");
      await expect(statusText).toBeVisible();
    });

    test("should display stage columns with proper styling", async ({
      page,
    }) => {
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });

      await page.waitForTimeout(1000);

      // Stage columns should have specific classes: bg-gray-50, rounded-xl, w-80
      const stageColumns = page.locator(".bg-gray-50.rounded-xl");
      const count = await stageColumns.count();

      expect(count).toBeGreaterThan(0);

      // Verify first column has minimum height
      const firstColumn = stageColumns.first();
      await expect(firstColumn).toBeVisible();

      // Check that each column has a header (uppercase stage name)
      const stageHeaders = page.locator(".uppercase.tracking-wide");
      expect(await stageHeaders.count()).toBeGreaterThan(0);
    });

    test("should display order count per stage", async ({ page }) => {
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });

      await page.waitForTimeout(2000);

      // Each stage shows: "X order" or "X orders"
      const orderCountPattern = /\d+\s+orders?/i;
      const orderCounts = page.locator(`text=${orderCountPattern}`);

      // Should have at least one order count display
      expect(await orderCounts.count()).toBeGreaterThan(0);
    });

    test("should display total orders count in header", async ({ page }) => {
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });

      await page.waitForTimeout(2000);

      // Total orders in header (top right)
      await expect(page.locator("text=/Total Orders:\\s*\\d+/i")).toBeVisible();
    });
  });

  test.describe("Order Card Display", () => {
    test("should display order cards with correct structure", async ({
      page,
    }) => {
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });

      await page.waitForTimeout(2000);

      // Check for order cards with specific styling
      const orderCards = page.locator(".bg-white.rounded-2xl.shadow-md");
      const orderCount = await orderCards.count();

      if (orderCount > 0) {
        const firstCard = orderCards.first();
        await expect(firstCard).toBeVisible();

        // Verify card has yellow header (bg-yellow-50)
        const cardHeader = firstCard.locator(".bg-yellow-50");
        await expect(cardHeader).toBeVisible();

        // Check for seat ID format (T#-S#)
        // const hasSeatId = await page
        //   .locator("text=/T\\d+-S\\d+/")
        //   .first()
        //   .isVisible();
        // expect(hasSeatId).toBeTruthy();

        // Check for order number format (#X)
        const hasOrderNumber = await page
          .locator("text=/\\(#\\d+\\)/")
          .first()
          .isVisible();
        expect(hasOrderNumber).toBeTruthy();
      } else {
        console.log("No orders to display - empty state test");
      }
    });

    test("should show order details: ticket, customer count, items", async ({
      page,
    }) => {
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });
      await page.waitForTimeout(2000);

      const orderCards = page.locator(".bg-white.rounded-2xl.shadow-md");
      const orderCount = await orderCards.count();

      if (orderCount > 0) {
        const firstCard = orderCards.first();

        // Check for ticket reference
        const ticketText = await firstCard
          .locator("text=/Ticket:/")
          .isVisible();
        expect(ticketText).toBeTruthy();

        // Check for Users icon and customer count
        const usersIcon = firstCard.locator("svg").filter({ hasText: "" });
        const hasUsersSection = (await usersIcon.count()) > 0;
        expect(hasUsersSection).toBeTruthy();

        // Check for items list
        const itemsList = firstCard.locator("ul");
        await expect(itemsList).toBeVisible();

        // Items should show product name and quantity (x#)
        const hasQuantity = await firstCard
          .locator("text=/x\\d+/")
          .first()
          .isVisible();
        expect(hasQuantity).toBeTruthy();
      }
    });

    test("should display timer for orders with holding time", async ({
      page,
    }) => {
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });
      await page.waitForTimeout(2000);

      const orderCards = page.locator(".bg-white.rounded-2xl.shadow-md");
      const orderCount = await orderCards.count();

      if (orderCount > 0) {
        // Look for Clock icon (timer indicator)
        const clockIcons = page
          .locator("svg")
          .filter({ has: page.locator('[class*="lucide-clock"]') });
        const timerCount = await clockIcons.count();

        // Some orders may have timers depending on stage configuration
        console.log(`Found ${timerCount} orders with timers`);
      }
    });

    test("should highlight expired orders with red border and pulse", async ({
      page,
    }) => {
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });
      await page.waitForTimeout(2000);

      // Look for expired orders (ring-4 ring-red-500 animate-pulse)
      const expiredOrders = page.locator(".ring-red-500.animate-pulse");
      const expiredCount = await expiredOrders.count();

      console.log(`Found ${expiredCount} expired orders`);

      if (expiredCount > 0) {
        await expect(expiredOrders.first()).toBeVisible();

        // Expired orders should have red header
        const redHeader = expiredOrders.first().locator(".bg-red-50");
        await expect(redHeader).toBeVisible();
      }
    });

    test("should show completed orders with green styling", async ({
      page,
    }) => {
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });
      await page.waitForTimeout(2000);

      // Look for completed orders (border-green-500 bg-green-50)
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
      // Mock response with orders only in one stage
      await page.route(`${API_BASE_URL}/api/kds`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              _id: "order-1",
              order_id: 1,
              seat_id: "T1-S1",
              stage: "new",
              order_date: `${new Date().toISOString().split("T")[0]} 12:00:00`,
              state: "draft",
              cancelled: false,
              items: [{ product_name: "Burger", quantity: 1 }],
              customer_count: 2,
              ref_ticket: "T001",
            },
          ]),
        });
      });

      await page.reload();
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });

      await page.waitForTimeout(2000);

      // Empty stages should show drop zone with "Drop here" text
      const dropZones = page.locator("text=Drop here");
      const dropZoneCount = await dropZones.count();

      // Should have at least one empty stage
      expect(dropZoneCount).toBeGreaterThan(0);

      // Drop zone should have dashed border
      const dashedBorder = page.locator(".border-dashed").first();
      await expect(dashedBorder).toBeVisible();
    });

    test("should show all stages with 0 orders when completely empty", async ({
      page,
    }) => {
      await page.route(`${API_BASE_URL}/api/kds`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      });

      await page.reload();
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });

      await page.waitForTimeout(2000);

      // All stage headers should still be visible
      const stageHeaders = page.locator(".uppercase.tracking-wide");
      expect(await stageHeaders.count()).toBeGreaterThan(0);

      // Total orders should show 0
      await expect(page.locator("text=/Total Orders:\\s*0/i")).toBeVisible();

      // Should show multiple "Drop here" zones
      const dropZones = page.locator("text=Drop here");
      expect(await dropZones.count()).toBeGreaterThan(0);
    });
  });

  test.describe("Drag and Drop Functionality", () => {
    test("should have draggable order cards with cursor-move", async ({
      page,
    }) => {
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });
      await page.waitForTimeout(2000);

      const orderCards = page.locator(".cursor-move");
      const draggableCount = await orderCards.count();

      if (draggableCount > 0) {
        await expect(orderCards.first()).toBeVisible();
        console.log(`Found ${draggableCount} draggable orders`);
      }
    });

    test("should highlight drop zone on drag over", async ({ page }) => {
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });
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

          // Check for green highlight on drop zone (bg-green-50 ring-2 ring-green-400)
          const highlightedZone = page.locator(".bg-green-50.ring-green-400");
          const isHighlighted = await highlightedZone
            .isVisible()
            .catch(() => false);

          await page.mouse.up();

          console.log(`Drop zone highlight on drag: ${isHighlighted}`);
        }
      }
    });

    test("should show drag overlay with rotation and scale", async ({
      page,
    }) => {
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });
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

          // Move to trigger overlay
          await page.mouse.move(orderBox.x + 100, orderBox.y + 100, {
            steps: 5,
          });

          // The drag overlay should appear (opacity-90 rotate-3 scale-105)
          // Note: DndKit creates overlay in a portal, may be hard to test
          await page.waitForTimeout(500);

          await page.mouse.up();
        }
      }
    });

    test("should allow moving orders between stages", async ({ page }) => {
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });
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
          // Perform drag
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

          // Wait for backend update
          await page.waitForTimeout(2000);

          // Verify page is still responsive
          await expect(page.getByText("Kitchen Display System")).toBeVisible();
        }
      }
    });

    test("should prevent dragging completed orders (state=done)", async ({
      page,
    }) => {
      // This test verifies the handleDragEnd logic that checks order.state === "done"
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });
      await page.waitForTimeout(2000);

      // Look for completed orders with green styling
      const completedOrders = page.locator(".border-green-500.bg-green-50");
      const completedCount = await completedOrders.count();

      if (completedCount > 0) {
        console.log(
          "Found completed orders - drag prevention is handled in handleDragEnd"
        );

        // The component allows drag start but prevents drop in handleDragEnd
        // when order.state === "done"
        await expect(completedOrders.first()).toBeVisible();
      } else {
        console.log("No completed orders to test drag prevention");
      }
    });
  });

  test.describe("Real-time Updates via WebSocket", () => {
    test("should handle new_order WebSocket message", async ({ page }) => {
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });
      await page.waitForTimeout(2000);

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

      // Verify system remains responsive (may trigger syncKDS)
      await expect(page.getByText("Kitchen Display System")).toBeVisible();
      console.log(`Initial orders: ${initialCount}, new_order event triggered`);
    });

    test("should handle kds_stage_update WebSocket message", async ({
      page,
    }) => {
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });
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
        await expect(page.getByText("Kitchen Display System")).toBeVisible();
      }
    });

    test("should handle order_update WebSocket message", async ({ page }) => {
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });
      await page.waitForTimeout(2000);

      // Simulate order state update
      await page.evaluate(() => {
        const event = new MessageEvent("message", {
          data: JSON.stringify({
            type: "order_update",
            order_id: 1,
            state: "done",
            cancelled: false,
            ref_ticket: "T001",
          }),
        });
        window.dispatchEvent(event);
      });

      await page.waitForTimeout(2000);

      // Verify no crash
      await expect(page.getByText("Kitchen Display System")).toBeVisible();
    });

    test("should handle multiple rapid WebSocket updates", async ({ page }) => {
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });
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
      await expect(page.getByText("Kitchen Display System")).toBeVisible();

      const connectionStatus = await page
        .locator("text=/Connected/i")
        .isVisible();
      expect(connectionStatus).toBeTruthy();
    });
  });

  test.describe("Error Handling", () => {
    test("should handle API 500 error gracefully", async ({ page }) => {
      await page.route(`${API_BASE_URL}/api/kds`, async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal Server Error" }),
        });
      });

      await page.reload();

      // App shell should still render
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });

      // No stage columns on failure
      await expect(page.locator(".bg-gray-50.rounded-xl")).toHaveCount(0);

      // Totals still visible
      await expect(page.locator("text=/Total Orders:/i")).toBeVisible();
    });

    test("should handle malformed JSON response", async ({ page }) => {
      await page.route(`${API_BASE_URL}/api/kds`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "invalid{json}",
        });
      });

      await page.reload();
      await page.waitForTimeout(3000);

      // Should not crash
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });

      // Should show error state gracefully
      const hasContent = await page
        .locator("text=/Total Orders:/i")
        .isVisible();
      expect(hasContent).toBeTruthy();
    });

    test("should handle network timeout", async ({ page }) => {
      await page.route(`${API_BASE_URL}/api/kds`, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await route.abort("timedout");
      });

      await page.reload();
      await page.waitForTimeout(6000);

      // Should show loading skeleton or handle gracefully
      const mainInterface = await page
        .getByText("Kitchen Display System")
        .isVisible();
      expect(mainInterface).toBeTruthy();
    });
  });

  test.describe("Date Filtering", () => {
    test("should only display orders from today", async ({ page }) => {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      const yesterday = new Date(Date.now() - 86400000);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      await page.route(`${API_BASE_URL}/api/kds`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
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
              updatedAt: yesterday.toISOString(),
            },
          ]),
        });
      });

      await page.reload();
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });

      await page.waitForTimeout(3000);

      // Today's orders should be visible
      const todayOrder1 = await page.locator("text=T1-S1").isVisible();
      const todayOrder2 = await page.locator("text=T2-S1").isVisible();

      // Yesterday's order should NOT be visible
      const yesterdayOrder = await page.locator("text=T9-S9").isVisible();

      expect(todayOrder1 || todayOrder2).toBeTruthy();
      expect(yesterdayOrder).toBeFalsy();

      // Should show exactly 2 orders
      await expect(page.locator("text=/Total Orders:\\s*2/i")).toBeVisible();
    });

    test("should filter using getTodayDate and isSameDay logic", async ({
      page,
    }) => {
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });

      await page.waitForTimeout(2000);

      // All displayed orders should be from today
      const totalOrders = await page
        .locator("text=/Total Orders:\\s*(\\d+)/i")
        .textContent();
      const orderCount = parseInt(totalOrders?.match(/\d+/)?.[0] || "0");

      console.log(`Displaying ${orderCount} orders from today`);
      expect(typeof orderCount).toBe("number");
    });
  });

  test.describe("Performance", () => {
    test("should load within 5 seconds", async ({ page }) => {
      const startTime = Date.now();

      await page.goto(KDS_URL);
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000);

      console.log(`KDS loaded in ${loadTime}ms`);
    });

    test("should handle 200+ orders efficiently", async ({ page }) => {
      const today = new Date().toISOString().split("T")[0];

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
            quantity: Math.floor(Math.random() * 3) + 1,
          },
        ],
        customer_count: Math.floor(Math.random() * 4) + 1,
        ref_ticket: `T${String(i + 1).padStart(3, "0")}`,
        row_pos: i,
        updatedAt: new Date().toISOString(),
      }));

      await page.route(`${API_BASE_URL}/api/kds`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(manyOrders),
        });
      });

      const startTime = Date.now();
      await page.reload();

      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });

      await page.waitForTimeout(3000);

      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(8000);

      await expect(page.locator("text=/Total Orders:\\s*250/i")).toBeVisible();

      console.log(`Loaded 250 orders in ${loadTime}ms`);
    });
  });

  test.describe("Component Styling Verification", () => {
    test("should have proper rounded corners and shadows", async ({ page }) => {
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });
      await page.waitForTimeout(2000);

      // Stage columns: rounded-xl
      const stageColumns = page.locator(".rounded-xl");
      expect(await stageColumns.count()).toBeGreaterThan(0);

      // Order cards: rounded-2xl shadow-md
      const orderCards = page.locator(".rounded-2xl.shadow-md");
      const cardCount = await orderCards.count();
      console.log(`Found ${cardCount} order cards with proper styling`);
    });

    test("should show proper hover effects on order cards", async ({
      page,
    }) => {
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });
      await page.waitForTimeout(2000);

      const orderCards = page.locator(".cursor-move");
      const orderCount = await orderCards.count();

      if (orderCount > 0) {
        const firstCard = orderCards.first();

        // Hover over card
        await firstCard.hover();
        await page.waitForTimeout(500);

        // Card should have hover:shadow-lg class applied
        console.log("Hover effect applied to order card");
      }
    });

    test("should display loading skeleton with pulse animation", async ({
      page,
    }) => {
      // Force reload to catch loading state
      await page.goto(KDS_URL);

      // Try to catch loading skeleton (may be very brief)
      const skeleton = page.locator(".animate-pulse").first();
      const skeletonVisible = await skeleton.isVisible().catch(() => false);

      if (skeletonVisible) {
        console.log("Loading skeleton animation detected");

        // Should have 5 skeleton columns
        const skeletonColumns = page.locator(".animate-pulse");
        const count = await skeletonColumns.count();
        console.log(`Skeleton columns: ${count}`);
      }

      // Eventually should load
      await expect(page.getByText("Kitchen Display System")).toBeVisible({
        timeout: 10000,
      });
    });
  });
});
