/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  KDSDataProcessor,
  getRoomCode,
  getTodayDate,
  isSameDay,
} from "@/lib/kds-processor";
import {
  createMockOrder,
  createMockOrders,
  createMockProductOrdered,
  createMockStages,
  createMockTables,
  createMockKDSOrder,
  createMockKDSOrders,
} from "@/tests/utils/test-utils";

describe("KDSDataProcessor", () => {
  describe("getRoomCode", () => {
    it("should return first letters of each word", () => {
      expect(getRoomCode("Main Floor")).toBe("MF");
      expect(getRoomCode("Second Floor")).toBe("SF");
      expect(getRoomCode("VIP Room")).toBe("VR");
    });

    it("should handle single word", () => {
      expect(getRoomCode("Patio")).toBe("P");
    });

    it("should handle multiple spaces between words", () => {
      expect(getRoomCode("Main  Floor")).toBe("MF");
      expect(getRoomCode("Main   Floor   Area")).toBe("MFA");
    });

    it("should handle empty string", () => {
      expect(getRoomCode("")).toBe("");
    });

    it("should handle string with only spaces", () => {
      expect(getRoomCode("   ")).toBe("");
    });

    it("should handle mixed case", () => {
      expect(getRoomCode("main floor")).toBe("mf");
      expect(getRoomCode("MAIN FLOOR")).toBe("MF");
    });
  });

  describe("getTodayDate", () => {
    it("should return date in YYYY-MM-DD format", () => {
      const result = getTodayDate();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should return today's date", () => {
      const today = new Date().toISOString().split("T")[0];
      expect(getTodayDate()).toBe(today);
    });
  });

  describe("isSameDay", () => {
    it("should return true for same date", () => {
      expect(isSameDay("2024-01-15 12:00:00", "2024-01-15")).toBe(true);
      expect(isSameDay("2024-01-15 23:59:59", "2024-01-15")).toBe(true);
    });

    it("should return false for different dates", () => {
      expect(isSameDay("2024-01-15 12:00:00", "2024-01-16")).toBe(false);
      expect(isSameDay("2024-01-14 12:00:00", "2024-01-15")).toBe(false);
    });

    it("should handle different time components", () => {
      expect(isSameDay("2024-01-15 00:00:00", "2024-01-15")).toBe(true);
      expect(isSameDay("2024-01-15 12:30:45", "2024-01-15")).toBe(true);
    });
 
    it("should handle ISO format dates", () => {
      expect(isSameDay("2024-01-15T11:00:00Z", "2024-01-15")).toBe(true);
    });
  }); 

  describe("createKDSArray", () => {
    const mockStages = createMockStages(4, {});
    const mockTables = createMockTables(2);

    beforeEach(() => {
      jest.spyOn(Date.prototype, "toISOString").mockReturnValue("2024-01-15T12:00:00.000Z");
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should create KDS array from orders", async () => {
      const orders = [
        createMockOrder({
          id: 1,
          name: "Order-001",
          date_order: "2024-01-15 10:00:00",
          write_date: "2024-01-15 10:00:00",
          state: "draft",
          table_id: [1, "Table 1"],
          tracking_number: "T001",
          take_away: false,
          customer_count: 2,
          pos_reference: "POS-001",
          lines: [1, 2],
        }),
      ];

      const products = [
        createMockProductOrdered({
          id: 1,
          product_id: [10],
          qty: 2,
          full_product_name: "Pizza",
          customer_note: "Extra cheese",
        }),
        createMockProductOrdered({
          id: 2,
          product_id: [20],
          qty: 1,
          full_product_name: "Burger",
          customer_note: "",
        }),
      ];

      const result = await KDSDataProcessor.createKDSArray(
        orders,
        products,
        mockStages,
        mockTables
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        order_id: 1,
        order_name: "Order-001",
        order_date: "2024-01-15 10:00:00",
        cancelled: false,
        ref_ticket: "T001",
        take_away: false,
        customer_count: 2,
        ref_id: "POS-001",
        stage: "new",
        state: "draft",
        duration: 0,
      });

      expect(result[0].items).toHaveLength(2);
      expect(result[0].items?.[0]).toMatchObject({
        ordered_prod_id: 1,
        product_id: 10,
        quantity: 2,
        order_id: 1,
        product_name: "Pizza",
        note: "Extra cheese",
      });
    });

    it("should filter orders to only today's date", async () => {
      const orders = [
        createMockOrder({
          id: 1,
          write_date: "2024-01-15 10:00:00",
        }),
        createMockOrder({
          id: 2,
          write_date: "2024-01-14 10:00:00",
        }),
        createMockOrder({
          id: 3,
          write_date: "2024-01-15 23:00:00",
        }),
      ];

      const result = await KDSDataProcessor.createKDSArray(
        orders,
        [],
        mockStages,
        mockTables
      );

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.order_id)).toEqual([1, 3]);
    });

    it("should set stage to cancelled for cancelled orders", async () => {
      const stages = [
        ...createMockStages(3),
        createMockStages(1, { name: "Cancelled", cancel_stage: true })[0],
      ];

      const orders = [
        createMockOrder({
          id: 1,
          write_date: "2024-01-15 10:00:00",
          state: "cancel",
        }),
      ];

      const result = await KDSDataProcessor.createKDSArray(
        orders,
        [],
        stages,
        mockTables
      );

      expect(result[0].stage).toBe("cancelled");
      expect(result[0].cancelled).toBe(true);
      expect(result[0].state).toBe("cancel");
    });

    it("should set stage to completed for done orders", async () => {
      const stages = [
        ...createMockStages(3),
        createMockStages(1, { name: "Completed", last_stage: true })[0],
      ];

      const orders = [
        createMockOrder({
          id: 1,
          write_date: "2024-01-15 10:00:00",
          state: "done",
        }),
      ];

      const result = await KDSDataProcessor.createKDSArray(
        orders,
        [],
        stages,
        mockTables
      );

      expect(result[0].stage).toBe("completed");
      expect(result[0].state).toBe("done");
    });

    it("should set stage to new for draft orders", async () => {
      const orders = [
        createMockOrder({
          id: 1,
          write_date: "2024-01-15 10:00:00",
          state: "draft",
        }),
      ];

      const result = await KDSDataProcessor.createKDSArray(
        orders,
        [],
        mockStages,
        mockTables
      );

      expect(result[0].stage).toBe("new");
    });

    it("should set stage to new for paid orders", async () => {
      const orders = [
        createMockOrder({
          id: 1,
          write_date: "2024-01-15 10:00:00",
          state: "paid",
        }),
      ];

      const result = await KDSDataProcessor.createKDSArray(
        orders,
        [],
        mockStages,
        mockTables
      );

      expect(result[0].stage).toBe("new");
    });

    

    it("should handle missing table information", async () => {
      const orders = [
        createMockOrder({
          id: 1,
          write_date: "2024-01-15 10:00:00",
          table_id: [999, "Unknown Table"],
        }),
      ];

      const result = await KDSDataProcessor.createKDSArray(
        orders,
        [],
        mockStages,
        mockTables
      );

      expect(result[0].seat_id).toBe(" Seat Unknown Table");
    });

    it("should handle orders with no lines", async () => {
      const orders = [
        createMockOrder({
          id: 1,
          write_date: "2024-01-15 10:00:00",
          lines: [],
        }),
      ];

      const result = await KDSDataProcessor.createKDSArray(
        orders,
        [],
        mockStages,
        mockTables
      );

      expect(result[0].items).toEqual([]);
    });

    it("should handle products not found in productsOrdered", async () => {
      const orders = [
        createMockOrder({
          id: 1,
          write_date: "2024-01-15 10:00:00",
          lines: [999],
        }),
      ];

      const result = await KDSDataProcessor.createKDSArray(
        orders,
        [],
        mockStages,
        mockTables
      );

      expect(result[0].items).toHaveLength(1);
      expect(result[0].items?.[0]).toMatchObject({
        ordered_prod_id: 0,
        product_id: 0,
        quantity: 0,
        product_name: "",
        note: "",
      });
    });

    it("should handle take away orders", async () => {
      const orders = [
        createMockOrder({
          id: 1,
          write_date: "2024-01-15 10:00:00",
          take_away: true,
        }),
      ];

      const result = await KDSDataProcessor.createKDSArray(
        orders,
        [],
        mockStages,
        mockTables
      );

      expect(result[0].take_away).toBe(true);
    });

    it("should normalize stage names to lowercase", async () => {
      const stages = [
        createMockStages(1, { name: "New" })[0],
        createMockStages(1, { name: "PREPARING" })[0],
        createMockStages(1, { name: "ReAdY" })[0],
        createMockStages(1, { name: "Completed", last_stage: true })[0],
      ];

      const orders = [
        createMockOrder({
          id: 1,
          write_date: "2024-01-15 10:00:00",
          state: "draft",
        }),
      ];

      const result = await KDSDataProcessor.createKDSArray(
        orders,
        [],
        stages,
        mockTables
      );

      expect(result[0].stage).toBe("new");
    });

    it("should handle empty orders array", async () => {
      const result = await KDSDataProcessor.createKDSArray(
        [],
        [],
        mockStages,
        mockTables
      );

      expect(result).toEqual([]);
    });

    it("should use default values when last_stage is not found", async () => {
      const stagesWithoutLast = createMockStages(3, { last_stage: false });
      const orders = [
        createMockOrder({
          id: 1,
          write_date: "2024-01-15 10:00:00",
          state: "done",
        }),
      ];

      const result = await KDSDataProcessor.createKDSArray(
        orders,
        [],
        stagesWithoutLast,
        mockTables
      );

      expect(result[0].stage).toBe("completed");
    });

    it("should use default values when cancel_stage is not found", async () => {
      const stagesWithoutCancel = createMockStages(3, { cancel_stage: false });
      const orders = [
        createMockOrder({
          id: 1,
          write_date: "2024-01-15 10:00:00",
          state: "cancel",
        }),
      ];

      const result = await KDSDataProcessor.createKDSArray(
        orders,
        [],
        stagesWithoutCancel,
        mockTables
      );

      expect(result[0].stage).toBe("cancelled");
    });
  });

  describe("groupByStage", () => {
    it("should group orders by stage", () => {
      const stages = createMockStages(3);
      const orders = [
        createMockKDSOrder({ stage: "new", row_pos: 0 }),
        createMockKDSOrder({ stage: "new", row_pos: 1 }),
        createMockKDSOrder({ stage: "preparing", row_pos: 0 }),
      ];

      const result = KDSDataProcessor.groupByStage(orders, stages);

      expect(result["new"]).toHaveLength(2);
      expect(result["preparing"]).toHaveLength(1);
      expect(result["ready"]).toHaveLength(0);
    });

    it("should normalize stage names to lowercase", () => {
      const stages = [
        createMockStages(1, { name: "New" })[0],
        createMockStages(1, { name: "PREPARING" })[0],
      ];

      const orders = [
        createMockKDSOrder({ stage: "New", row_pos: 0 }),
        createMockKDSOrder({ stage: "PREPARING", row_pos: 0 }),
      ];

      const result = KDSDataProcessor.groupByStage(orders, stages);

      expect(result["new"]).toHaveLength(1);
      expect(result["preparing"]).toHaveLength(1);
    });

    it("should sort orders by row_pos within each stage", () => {
      const stages = createMockStages(1, { name: "new" });
      const orders = [
        createMockKDSOrder({ stage: "new", row_pos: 3, order_id: 3 }),
        createMockKDSOrder({ stage: "new", row_pos: 1, order_id: 1 }),
        createMockKDSOrder({ stage: "new", row_pos: 2, order_id: 2 }),
      ];

      const result = KDSDataProcessor.groupByStage(orders, stages);

      expect(result["new"].map((o) => o.order_id)).toEqual([1, 2, 3]);
    });

    it("should handle orders without row_pos", () => {
      const stages = createMockStages(1, { name: "new" });
      const orders = [
        createMockKDSOrder({ stage: "new", row_pos: 2, order_id: 2 }),
        createMockKDSOrder({ stage: "new", row_pos: undefined, order_id: 3 }),
        createMockKDSOrder({ stage: "new", row_pos: 1, order_id: 1 }),
      ];

      const result = KDSDataProcessor.groupByStage(orders, stages);

      // Orders with row_pos come first, sorted by row_pos
      expect(result["new"][0].order_id).toBe(1);
      expect(result["new"][1].order_id).toBe(2);
      expect(result["new"][2].order_id).toBe(3);
    });

    it("should place orders with undefined row_pos after orders with row_pos", () => {
      const stages = createMockStages(1, { name: "new" });
      const orders = [
        createMockKDSOrder({ stage: "new", row_pos: undefined, order_id: 3 }),
        createMockKDSOrder({ stage: "new", row_pos: undefined, order_id: 4 }),
        createMockKDSOrder({ stage: "new", row_pos: 1, order_id: 1 }),
        createMockKDSOrder({ stage: "new", row_pos: 2, order_id: 2 }),
      ];

      const result = KDSDataProcessor.groupByStage(orders, stages);

      expect(result["new"][0].order_id).toBe(1);
      expect(result["new"][1].order_id).toBe(2);
      expect(result["new"][2].order_id).toBe(3);
      expect(result["new"][3].order_id).toBe(4);
    });

    it("should create unknown group for orders with unrecognized stage", () => {
      const stages = createMockStages(2);
      const orders = [
        createMockKDSOrder({ stage: "new", row_pos: 0 }),
        createMockKDSOrder({ stage: "unknown_stage", row_pos: 0 }),
      ];

      const result = KDSDataProcessor.groupByStage(orders, stages);

      expect(result["unknown"]).toHaveLength(1);
      expect(result["unknown"][0].stage).toBe("unknown_stage");
    });

    it("should handle orders with no stage", () => {
      const stages = createMockStages(2);
      const orders = [
        createMockKDSOrder({ stage: undefined as any, row_pos: 0 }),
      ];

      const result = KDSDataProcessor.groupByStage(orders, stages);

      expect(result["unknown"]).toHaveLength(1);
    });

    it("should handle empty orders array", () => {
      const stages = createMockStages(3);
      const result = KDSDataProcessor.groupByStage([], stages);

      expect(result["new"]).toEqual([]);
      expect(result["preparing"]).toEqual([]);
      expect(result["ready"]).toEqual([]);
    });

    it("should handle empty stages array", () => {
      const orders = createMockKDSOrders(2);
      const result = KDSDataProcessor.groupByStage(orders, []);

      expect(result["unknown"]).toHaveLength(2);
    });

    it("should initialize all stages with empty arrays", () => {
      const stages = createMockStages(5);
      const orders: any[] = [];

      const result = KDSDataProcessor.groupByStage(orders, stages);

      stages.forEach((stage) => {
        expect(result[stage.name.toLowerCase()]).toEqual([]);
      });
    });

    it("should handle mixed case stage names correctly", () => {
      const stages = [
        createMockStages(1, { name: "New" })[0],
        createMockStages(1, { name: "PREPARING" })[0],
        createMockStages(1, { name: "ReAdY" })[0],
      ];

      const orders = [
        createMockKDSOrder({ stage: "new", row_pos: 0 }),
        createMockKDSOrder({ stage: "New", row_pos: 0 }),
        createMockKDSOrder({ stage: "PREPARING", row_pos: 0 }),
        createMockKDSOrder({ stage: "ready", row_pos: 0 }),
      ];

      const result = KDSDataProcessor.groupByStage(orders, stages);

      expect(result["new"]).toHaveLength(2);
      expect(result["preparing"]).toHaveLength(1);
      expect(result["ready"]).toHaveLength(1);
    });

    it("should sort correctly when row_pos is 0", () => {
      const stages = createMockStages(1, { name: "new" });
      const orders = [
        createMockKDSOrder({ stage: "new", row_pos: 2, order_id: 2 }),
        createMockKDSOrder({ stage: "new", row_pos: 0, order_id: 0 }),
        createMockKDSOrder({ stage: "new", row_pos: 1, order_id: 1 }),
      ];

      const result = KDSDataProcessor.groupByStage(orders, stages);

      expect(result["new"].map((o) => o.order_id)).toEqual([0, 1, 2]);
    });
  });
});