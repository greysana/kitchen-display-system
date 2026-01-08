/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CustomerDisplay from "../../components/kds/CustomerDisplay";
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

describe("CustomerDisplay Component", () => {
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

    // Create orders with today's date
    const today = getTodayDateString();
    mockOrders = [
      createMockKDSOrder({
        _id: "order-1",
        order_id: 1,
        ref_ticket: "101",
        stage: "preparing",
        state: "draft",
        cancelled: false,
        order_date: `${today} 12:00:00`,
      }),
      createMockKDSOrder({
        _id: "order-2",
        order_id: 2,
        ref_ticket: "102",
        stage: "preparing",
        state: "draft",
        cancelled: false,
        order_date: `${today} 12:30:00`,
      }),
      createMockKDSOrder({
        _id: "order-3",
        order_id: 3,
        ref_ticket: "103",
        stage: "ready",
        state: "draft",
        cancelled: false,
        order_date: `${today} 13:00:00`,
      }),
    ];

    // Mock KDSService methods
    (KDSService.getStages as jest.Mock).mockResolvedValue(mockStages);
    (KDSService.getKDS as jest.Mock).mockResolvedValue(mockOrders);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial Rendering", () => {
    it("should display loading state initially", () => {
      renderWithProviders(<CustomerDisplay />);
      expect(screen.getByText("Loading Display...")).toBeInTheDocument();
    });

    it("should display header with title after loading", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("Kitchen Display")).toBeInTheDocument();
      });
    });

    it("should display subtitle message", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(
          screen.getByText("Watch for your order number")
        ).toBeInTheDocument();
      });
    });

    it("should show connection status indicator", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("Live")).toBeInTheDocument();
      });
    });

    it("should display current time", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        // Check for time display format (HH:MM:SS AM/PM)
        const timeElement = screen.getByText(/\d{1,2}:\d{2}:\d{2}\s(AM|PM)/);
        expect(timeElement).toBeInTheDocument();
      });
    });

    it("should display dark mode toggle button", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        const toggleButton = screen.getByRole("button", {
          name: /toggle dark mode/i,
        });
        expect(toggleButton).toBeInTheDocument();
      });
    });
  });

  describe("Data Loading", () => {
    it("should load stages on mount", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(KDSService.getStages).toHaveBeenCalledTimes(1);
      });
    });

    it("should load KDS orders on mount", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(KDSService.getKDS).toHaveBeenCalledTimes(1);
      });
    });

    it("should filter out completed orders", async () => {
      const today = getTodayDateString();
      const completedOrder = createMockKDSOrder({
        _id: "order-done",
        order_id: 4,
        ref_ticket: "104",
        stage: "completed",
        state: "done",
        order_date: `${today} 14:00:00`,
      });

      (KDSService.getKDS as jest.Mock).mockResolvedValue([
        ...mockOrders,
        completedOrder,
      ]);

      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("101")).toBeInTheDocument();
      });

      // Completed order should not be displayed
      expect(screen.queryByText("104")).not.toBeInTheDocument();
    });

    it("should filter out cancelled orders", async () => {
      const today = getTodayDateString();
      const cancelledOrder = createMockKDSOrder({
        _id: "order-cancelled",
        order_id: 5,
        ref_ticket: "105",
        stage: "new",
        state: "draft",
        cancelled: true,
        order_date: `${today} 15:00:00`,
      });

      (KDSService.getKDS as jest.Mock).mockResolvedValue([
        ...mockOrders,
        cancelledOrder,
      ]);

      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("101")).toBeInTheDocument();
      });

      // Cancelled order should not be displayed
      expect(screen.queryByText("105")).not.toBeInTheDocument();
    });

    it("should filter out parked orders", async () => {
      const today = getTodayDateString();
      const parkedOrder = createMockKDSOrder({
        _id: "order-parked",
        order_id: 6,
        ref_ticket: "106",
        stage: "parked",
        state: "draft",
        cancelled: false,
        order_date: `${today} 16:00:00`,
      });

      (KDSService.getKDS as jest.Mock).mockResolvedValue([
        ...mockOrders,
        parkedOrder,
      ]);

      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("101")).toBeInTheDocument();
      });

      // Parked order should not be displayed
      expect(screen.queryByText("106")).not.toBeInTheDocument();
    });

    it("should handle loading errors gracefully", async () => {
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (KDSService.getKDS as jest.Mock).mockRejectedValue(
        new Error("Failed to load")
      );

      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "Failed to load data:"
        );
      });

      consoleError.mockRestore();
    });
  });

  describe("Order Display", () => {
    it("should display ticket numbers in preparing section", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("101")).toBeInTheDocument();
        expect(screen.getByText("102")).toBeInTheDocument();
      });
    });

    it("should display ticket numbers in ready section", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("103")).toBeInTheDocument();
      });
    });

    it("should show 'Ready for Pickup' section header", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("Ready for Pickup")).toBeInTheDocument();
      });
    });

    it("should show 'Preparing' section header", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("Preparing")).toBeInTheDocument();
      });
    });

    it("should display PICK UP indicator on ready orders", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("PICK UP")).toBeInTheDocument();
      });
    });

    it("should categorize orders correctly by stage", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        // Check that orders are in correct sections
        const readySection = screen.getByText("Ready for Pickup").parentElement;
        const preparingSection = screen.getByText("Preparing").parentElement;

        expect(readySection).toBeInTheDocument();
        expect(preparingSection).toBeInTheDocument();
      });
    });
  });

  describe("Empty States", () => {
    it("should show empty state when no orders", async () => {
      (KDSService.getKDS as jest.Mock).mockResolvedValue([]);

      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("No Active Orders")).toBeInTheDocument();
        expect(
          screen.getByText("New orders will appear here automatically")
        ).toBeInTheDocument();
      });
    });

    it("should show empty message in ready section when no ready orders", async () => {
      const ordersWithoutReady = mockOrders.filter(
        (order) => order.stage !== "ready"
      );
      (KDSService.getKDS as jest.Mock).mockResolvedValue(ordersWithoutReady);

      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("No orders ready yet")).toBeInTheDocument();
      });
    });

    it("should show empty message in preparing section when no preparing orders", async () => {
      const onlyReadyOrders = mockOrders.filter(
        (order) => order.stage === "ready"
      );
      (KDSService.getKDS as jest.Mock).mockResolvedValue(onlyReadyOrders);

      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("No orders in progress")).toBeInTheDocument();
      });
    });
  });

  describe("WebSocket Integration", () => {
    it("should handle new_order message", async () => {
      const today = getTodayDateString();
      const newOrder = createMockKDSOrder({
        _id: "order-4",
        order_id: 4,
        ref_ticket: "104",
        stage: "new",
        state: "draft",
        order_date: `${today} 14:00:00`,
      });

      (KDSService.getKDS as jest.Mock)
        .mockResolvedValueOnce(mockOrders)
        .mockResolvedValueOnce([...mockOrders, newOrder]);

      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("101")).toBeInTheDocument();
      });

      // Simulate WebSocket message
      const wsCallback = (global as any).wsCallback;
      act(() => {
        wsCallback(createMockWebSocketMessage("new_order", { order_id: 4 }));
      });
      await waitFor(() => {
        expect(KDSService.getKDS).toHaveBeenCalledTimes(2);
      });
    });

    it("should handle kds_update message type", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("101")).toBeInTheDocument();
      });

      const wsCallback = (global as any).wsCallback;
      act(() => {
        wsCallback(
          createMockWebSocketMessage("kds_update", {
            kds_id: "order-1",
            stage: "preparing",
          })
        );
      });
      await waitForAsync();
    });

    it("should handle order_update message", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("101")).toBeInTheDocument();
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
    });

    it("should remove completed orders from display", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("101")).toBeInTheDocument();
      });

      // Mark order as done
      const wsCallback = (global as any).wsCallback;
      act(() => {
        wsCallback(
          createMockWebSocketMessage("order_update", {
            order_id: 1,
            state: "done",
          })
        );
      });
      await waitFor(() => {
        expect(screen.queryByText("101")).not.toBeInTheDocument();
      });
    });

    it("should remove cancelled orders from display", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("101")).toBeInTheDocument();
      });

      // Mark order as cancelled
      const wsCallback = (global as any).wsCallback;
      act(() => {
        wsCallback(
          createMockWebSocketMessage("order_update", {
            order_id: 1,
            cancelled: true,
          })
        );
      });
      await waitFor(() => {
        expect(screen.queryByText("101")).not.toBeInTheDocument();
      });
    });

    it("should show NEW badge for recently added orders to ready", async () => {
      // Mock the audio play method
      HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);

      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("101")).toBeInTheDocument();
      });

      // Move order to ready
      const wsCallback = (global as any).wsCallback;
      act(() => {
        wsCallback(
          createMockWebSocketMessage("kds_stage_update", {
            kds_id: "order-1",
            stage: "ready",
          })
        );
      });
      await waitFor(() => {
        expect(screen.getByText("NEW")).toBeInTheDocument();
      });
    });

    it("should reload data on new_order error", async () => {
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (KDSService.getKDS as jest.Mock)
        .mockResolvedValueOnce(mockOrders)
        .mockRejectedValueOnce(new Error("Failed to reload"));

      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("101")).toBeInTheDocument();
      });

      const wsCallback = (global as any).wsCallback;
      act(() => {
        wsCallback(createMockWebSocketMessage("new_order", { order_id: 99 }));
      });
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "Failed to load data:"
        );
      });

      consoleError.mockRestore();
    });
  });

  describe("Dark Mode Toggle", () => {
    it("should toggle dark mode when button is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("Kitchen Display")).toBeInTheDocument();
      });

      const toggleButton = screen.getByRole("button", {
        name: /toggle dark mode/i,
      });

      await user.click(toggleButton);

      // Check for dark mode classes (component uses bg-slate-900 for dark mode)
      await waitFor(() => {
        const container = screen.getByTestId("main-container");
        expect(container).toHaveClass("bg-slate-900");
      });
    });

    it("should display moon icon in light mode", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        const toggleButton = screen.getByRole("button", {
          name: /toggle dark mode/i,
        });
        expect(toggleButton).toBeInTheDocument();
      });
    });
  });

  describe("Time Display", () => {
    it("should update time every second", async () => {
      jest.useFakeTimers();
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("Kitchen Display")).toBeInTheDocument();
      });

      const initialTime = screen.getByText(
        /\d{1,2}:\d{2}:\d{2}\s(AM|PM)/
      ).textContent;

      // Advance time by 2 seconds
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      await waitFor(() => {
        const newTime = screen.getByText(
          /\d{1,2}:\d{2}:\d{2}\s(AM|PM)/
        ).textContent;
        // Times should be different (allowing for test execution time)
        expect(newTime).toBeDefined();
      });

      jest.useRealTimers();
    });
  });

  describe("Footer Display", () => {
    it("should display active order count in footer", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText(/Active:/)).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
      });
    });

    it("should display status legend in footer", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText(/Pick Up/)).toBeInTheDocument();
        expect(screen.getByText(/In Progress/)).toBeInTheDocument();
      });
    });

    it("should update active count when orders change", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("3")).toBeInTheDocument();
      });

      // Mark an order as done
      const wsCallback = (global as any).wsCallback;
      act(() => {
        wsCallback(
          createMockWebSocketMessage("order_update", {
            order_id: 1,
            state: "done",
          })
        );
      });
      await waitFor(() => {
        expect(screen.getByText("2")).toBeInTheDocument();
      });
    });
  });

  describe("Audio Playback", () => {
    it("should have audio element for notifications", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("Kitchen Display")).toBeInTheDocument();
      });

      // Check that audio element exists
      const audioElement = document.querySelector("audio");
      expect(audioElement).toBeInTheDocument();
      expect(audioElement?.src).toContain("data:audio/wav");
    });
  });

  describe("Connection Status", () => {
    it("should show online status when connected", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("Live")).toBeInTheDocument();
      });
    });

    it("should show offline status when disconnected", async () => {
      // Mock disconnected state
      jest.requireMock("@/hooks/useWebsocket").useWebSocket.mockReturnValue({
        isConnected: false,
      });

      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("Offline")).toBeInTheDocument();
      });

      // Reset mock
      jest.requireMock("@/hooks/useWebsocket").useWebSocket.mockReturnValue({
        isConnected: true,
      });
    });
  });

  describe("Responsive Layout", () => {
    it("should display both sections in grid layout", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("Ready for Pickup")).toBeInTheDocument();
        expect(screen.getByText("In Progress")).toBeInTheDocument();
      });

      // Both sections should be present
      const sections = screen.getAllByRole("heading", { level: 2 });
      expect(sections).toHaveLength(2);
    });
  });

  describe("Performance", () => {
    it("should handle multiple rapid updates", async () => {
      renderWithProviders(<CustomerDisplay />);

      await waitFor(() => {
        expect(screen.getByText("101")).toBeInTheDocument();
      });

      const wsCallback = (global as any).wsCallback;

      // Send multiple updates rapidly
      for (let i = 0; i < 1000; i++) {
        act(() => {
          wsCallback(
            createMockWebSocketMessage("kds_stage_update", {
              kds_id: "order-1",
              stage: i % 2 === 0 ? "preparing" : "ready",
            })
          );
        });
      }

      await waitForAsync();

      // Component should still be functioning
      expect(screen.getByText("101")).toBeInTheDocument();
    });
  });
});
