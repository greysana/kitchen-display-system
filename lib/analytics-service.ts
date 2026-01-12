import { AnalyticsData } from "@/types/analytics.types";
import kdsApi from "./kds-auth-service";

export class AnalyticsService {
  /**
   * Fetch analytics data from the API route
   */
  static async getAnalytics(
    dateRange: string = "today"
  ): Promise<AnalyticsData> {
    try {
      // Check authentication
      if (!kdsApi.isAuthenticated()) {
        throw new Error("Not authenticated. Please login first.");
      }

      const response = await fetch(`/api/analytics?dateRange=${dateRange}`, {
        cache: "no-store",
        headers: {
          "X-API-Token": kdsApi.token!,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, clear auth
          kdsApi.clearAuth();
          throw new Error("Session expired. Please login again.");
        }
        const error = await response.json();
        throw new Error(
          error.details || error.error || "Failed to fetch analytics"
        );
      }

      return response.json();
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      throw error;
    }
  }

  /**
   * Export analytics data as CSV
   */
  static async exportCSV(dateRange: string = "today"): Promise<Blob> {
    try {
      const analytics = await this.getAnalytics(dateRange);

      // Create CSV content
      let csv = `Kitchen Display System - Analytics Report\n`;
      csv += `Date Range: ${dateRange}\n`;
      csv += `Generated: ${new Date().toLocaleString()}\n\n`;

      // Summary Metrics
      csv += `SUMMARY METRICS\n`;
      csv += `Metric,Value\n`;
      csv += `Total Orders,${analytics.summary.totalOrders}\n`;
      csv += `Active Orders,${analytics.summary.activeOrders}\n`;
      csv += `Completed Orders,${analytics.summary.completedOrders}\n`;
      csv += `Cancelled Orders,${analytics.summary.cancelledOrders}\n`;
      csv += `Average Prep Time,${analytics.summary.avgPrepTime} min\n`;
      csv += `Completion Rate,${analytics.summary.completionRate}%\n`;
      csv += `Peak Hour,${analytics.summary.peakHour}\n`;
      csv += `Parked Orders,${analytics.summary.parkedOrders}\n\n`;

      // Hourly Distribution
      csv += `HOURLY DISTRIBUTION\n`;
      csv += `Hour,Orders\n`;
      analytics.hourlyData.forEach((h) => {
        csv += `${h.hour},${h.orders}\n`;
      });
      csv += `\n`;

      // Stage Performance
      csv += `STAGE PERFORMANCE\n`;
      csv += `Stage,Order Count,Avg Time (min),Max Time (min),Min Time (min)\n`;
      analytics.stageData.forEach((s) => {
        csv += `${s.name},${s.count},${s.avgTime},${s.maxTime},${s.minTime}\n`;
      });
      csv += `\n`;

      // Popular Items
      csv += `TOP SELLING ITEMS\n`;
      csv += `Product Name,Quantity Sold,Avg Prep Time (min)\n`;
      analytics.popularItems.forEach((item) => {
        csv += `${item.product_name},${item.count},${item.avgPrepTime}\n`;
      });
      csv += `\n`;

      // Time Distribution
      csv += `COMPLETION TIME DISTRIBUTION\n`;
      csv += `Time Range,Order Count,Percentage\n`;
      analytics.timeDistribution.forEach((t) => {
        csv += `${t.range},${t.count},${t.percentage}%\n`;
      });
      csv += `\n`;

      // Alerts
      if (analytics.alerts.length > 0) {
        csv += `CURRENT ALERTS\n`;
        csv += `Order Name,Stage,Duration (min),Holding Time (min),Type\n`;
        analytics.alerts.forEach((alert) => {
          csv += `${alert.order_name},${alert.stage},${alert.duration},${alert.holdingTime},${alert.type}\n`;
        });
      }

      return new Blob([csv], { type: "text/csv;charset=utf-8;" });
    } catch (error) {
      console.error("Failed to export CSV:", error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return kdsApi.isAuthenticated();
  }

  /**
   * Get current user
   */
  static getCurrentUser() {
    return kdsApi.getUser();
  }
}
