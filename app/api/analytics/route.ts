import {
  calculateHourlyData,
  calculatePopularItems,
  calculateStageMetrics,
  calculateSummary,
  calculateTimeDistribution,
  filterOrdersByDateRange,
  generateAlerts,
} from "@/lib/api/analytics-api-service";
import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "http://host.docker.internal:8073";
const ODOO_URL = "http://host.docker.internal:8073";

// const BASE_URL = process.env.BASE_URL ?? "http://localhost:8073";
// const ODOO_URL = process.env.ODOO_URL ?? "http://localhost:8073";

interface KDSOrder {
  _id: string;
  order_id: number;
  order_name: string;
  order_date: string;
  cancelled: boolean;
  ref_ticket: string;
  take_away: boolean;
  seat_id: string;
  customer_count: number;
  ref_id: string;
  items: Array<{
    ordered_prod_id: number;
    product_id: number;
    quantity: number;
    order_id: number;
    product_name: string;
    note: string;
  }>;
  stage: string;
  state: string;
  duration: number;
  updatedAt: string;
  row_pos: number;
}

interface Stage {
  id: number;
  name: string;
  holding_time: number;
  last_stage: boolean;
  cancel_stage: boolean;
}

export async function GET(request: NextRequest) {
  try {
    // Extract token from request headers
    const token = request.headers.get("authorization")?.replace("Bearer ", "") || 
                  request.headers.get("x-api-token");

    if (!token) {
      return NextResponse.json(
        {
          error: "Missing authentication token",
        },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const dateRange = searchParams.get("dateRange") || "today";

    // Fetch KDS orders and stages with authentication
    const [ordersResponse, stagesResponse] = await Promise.all([
      fetch(`${BASE_URL}/api/kds/all`, { 
        cache: "no-store",
        headers: {
          "X-API-Token": token,
        },
      }),
      fetch(`${ODOO_URL}/get-stages`, { 
        cache: "no-store",
        headers: {
          "X-API-Token": token,
        },
      }),
    ]);

    if (!ordersResponse.ok) {
      if (ordersResponse.status === 401) {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 401 }
        );
      }
      throw new Error(`Orders API responded with status ${ordersResponse.status}`);
    }

    if (!stagesResponse.ok) {
      if (stagesResponse.status === 401) {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 401 }
        );
      }
      throw new Error(`Stages API responded with status ${stagesResponse.status}`);
    }

    const allOrders: KDSOrder[] = await ordersResponse.json();
    const stages: Stage[] = await stagesResponse.json();

    console.log("Total orders fetched:", allOrders.length);

    // Filter orders by date range
    const filteredOrders = filterOrdersByDateRange(allOrders, dateRange);
    console.log("Filtered orders:", filteredOrders.length);

    // Calculate analytics
    const analytics = {
      summary: calculateSummary(filteredOrders),
      hourlyData: calculateHourlyData(filteredOrders),
      stageData: calculateStageMetrics(filteredOrders, stages),
      popularItems: calculatePopularItems(filteredOrders),
      timeDistribution: calculateTimeDistribution(filteredOrders),
      alerts: generateAlerts(filteredOrders, stages),
    };

    console.log("Analytics summary:", analytics.summary);

    return NextResponse.json(analytics);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to calculate analytics", details: error.message },
      { status: 500 }
    );
  }
}