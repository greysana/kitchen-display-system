// kds-processor.ts (or your processor file)
import { KDSOrder, Order, ProductOrdered, Stage, Table } from "@/types/types";

export function getRoomCode(roomName: string): string {
  if (!roomName) return "";
  const words = roomName.split(" ").filter(Boolean);
  return words.map((word) => word[0]).join("");
}

export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

type YMD = { y: number; m: number; d: number } | null;

function extractYMD(s: string): YMD {
  if (!s) return null;

  // Normalize separators so we accept YYYY-MM-DD and YYYY/MM/DD
  const normalized = s.trim().replace(/\//g, "-");

  // Try to match a leading YYYY-MM-DD (allows 1- or 2-digit month/day)
  const m = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  }

  // Fallback: if an actual Date parses, use its UTC date parts
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
    return {
      y: dt.getUTCFullYear(),
      m: dt.getUTCMonth() + 1,
      d: dt.getUTCDate(),
    };
  }

  return null;
}

export function isSameDay(dateString: string, targetDate: string): boolean {
  const a = extractYMD(dateString);
  const b = extractYMD(targetDate);

  if (!a || !b) return false;

  return a.y === b.y && a.m === b.m && a.d === b.d;
}

export class KDSDataProcessor {
  static async createKDSArray(
    orders: Order[],
    productsOrdered: ProductOrdered[],
    stages: Stage[],
    tables: Table[]
  ): Promise<Partial<KDSOrder>[]> {
    const today = getTodayDate();
    const filteredOrders = orders.filter((order) =>
      isSameDay(order.write_date, today)
    );

    // pick the last stage that has last_stage === true
    const lastStageCandidates = stages.filter((s) => s.last_stage === true);
    const lastStage =
      lastStageCandidates.length > 0
        ? lastStageCandidates[lastStageCandidates.length - 1]
        : undefined;
    const cancelStage = stages.find((stage) => stage.cancel_stage === true);

    return filteredOrders.map((order) => {
      const tableId = order.table_id?.[0];
      const table = tables.find((t) => t.id === tableId);
      const floorName = table?.floor_id?.[1] ?? "";
      const roomCode = getRoomCode(floorName);

      const items = (order.lines || []).map((lineId) => {
        const product = productsOrdered.find((p) => p.id === lineId);
        return {
          ordered_prod_id: product?.id || 0,
          product_id: product?.product_id?.[0] || 0,
          quantity: product?.qty || 0,
          order_id: order.id,
          product_name: product?.full_product_name || "",
          note: product?.customer_note || "",
        };
      });

      // Normalize stage to lowercase so grouped keys match
      let stage = "new";
      if (order.state === "cancel") {
        stage = (cancelStage?.name || "cancelled").toLowerCase();
      } else if (order.state === "done") {
        stage = (lastStage?.name || "completed").toLowerCase();
      } else if (order.state === "draft" || order.state === "paid") {
        stage = "new";
      }

      return {
        order_id: order.id,
        order_name: order.name,
        order_date: order.date_order,
        cancelled: order.state === "cancel",
        ref_ticket: order.tracking_number,
        take_away: order.take_away,
        seat_id: `${roomCode} Seat ${order.table_id?.[1] ?? ""}`,
        customer_count: order.customer_count,
        ref_id: order.pos_reference,
        items,
        stage,
        state: order.state,
        duration: 0,
      };
    });
  }

  static groupByStage(
    orders: KDSOrder[],
    stages: Stage[]
  ): Record<string, KDSOrder[]> {
    const grouped = stages.reduce((acc, stage) => {
      acc[stage.name.toLowerCase()] = [];
      return acc;
    }, {} as Record<string, KDSOrder[]>);

    orders.forEach((order) => {
      const stage = order.stage?.toLowerCase() || "unknown";
      if (grouped[stage]) {
        grouped[stage].push(order);
      } else {
        grouped["unknown"] = grouped["unknown"] || [];
        grouped["unknown"].push(order);
      }
    });

    // Sort by row_pos within each stage
    Object.keys(grouped).forEach((stage) => {
      grouped[stage].sort((a, b) => {
        if (a.row_pos !== undefined && b.row_pos !== undefined) {
          return a.row_pos - b.row_pos;
        }
        if (a.row_pos !== undefined) return -1;
        if (b.row_pos !== undefined) return 1;
        return 0;
      });
    });

    return grouped;
  }
}
