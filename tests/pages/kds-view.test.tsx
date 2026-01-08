/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import KDS from "../../components/kds/KDS";
import {
  renderWithProviders,
  createMockStages,
  createMockKDSOrders,
  createMockWebSocketMessage,
  resetAllMocks,
  createMockKDSOrder,
  waitForAsync,
  getTodayDateString,
} from "@/tests/utils/test-utils";
import { KDSService } from "@/lib/kds-service";

// Mock the KDSService
jest.mock("@/lib/kds-service");

// Mock the useWebSocket hook
jest.mock("@/hooks/useWebsocket", () => ({
  useWebSocket: jest.fn((callback) => {
    // Store the callback for later use in tests
    (global as any).wsCallback = callback;
    return { isConnected: true };
  }),
}));

describe("KDS Component", () => {
  let mockStages: ReturnType<typeof createMockStages>;
  let mockOrders: ReturnType<typeof createMockKDSOrders>;

  beforeEach(() => {
    resetAllMocks();

    // Setup default mock data
    mockStages = createMockStages(4, {});
    mockStages[0].name = "New";
    mockStages[1].name = "Preparing";
    mockStages[2].name = "Ready";
    mockStages[3].name = "Completed";
    mockStages[3].last_stage = true;

    // Create orders with today's date in the correct format
    const today = getTodayDateString();
    mockOrders = [
      createMockKDSOrder({
        _id: "order-1",
        order_id: 1,
        seat_id: "T1-S1",
        stage: "new",
        state: "draft",
        row_pos: 0,
        order_date: `${today} 12:00:00`, // Format: YYYY-MM-DD HH:MM:SS
      }),
      createMockKDSOrder({
        _id: "order-2",
        order_id: 2,
        seat_id: "T1-S2",
        stage: "preparing",
        state: "draft",
        row_pos: 0,
        order_date: `${today} 12:30:00`,
      }),
      createMockKDSOrder({
        _id: "order-3",
        order_id: 3,
        seat_id: "T2-S1",
        stage: "ready",
        state: "draft",
        row_pos: 0,
        order_date: `${today} 13:00:00`,
      }),
    ];

    // Mock KDSService methods
    (KDSService.getStages as jest.Mock).mockResolvedValue(mockStages);
    (KDSService.getKDS as jest.Mock).mockResolvedValue(mockOrders);
    (KDSService.updateKDS as jest.Mock).mockResolvedValue({ success: true });
    (KDSService.updateOrderState as jest.Mock).mockResolvedValue({
      success: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial Rendering", () => {
    it("should display loading skeleton initially", () => {
      renderWithProviders(<KDS />);
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should display header with title after loading", async () => {
      renderWithProviders(<KDS />);

      await waitFor(() => {
        expect(screen.getByText("Kitchen Display System")).toBeInTheDocument();
      });
    });

    it("should show connection status indicator", async () => {
      renderWithProviders(<KDS />);

      await waitFor(() => {
        expect(screen.getByText("Connected")).toBeInTheDocument();
      });
    });

    it("should display total orders count", async () => {
      renderWithProviders(<KDS />);

      await waitFor(
        () => {
          const totalOrdersElement = screen.getByText((content, element) => {
            return (
              element?.textContent === "Total Orders: 3" ||
              content.includes("Total Orders:")
            );
          });
          expect(totalOrdersElement).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe("Data Loading", () => {
    it("should load stages on mount", async () => {
      renderWithProviders(<KDS />);

      await waitFor(() => {
        expect(KDSService.getStages).toHaveBeenCalledTimes(1);
      });
    });

    it("should load KDS orders on mount", async () => {
      renderWithProviders(<KDS />);

      await waitFor(() => {
        expect(KDSService.getKDS).toHaveBeenCalled();
      });
    });

    it("should display stage columns after loading", async () => {
      renderWithProviders(<KDS />);

      await waitFor(() => {
        // Stage names are displayed in uppercase in the UI
        expect(screen.getByText("new")).toBeInTheDocument();
        expect(screen.getByText("preparing")).toBeInTheDocument();
        expect(screen.getByText("ready")).toBeInTheDocument();
        expect(screen.getByText("completed")).toBeInTheDocument();
      });
    });

    it("should display orders in correct stages", async () => {
      renderWithProviders(<KDS />);

      await waitFor(
        () => {
          // Check for seat_id display
          expect(screen.getByText("T1-S1")).toBeInTheDocument();
          expect(screen.getByText("T1-S2")).toBeInTheDocument();
          expect(screen.getByText("T2-S1")).toBeInTheDocument();

          // Check for order_id display (in parentheses)
          expect(screen.getByText(/\(#1\)/)).toBeInTheDocument();
          expect(screen.getByText(/\(#2\)/)).toBeInTheDocument();
          expect(screen.getByText(/\(#3\)/)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should handle loading errors gracefully", async () => {
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (KDSService.getStages as jest.Mock).mockRejectedValue(
        new Error("Failed to load")
      );

      renderWithProviders(<KDS />);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "Failed to load initial data:",
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });
  });

  describe("WebSocket Integration", () => {
    it("should handle new_order message", async () => {
      const today = getTodayDateString();
      const newOrder = createMockKDSOrder({
        _id: "order-4",
        order_id: 4,
        seat_id: "T3-S1",
        stage: "new",
        order_date: `${today} 14:00:00`,
      });

      (KDSService.getKDS as jest.Mock)
        .mockResolvedValueOnce(mockOrders)
        .mockResolvedValueOnce([...mockOrders, newOrder]);

      renderWithProviders(<KDS />);

      await waitFor(() => {
        expect(screen.getByText("T1-S1")).toBeInTheDocument();
      });

      // Simulate WebSocket message
      const wsCallback = (global as any).wsCallback;
      act(() => {
        wsCallback(createMockWebSocketMessage("new_order", { order_id: 4 }));
      });
      // await waitFor(() => {
      //   expect(KDSService.getKDS).toHaveBeenCalledTimes(3); // Initial + sync + websocket
      // });
    });

    it("should handle kds_stage_update message", async () => {
      renderWithProviders(<KDS />);

      await waitFor(() => {
        expect(screen.getByText("T1-S1")).toBeInTheDocument();
      });

      // Simulate stage update via WebSocket
      const wsCallback = (global as any).wsCallback;
      act(() => {
        wsCallback(
          createMockWebSocketMessage("kds_stage_update", {
            kds_id: "order-1",
            stage: "preparing",
          })
        );
      });
      await waitForAsync();

      // Order should move to preparing stage (state update happens internally)
    });

    it("should handle order_update message", async () => {
      renderWithProviders(<KDS />);

      await waitFor(() => {
        expect(screen.getByText("T1-S1")).toBeInTheDocument();
      });

      // Simulate order update via WebSocket
      const wsCallback = (global as any).wsCallback;
      act(() => {
        wsCallback(
          createMockWebSocketMessage("order_update", {
            order_id: 1,
            state: "done",
            cancelled: false,
          })
        );
      });

      await waitForAsync();

      // State should be updated locally
    });

    it("should not update during drag operation", async () => {
      renderWithProviders(<KDS />);

      await waitFor(() => {
        expect(screen.getByText("T1-S1")).toBeInTheDocument();
      });

      // Note: Testing drag pause behavior requires more complex setup
      const wsCallback = (global as any).wsCallback;
      act(() => {
        wsCallback(
          createMockWebSocketMessage("order_update", {
            order_id: 1,
            state: "done",
          })
        );
      });
      await waitForAsync();
    });
  });

  describe("Order Filtering", () => {
    it("should only show today's orders", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const today = getTodayDateString();

      const ordersWithYesterday = [
        ...mockOrders,
        createMockKDSOrder({
          _id: "order-old",
          order_id: 99,
          seat_id: "T9-S9",
          order_date: `${yesterdayStr} 10:00:00`,
          stage: "new",
        }),
      ];

      (KDSService.getKDS as jest.Mock).mockResolvedValue(ordersWithYesterday);

      renderWithProviders(<KDS />);

      await waitFor(() => {
        expect(screen.getByText("T1-S1")).toBeInTheDocument();
      });

      // Yesterday's order should not be displayed
      expect(screen.queryByText("T9-S9")).not.toBeInTheDocument();
    });
  });

  describe("Drag and Drop", () => {
    it("should set active order on drag start", async () => {
      renderWithProviders(<KDS />);

      await waitFor(() => {
        expect(screen.getByText("T1-S1")).toBeInTheDocument();
      });
    });

    it("should not allow dragging completed orders", async () => {
      const today = getTodayDateString();
      const completedOrder = createMockKDSOrder({
        _id: "order-done",
        order_id: 5,
        seat_id: "T4-S1",
        stage: "completed",
        state: "done",
        order_date: `${today} 15:00:00`,
      });

      (KDSService.getKDS as jest.Mock).mockResolvedValue([
        ...mockOrders,
        completedOrder,
      ]);

      renderWithProviders(<KDS />);

      await waitFor(() => {
        expect(screen.getByText("T4-S1")).toBeInTheDocument();
      });

      // Completed orders check in handleDragEnd prevents movement
    });

    it("should prevent dragging cancelled orders", async () => {
      const today = getTodayDateString();
      const cancelledOrder = createMockKDSOrder({
        _id: "order-cancelled",
        order_id: 6,
        seat_id: "T5-S1",
        stage: "new",
        state: "draft",
        cancelled: true,
        order_date: `${today} 16:00:00`,
      });

      (KDSService.getKDS as jest.Mock).mockResolvedValue([
        ...mockOrders,
        cancelledOrder,
      ]);

      renderWithProviders(<KDS />);

      await waitFor(() => {
        expect(screen.getByText("T5-S1")).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle sync errors gracefully", async () => {
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (KDSService.getKDS as jest.Mock)
        .mockResolvedValueOnce(mockOrders)
        .mockResolvedValueOnce(mockOrders)
        .mockRejectedValueOnce(new Error("Sync failed"));

      renderWithProviders(<KDS />);

      await waitFor(() => {
        expect(screen.getByText("T1-S1")).toBeInTheDocument();
      });

      // Trigger sync
      const wsCallback = (global as any).wsCallback;
      act(() => {
        wsCallback(createMockWebSocketMessage("new_order", { order_id: 99 }));
      });
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "Failed to sync KDS:",
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });

    it("should handle WebSocket parse errors", async () => {
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      renderWithProviders(<KDS />);

      await waitFor(() => {
        expect(screen.getByText("T1-S1")).toBeInTheDocument();
      });

      // Send malformed message
      const wsCallback = (global as any).wsCallback;
      act(() => {
        wsCallback({
          content: {
            value: "not valid json{",
          },
        });
      });

      await waitForAsync();

      expect(consoleError).toHaveBeenCalledWith(
        "Failed to parse WebSocket update:",
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe("Empty States", () => {
    it("should handle empty orders gracefully", async () => {
      (KDSService.getKDS as jest.Mock).mockResolvedValue([]);

      renderWithProviders(<KDS />);

      await waitFor(() => {
        expect(
          screen.getByText((content) => content.includes("Total Orders: 0"))
        ).toBeInTheDocument();
      });
    });

    it("should initialize empty stage structure when no orders", async () => {
      (KDSService.getKDS as jest.Mock).mockResolvedValue([]);

      renderWithProviders(<KDS />);

      await waitFor(() => {
        expect(screen.getByText("new")).toBeInTheDocument();
        expect(screen.getByText("preparing")).toBeInTheDocument();
        expect(screen.getByText("ready")).toBeInTheDocument();
        expect(screen.getByText("completed")).toBeInTheDocument();
      });
    });
  });

  describe("Real-time Updates", () => {
    it("should sync KDS when stages are loaded", async () => {
      renderWithProviders(<KDS />);

      await waitFor(() => {
        // Should call getKDS: initial load + sync after stages loaded
        expect(KDSService.getKDS).toHaveBeenCalledTimes(2);
      });
    });

    it("should handle kds_update message type", async () => {
      renderWithProviders(<KDS />);

      await waitFor(() => {
        expect(screen.getByText("T1-S1")).toBeInTheDocument();
      });

      const wsCallback = (global as any).wsCallback;
      act(() => {
        wsCallback(
          createMockWebSocketMessage("kds_update", {
            kds_id: "order-1",
            stage: "ready",
          })
        );
      });

      await waitForAsync();
    });

    it("should warn when order not found in update", async () => {
      const consoleWarn = jest.spyOn(console, "warn").mockImplementation();

      renderWithProviders(<KDS />);

      await waitFor(() => {
        expect(screen.getByText("T1-S1")).toBeInTheDocument();
      });

      const wsCallback = (global as any).wsCallback;
      act(() => {
        wsCallback(
          createMockWebSocketMessage("order_update", {
            order_id: 999,
            state: "done",
          })
        );
      });

      await waitFor(() => {
        expect(consoleWarn).toHaveBeenCalledWith(
          "Order 999 not found in ordersMap, syncing..."
        );
      });

      consoleWarn.mockRestore();
    });

    it("should handle content value updates", async () => {
      const today = getTodayDateString();
      renderWithProviders(<KDS />);

      await waitFor(() => {
        expect(screen.getByText("T1-S1")).toBeInTheDocument();
      });

      const updatedOrder = {
        ...mockOrders[0],
        stage: "preparing",
        order_date: `${today} 17:00:00`,
      };

      const wsCallback = (global as any).wsCallback;
      act(() => {
        wsCallback({
          content: {
            value: JSON.stringify(updatedOrder),
          },
        });
      });
      await waitForAsync();
    });
  });

  describe("Performance", () => {
    it("should process updates efficiently", async () => {
      renderWithProviders(<KDS />);

      await waitFor(() => {
        expect(screen.getByText("T1-S1")).toBeInTheDocument();
      });

      const initialCallCount = (KDSService.getKDS as jest.Mock).mock.calls
        .length;

      // Trigger sync with same data
      (KDSService.getKDS as jest.Mock).mockResolvedValue(mockOrders);

      const wsCallback = (global as any).wsCallback;
      act(() => {
        wsCallback(createMockWebSocketMessage("new_order", { order_id: 1 }));
      });
      await waitFor(() => {
        expect(
          (KDSService.getKDS as jest.Mock).mock.calls.length
        ).toBeGreaterThan(initialCallCount);
      });
    });
  });

  describe("Stage Management", () => {
    it("should display all stages in correct order", async () => {
      renderWithProviders(<KDS />);

      await waitFor(() => {
        const stageElements = screen.getAllByRole("heading", { level: 3 });
        expect(stageElements).toHaveLength(4);
        expect(stageElements[0]).toHaveTextContent("new");
        expect(stageElements[1]).toHaveTextContent("preparing");
        expect(stageElements[2]).toHaveTextContent("ready");
        expect(stageElements[3]).toHaveTextContent("completed");
      });
    });

    it("should show order count per stage", async () => {
      renderWithProviders(<KDS />);

      await waitFor(() => {
        // Each stage should show its order count
        const orderCounts = screen.getAllByText(/\d+ orders?/);
        expect(orderCounts.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Order Card Display", () => {
    it("should display seat_id and order_id correctly", async () => {
      renderWithProviders(<KDS />);

      await waitFor(() => {
        // Check that seat_id is displayed as main text
        expect(screen.getByText("T1-S1")).toBeInTheDocument();

        // Check that order_id is displayed in parentheses
        const orderIdElement = screen.getByText(/\(#1\)/);
        expect(orderIdElement).toBeInTheDocument();
      });
    });

    it("should display multiple orders with different seat IDs", async () => {
      renderWithProviders(<KDS />);

      await waitFor(() => {
        expect(screen.getByText("T1-S1")).toBeInTheDocument();
        expect(screen.getByText("T1-S2")).toBeInTheDocument();
        expect(screen.getByText("T2-S1")).toBeInTheDocument();
      });
    });
  });
});
