import { KDSOrder, Stage } from "@/types/types";

export function filterOrdersByDateRange(
  orders: KDSOrder[],
  dateRange: string
): KDSOrder[] {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  switch (dateRange) {
    case "today":
      return orders.filter((order) => {
        const orderDate = new Date(order.order_date);
        return orderDate >= startOfToday;
      });

    case "week":
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return orders.filter((order) => {
        const orderDate = new Date(order.order_date);
        return orderDate >= weekAgo;
      });

    case "month":
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return orders.filter((order) => {
        const orderDate = new Date(order.order_date);
        return orderDate >= monthAgo;
      });

    default:
      return orders;
  }
}

export function calculateSummary(orders: KDSOrder[]) {
  const totalOrders = orders.length;
  const activeOrders = orders.filter(
    (o) => o.state !== "done" && !o.cancelled
  ).length;
  const completedOrders = orders.filter((o) => o.state === "done").length;
  const cancelledOrders = orders.filter((o) => o.cancelled).length;
  const parkedOrders = orders.filter(
    (o) =>
      o.stage?.toLowerCase() === "parked" && o.state !== "done" && !o.cancelled
  ).length;

  // Calculate average prep time for completed orders
  // Calculate time from order_date to updatedAt for completed orders
  const now = new Date();
  const completedWithTime = orders
    .filter((o) => o.state === "done")
    .map((order) => {
      const orderDate = new Date(order.order_date);
      const completedDate = order.updatedAt ? new Date(order.updatedAt) : now;
      const durationMinutes = Math.floor(
        (completedDate.getTime() - orderDate.getTime()) / 60000
      );
      return durationMinutes > 0 ? durationMinutes : 0;
    })
    .filter((d) => d > 0);

  const avgPrepTime =
    completedWithTime.length > 0
      ? completedWithTime.reduce((sum, d) => sum + d, 0) /
        completedWithTime.length
      : 0;

  // Calculate completion rate
  const completionRate =
    totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

  // Find peak hour
  const hourCounts = new Map<number, number>();
  orders.forEach((order) => {
    const hour = new Date(order.order_date).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });

  let peakHour = 12;
  let maxCount = 0;
  hourCounts.forEach((count, hour) => {
    if (count > maxCount) {
      maxCount = count;
      peakHour = hour;
    }
  });

  const peakHourStr = `${peakHour.toString().padStart(2, "0")}:00-${(
    peakHour + 1
  )
    .toString()
    .padStart(2, "0")}:00`;

  return {
    totalOrders,
    activeOrders,
    completedOrders,
    cancelledOrders,
    avgPrepTime: Math.round(avgPrepTime * 10) / 10,
    completionRate: Math.round(completionRate * 10) / 10,
    peakHour: peakHourStr,
    parkedOrders,
  };
}

export function calculateHourlyData(orders: KDSOrder[]) {
  const hourlyMap = new Map<number, number>();

  // Initialize all 24 hours
  for (let i = 0; i < 24; i++) {
    hourlyMap.set(i, 0);
  }

  // Count orders per hour
  orders.forEach((order) => {
    const hour = new Date(order.order_date).getHours();
    hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
  });

  // Convert to array
  return Array.from(hourlyMap.entries())
    .map(([hour, count]) => ({
      hour: `${hour.toString().padStart(2, "0")}:00`,
      orders: count,
    }))
    .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
}

export function calculateStageMetrics(orders: KDSOrder[], stages: Stage[]) {
  const now = new Date();

  return stages.map((stage) => {
    const stageOrders = orders.filter(
      (o) => o.stage?.toLowerCase() === stage.name.toLowerCase()
    );

    // Calculate duration for each order in this stage
    const durations = stageOrders
      .map((order) => {
        const orderDate = new Date(order.order_date);
        const updatedDate = order.updatedAt ? new Date(order.updatedAt) : now;
        const durationMinutes = Math.floor(
          (updatedDate.getTime() - orderDate.getTime()) / 60000
        );
        return durationMinutes > 0 ? durationMinutes : 0;
      })
      .filter((d) => d > 0);

    const avgTime =
      durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0;
    const maxTime = durations.length > 0 ? Math.max(...durations) : 0;
    const minTime = durations.length > 0 ? Math.min(...durations) : 0;

    return {
      name: stage.name,
      count: stageOrders.length,
      avgTime: Math.round(avgTime * 10) / 10,
      maxTime: Math.round(maxTime * 10) / 10,
      minTime: Math.round(minTime * 10) / 10,
    };
  });
}

