/* eslint-disable @typescript-eslint/no-explicit-any */
import { KDSService } from "@/lib/kds-service";
import {
  resetAllMocks,
  mockSuccessfulFetch,
  mockFailedFetch,
  createMockKDSOrders,
  createMockStages,
  createMockTables,
  createMockOrderItem,
} from "@/tests/utils/test-utils";

describe("KDSService", () => {
  const mockToken = "test-auth-token-123";

  beforeEach(() => {
    resetAllMocks();
    KDSService.clearCache();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe("getKDS", () => {
    it("should fetch and return KDS orders with auth token", async () => {
      const mockOrders = createMockKDSOrders(3);
      mockSuccessfulFetch(mockOrders);

      const result = await KDSService.getKDS(mockToken);

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:8073/api/kds",
        {
          headers: {
            "Content-Type": "application/json",
            "X-API-Token": `${mockToken}`,
          },
        }
      );
      expect(result).toEqual(mockOrders);
    });

    it("should throw error when fetch fails", async () => {
      mockFailedFetch(500, "Internal Server Error");

      await expect(KDSService.getKDS(mockToken)).rejects.toThrow(
        "HTTP error! status: 500"
      );
    });

    it("should throw error when token is missing", async () => {
      await expect(KDSService.getKDS("")).rejects.toThrow();
    });

    it("should handle empty orders array", async () => {
      mockSuccessfulFetch([]);

      const result = await KDSService.getKDS(mockToken);

      expect(result).toEqual([]);
    });

    it("should handle 401 unauthorized error", async () => {
      mockFailedFetch(401, "Unauthorized");

      await expect(KDSService.getKDS(mockToken)).rejects.toThrow(
        "uthentication required. Please login again."
      );
    });
  });

  describe("updateKDS", () => {
    const orderId = "kds-123";

    it("should update KDS order with stage change and auth token", async () => {
      const updates = { stage: "preparing" };
      mockSuccessfulFetch({ success: true, data: updates });

      const result = await KDSService.updateKDS(orderId, updates, mockToken);

      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:8073/api/kds/${orderId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Token": `${mockToken}`,
          },
          body: JSON.stringify({ stage: "preparing" }),
        }
      );
      expect(result).toEqual({ success: true, data: updates });
    });

    it("should update KDS order with row_pos change", async () => {
      const updates = { row_pos: 5 };
      mockSuccessfulFetch({ success: true });

      await KDSService.updateKDS(orderId, updates, mockToken);

      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:8073/api/kds/${orderId}`,
        expect.objectContaining({
          body: JSON.stringify({ row_pos: 5 }),
          headers: expect.objectContaining({
            "X-API-Token": `${mockToken}`,
          }),
        })
      );
    });

    it("should update KDS order with state change", async () => {
      const updates = { state: "done" };
      mockSuccessfulFetch({ success: true });

      await KDSService.updateKDS(orderId, updates, mockToken);

      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:8073/api/kds/${orderId}`,
        expect.objectContaining({
          body: JSON.stringify({ state: "done" }),
        })
      );
    });

    it("should update KDS order with items", async () => {
      const items = [
        createMockOrderItem({
          ordered_prod_id: 1,
          product_name: "Pizza",
          quantity: 2,
          note: "Extra cheese",
        }),
      ];
      const updates = { items };
      mockSuccessfulFetch({ success: true });

      await KDSService.updateKDS(orderId, updates, mockToken);

      const expectedPayload = {
        items: [
          {
            ordered_prod_id: 1,
            product_name: "Pizza",
            quantity: 2,
            note: "Extra cheese",
          },
        ],
      };

      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:8073/api/kds/${orderId}`,
        expect.objectContaining({
          body: JSON.stringify(expectedPayload),
        })
      );
    });

    it("should handle ref_ticket update correctly", async () => {
      const updates = { ref_ticket: "T12345" };
      mockSuccessfulFetch({ success: true });

      await KDSService.updateKDS(orderId, updates, mockToken);

      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:8073/api/kds/${orderId}`,
        expect.objectContaining({
          body: JSON.stringify({ ref_ticket: "T12345" }),
        })
      );
    });

    it('should not include ref_ticket when it is "false"', async () => {
      const updates = { ref_ticket: "false" };
      mockSuccessfulFetch({ success: true });

      await KDSService.updateKDS(orderId, updates, mockToken);

      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:8073/api/kds/${orderId}`,
        expect.objectContaining({
          body: JSON.stringify({}),
        })
      );
    });

    it("should update multiple fields at once", async () => {
      const updates = {
        stage: "ready",
        state: "done",
        row_pos: 3,
      };
      mockSuccessfulFetch({ success: true });

      await KDSService.updateKDS(orderId, updates, mockToken);

      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:8073/api/kds/${orderId}`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-API-Token": `${mockToken}`,
          }),
        })
      );

      const callBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body
      );
      expect(callBody).toEqual({
        stage: "ready",
        state: "done",
        row_pos: 3,
      });
    });

    it("should clear cache after successful update", async () => {
      mockSuccessfulFetch({ success: true });
      const clearCacheSpy = jest.spyOn(KDSService, "clearCache");

      await KDSService.updateKDS(orderId, { stage: "preparing" }, mockToken);

      expect(clearCacheSpy).toHaveBeenCalled();
    });

    it("should throw error when update fails", async () => {
      mockFailedFetch(400, "Bad Request");

      await expect(
        KDSService.updateKDS(orderId, { stage: "invalid" }, mockToken)
      ).rejects.toThrow("Failed to update KDS: 400 - Bad Request");
    });

    it("should throw error when token is missing", async () => {
      await expect(
        KDSService.updateKDS(orderId, { stage: "preparing" }, "")
      ).rejects.toThrow();
    });

    it("should handle items with default values", async () => {
      const items = [
        createMockOrderItem({
          ordered_prod_id: 1,
          product_name: "",
          quantity: undefined as any,
          note: undefined as any,
        }),
      ];
      const updates = { items };
      mockSuccessfulFetch({ success: true });

      await KDSService.updateKDS(orderId, updates, mockToken);

      const expectedPayload = {
        items: [
          {
            ordered_prod_id: 1,
            product_name: "",
            quantity: 1,
            note: "",
          },
        ],
      };

      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:8073/api/kds/${orderId}`,
        expect.objectContaining({
          body: JSON.stringify(expectedPayload),
        })
      );
    });
  });

  describe("deleteKDS", () => {
    const orderId = "kds-123";

    it("should delete KDS order successfully with auth token", async () => {
      mockSuccessfulFetch({ success: true, deleted: true });

      const result = await KDSService.deleteKDS(orderId, mockToken);

      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:8073/api/kds/${orderId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "X-API-Token": `${mockToken}`,
          },
        }
      );
      expect(result).toEqual({ success: true, deleted: true });
    });

    it("should clear cache after successful deletion", async () => {
      mockSuccessfulFetch({ success: true });
      const clearCacheSpy = jest.spyOn(KDSService, "clearCache");

      await KDSService.deleteKDS(orderId, mockToken);

      expect(clearCacheSpy).toHaveBeenCalled();
    });

    it("should throw error when deletion fails", async () => {
      mockFailedFetch(404, "Not Found");

      await expect(KDSService.deleteKDS(orderId, mockToken)).rejects.toThrow(
        "Failed to delete KDS: 404 - Not Found"
      );
    });

    it("should throw error when token is missing", async () => {
      await expect(KDSService.deleteKDS(orderId, "")).rejects.toThrow();
    });

    it("should handle server errors during deletion", async () => {
      mockFailedFetch(500, "Internal Server Error");

      await expect(KDSService.deleteKDS(orderId, mockToken)).rejects.toThrow(
        "Failed to delete KDS: 500 - Internal Server Error"
      );
    });
  });

  describe("updateOrderState", () => {
    const orderId = 123;
    const state = "done";

    it("should update order state successfully with auth token", async () => {
      mockSuccessfulFetch({ success: true, state });

      const result = await KDSService.updateOrderState(
        orderId,
        state,
        mockToken
      );

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:8073/update-order-state",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Token": `${mockToken}`,
          },
          body: JSON.stringify({ id: orderId, state }),
        }
      );
      expect(result).toEqual({ success: true, state });
    });

    it("should handle different state values", async () => {
      const states = ["draft", "paid", "done", "cancel"];

      for (const testState of states) {
        mockSuccessfulFetch({ success: true, state: testState });
        await KDSService.updateOrderState(orderId, testState, mockToken);

        expect(global.fetch).toHaveBeenCalledWith(
          "http://localhost:8073/update-order-state",
          expect.objectContaining({
            body: JSON.stringify({ id: orderId, state: testState }),
            headers: expect.objectContaining({
              "Content-Type": "application/json",
              "X-API-Token": `${mockToken}`,
            }),
          })
        );
      }
    });

    it("should clear cache after successful state update", async () => {
      mockSuccessfulFetch({ success: true });
      const clearCacheSpy = jest.spyOn(KDSService, "clearCache");

      await KDSService.updateOrderState(orderId, state, mockToken);

      expect(clearCacheSpy).toHaveBeenCalled();
    });

    it("should throw error when state update fails", async () => {
      mockFailedFetch(400, "Invalid state");

      await expect(
        KDSService.updateOrderState(orderId, "invalid", mockToken)
      ).rejects.toThrow("Failed to update order state: 400");
    });

    it("should throw error when token is missing", async () => {
      await expect(
        KDSService.updateOrderState(orderId, state, "")
      ).rejects.toThrow();
    });
  });

  describe("getStages", () => {
    it("should fetch and return stages with auth token", async () => {
      const mockStages = createMockStages(4);
      mockSuccessfulFetch(mockStages);

      const result = await KDSService.getStages(mockToken);

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:8073/get-stages",
        {
          headers: {
            "Content-Type": "application/json",
            "X-API-Token": `${mockToken}`,
          },
        }
      );
      expect(result).toEqual(mockStages);
    });

    it("should cache stages data", async () => {
      const mockStages = createMockStages(3);
      mockSuccessfulFetch(mockStages);

      await KDSService.getStages(mockToken);
      await KDSService.getStages(mockToken);

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should fetch new data after cache expires", async () => {
      jest.useFakeTimers();
      const mockStages = createMockStages(2);
      mockSuccessfulFetch(mockStages);
      mockSuccessfulFetch(mockStages);

      await KDSService.getStages(mockToken);
      jest.advanceTimersByTime(31000); // Exceed CACHE_DURATION
      await KDSService.getStages(mockToken);

      expect(global.fetch).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    it("should throw error when fetch fails", async () => {
      mockFailedFetch(500);

      await expect(KDSService.getStages(mockToken)).rejects.toThrow(
        "HTTP error! status: 500"
      );
    });

    it("should throw error when token is missing", async () => {
      await expect(KDSService.getStages("")).rejects.toThrow();
    });
  });

  describe("getTables", () => {
    it("should fetch and return tables with auth token", async () => {
      const mockTables = createMockTables(5);
      mockSuccessfulFetch(mockTables);

      const result = await KDSService.getTables(mockToken);

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:8073/get-tables",
        {
          headers: {
            "Content-Type": "application/json",
            "X-API-Token": `${mockToken}`,
          },
        }
      );
      expect(result).toEqual(mockTables);
    });

    it("should cache tables data", async () => {
      const mockTables = createMockTables(3);
      mockSuccessfulFetch(mockTables);

      await KDSService.getTables(mockToken);
      await KDSService.getTables(mockToken);

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should fetch new data after cache expires", async () => {
      jest.useFakeTimers();
      const mockTables = createMockTables(2);
      mockSuccessfulFetch(mockTables);
      mockSuccessfulFetch(mockTables);

      await KDSService.getTables(mockToken);
      jest.advanceTimersByTime(31000);
      await KDSService.getTables(mockToken);

      expect(global.fetch).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    it("should throw error when fetch fails", async () => {
      mockFailedFetch(503);

      await expect(KDSService.getTables(mockToken)).rejects.toThrow(
        "HTTP error! status: 503"
      );
    });

    it("should throw error when token is missing", async () => {
      await expect(KDSService.getTables("")).rejects.toThrow();
    });
  });

  describe("Cache Management", () => {
    it("should use cached data for identical requests", async () => {
      const mockStages = createMockStages(2);
      mockSuccessfulFetch(mockStages);

      const result1 = await KDSService.getStages(mockToken);
      const result2 = await KDSService.getStages(mockToken);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it("should clear cache manually", async () => {
      const mockStages = createMockStages(2);
      mockSuccessfulFetch(mockStages);
      mockSuccessfulFetch(mockStages);

      await KDSService.getStages(mockToken);
      KDSService.clearCache();
      await KDSService.getStages(mockToken);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("should have separate cache keys for different endpoints", async () => {
      const mockStages = createMockStages(2);
      const mockTables = createMockTables(2);
      mockSuccessfulFetch(mockStages);
      mockSuccessfulFetch(mockTables);

      await KDSService.getStages(mockToken);
      await KDSService.getTables(mockToken);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("should respect cache duration", async () => {
      jest.useFakeTimers();
      const mockStages = createMockStages(2);
      mockSuccessfulFetch(mockStages);
      mockSuccessfulFetch(mockStages);

      await KDSService.getStages(mockToken);
      jest.advanceTimersByTime(29000); // Just before expiry
      await KDSService.getStages(mockToken);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(2000); // After expiry
      await KDSService.getStages(mockToken);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });

  describe("transformForOdoo", () => {
    it("should only include defined fields in payload", async () => {
      const updates = { stage: "preparing" };
      mockSuccessfulFetch({ success: true });

      await KDSService.updateKDS("kds-1", updates, mockToken);

      const callBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body
      );
      expect(Object.keys(callBody)).toEqual(["stage"]);
    });

    it("should handle undefined values correctly", async () => {
      const updates = {
        stage: "preparing",
        state: undefined,
        row_pos: undefined,
      };
      mockSuccessfulFetch({ success: true });

      await KDSService.updateKDS("kds-1", updates, mockToken);

      const callBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body
      );
      expect(callBody).toEqual({ stage: "preparing" });
    });

    it("should handle zero values correctly", async () => {
      const updates = { row_pos: 0 };
      mockSuccessfulFetch({ success: true });

      await KDSService.updateKDS("kds-1", updates, mockToken);

      const callBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body
      );
      expect(callBody.row_pos).toBe(0);
    });
  });

  describe("Error Handling", () => {
    it("should log errors when updating KDS fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      mockFailedFetch(500, "Server error");

      await expect(
        KDSService.updateKDS("kds-1", { stage: "preparing" }, mockToken)
      ).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Update KDS error:",
        "Server error"
      );
      consoleErrorSpy.mockRestore();
    });

    it("should log errors when deleting KDS fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      mockFailedFetch(404, "Not found");

      await expect(KDSService.deleteKDS("kds-1", mockToken)).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Delete KDS error:",
        "Not found"
      );
      consoleErrorSpy.mockRestore();
    });

    it("should log errors when updating order state fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      mockFailedFetch(400, "Bad request");

      await expect(
        KDSService.updateOrderState(1, "invalid", mockToken)
      ).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Update order state error:",
        "Bad request"
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe("Console Logging", () => {
    it("should log when updating KDS", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
      mockSuccessfulFetch({ success: true });

      await KDSService.updateKDS("kds-1", { stage: "preparing" }, mockToken);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Updating KDS order:",
        "kds-1",
        { stage: "preparing" }
      );
      consoleLogSpy.mockRestore();
    });

    it("should log when deleting KDS", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
      mockSuccessfulFetch({ success: true });

      await KDSService.deleteKDS("kds-1", mockToken);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Deleting KDS order:",
        "kds-1"
      );
      consoleLogSpy.mockRestore();
    });

    it("should log when updating order state", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
      mockSuccessfulFetch({ success: true });

      await KDSService.updateOrderState(1, "done", mockToken);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Updating order state:",
        1,
        "done"
      );
      consoleLogSpy.mockRestore();
    });
  });
});