export function calculatePopularItems(orders: KDSOrder[]) {
  const now = new Date();
  const itemMap = new Map<
    string,
    { count: number; totalDuration: number; orderCount: number }
  >();

  orders.forEach((order) => {
    const orderDate = new Date(order.order_date);
    const completedDate = order.updatedAt ? new Date(order.updatedAt) : now;
    const orderDuration = Math.floor(
      (completedDate.getTime() - orderDate.getTime()) / 60000
    );

    order.items?.forEach((item) => {
      const name = item.product_name || "Unknown";
      const existing = itemMap.get(name) || {
        count: 0,
        totalDuration: 0,
        orderCount: 0,
      };
      itemMap.set(name, {
        count: existing.count + (item.quantity || 1),
        totalDuration: existing.totalDuration + orderDuration,
        orderCount: existing.orderCount + 1,
      });
    });
  });

  return Array.from(itemMap.entries())
    .map(([product_name, data]) => ({
      product_name,
      count: data.count,
      avgPrepTime:
        data.orderCount > 0
          ? Math.round((data.totalDuration / data.orderCount) * 10) / 10
          : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function calculateTimeDistribution(orders: KDSOrder[]) {
  const ranges = [
    { range: "0-5 min", min: 0, max: 5 },
    { range: "5-10 min", min: 5, max: 10 },
    { range: "10-15 min", min: 10, max: 15 },
    { range: "15-20 min", min: 15, max: 20 },
    { range: "20+ min", min: 20, max: Infinity },
  ];

  const now = new Date();

  // Calculate actual duration for completed orders
  const completedOrders = orders
    .filter((o) => o.state === "done")
    .map((order) => {
      const orderDate = new Date(order.order_date);
      const completedDate = order.updatedAt ? new Date(order.updatedAt) : now;
      const durationMinutes = Math.floor(
        (completedDate.getTime() - orderDate.getTime()) / 60000
      );
      return durationMinutes > 0 ? durationMinutes : 0;
    })
    .filter((d) => d > 0);

  const total = completedOrders.length;

  return ranges.map(({ range, min, max }) => {
    const count = completedOrders.filter(
      (duration) => duration >= min && duration < max
    ).length;
    const percentage = total > 0 ? (count / total) * 100 : 0;

    return {
      range,
      count,
      percentage: Math.round(percentage * 10) / 10,
    };
  });
}

export function generateAlerts(orders: KDSOrder[], stages: Stage[]) {
  const now = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alerts: any[] = [];

  // Create stage holding time map
  const stageHoldingTimes = new Map<string, number>();
  stages.forEach((stage) => {
    stageHoldingTimes.set(stage.name.toLowerCase(), stage.holding_time);
  });

  // Check active orders
  orders
    .filter((order) => order.state !== "done" && !order.cancelled)
    .forEach((order) => {
      const updatedAt = order.updatedAt
        ? new Date(order.updatedAt)
        : new Date(order.order_date);

      // Calculate elapsed time in minutes
      const elapsedMinutes = Math.floor(
        (now.getTime() - updatedAt.getTime()) / 60000
      );

      const stageName = order.stage?.toLowerCase() || "";
      const holdingTime = stageHoldingTimes.get(stageName) || 30;

      // Format duration for display
      let displayDuration: string;
      let durationValue: number;

      if (elapsedMinutes < 60) {
        displayDuration = `${elapsedMinutes} min`;
        durationValue = elapsedMinutes;
      } else if (elapsedMinutes < 1440) {
        // Less than 24 hours
        const hours = Math.floor(elapsedMinutes / 60);
        const mins = elapsedMinutes % 60;
        displayDuration = `${hours}h ${mins}m`;
        durationValue = elapsedMinutes;
      } else {
        // Days
        const days = Math.floor(elapsedMinutes / 1440);
        const hours = Math.floor((elapsedMinutes % 1440) / 60);
        displayDuration = `${days}d ${hours}h`;
        durationValue = elapsedMinutes;
      }

      if (elapsedMinutes > holdingTime * 1.5) {
        alerts.push({
          id: order._id,
          order_id: order.order_id,
          order_name: order.order_name,
          stage: order.stage || "Unknown",
          duration: durationValue,
          displayDuration,
          holdingTime,
          type: "error",
        });
      } else if (elapsedMinutes > holdingTime) {
        alerts.push({
          id: order._id,
          order_id: order.order_id,
          order_name: order.order_name,
          stage: order.stage || "Unknown",
          duration: durationValue,
          displayDuration,
          holdingTime,
          type: "warning",
        });
      }
    });

  return alerts.sort((a, b) => b.duration - a.duration);
}
