"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Clock,
  TrendingUp,
  AlertTriangle,
  Download,
  RefreshCw,
  CheckCircle,
  Timer,
  Package,
  Activity,
  Loader2,
} from "lucide-react";
import { AnalyticsService } from "@/lib/analytics-service";
import { useWebSocket } from "@/hooks/useWebsocket";
import { AnalyticsData } from "@/types/analytics.types";
import ProtectedRoute from "@/components/protected-route";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/AuthContext";

// Utility function to format duration in minutes to human-readable format
const formatDuration = (minutes: number): string => {
  if (minutes < 1) {
    const seconds = Math.round(minutes * 60);
    return `${seconds}s`;
  }
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  if (minutes < 1440) {
    // Less than 24 hours
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  if (minutes < 43200) {
    // Less than 30 days
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  // 30 days or more
  const months = Math.floor(minutes / 43200);
  const days = Math.floor((minutes % 43200) / 1440);
  return days > 0 ? `${months}mo ${days}d` : `${months}mo`;
};

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: string;
  color?: string;
}
interface ChartDataPoint {
  [key: string]: string | number;
}

interface AlertData {
  id: string;
  order_name: string;
  stage: string;
  holdingTime: number;
  duration: number;
  displayDuration?: string;
  type: "error" | "warning";
}

interface PopularItem {
  product_name: string;
  count: number;
  avgPrepTime: number;
}
const MetricCard: React.FC<MetricCardProps> = ({
  icon: Icon,
  label,
  value,
  subtext,
  trend,
  color = "blue",
}) => {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
    red: "bg-red-100 text-red-600",
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {subtext && <p className="text-sm text-gray-500 mt-1">{subtext}</p>}
        </div>
        <div
          className={`p-3 rounded-lg ${
            colorClasses[color as keyof typeof colorClasses] ||
            colorClasses.blue
          }`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
          <span className="text-green-600 font-medium">{trend}</span>
          <span className="text-gray-500 ml-1">vs yesterday</span>
        </div>
      )}
    </div>
  );
};

export default function ManagerDashboard() {
  const [dateRange, setDateRange] = useState("today");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  const COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#6366f1",
  ];

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      // Check authentication first
      // if (!AnalyticsService.isAuthenticated()) {
      //   router.push("/login");
      //   return;
      // }

      console.log("Fetching analytics for:", dateRange);
      const data = await AnalyticsService.getAnalytics(dateRange);
      console.log("Analytics data received:", data);

      setAnalyticsData(data);
      setLastUpdate(new Date());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Failed to fetch analytics:", error);

      // Handle authentication errors
      if (
        error.message?.includes("Session expired") ||
        error.message?.includes("Not authenticated")
      ) {
        // Redirect to login
        // router.push("/login");
        return;
      }

      setError(error.message || "Failed to load analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  // Handle WebSocket updates
  const handleWebSocketMessage = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (message: { type: string; [key: string]: any }) => {
      // Refresh analytics on certain events
      if (
        message.type === "new_order" ||
        message.type === "kds_stage_update" ||
        message.type === "kds_update" ||
        message.type === "order_update"
      ) {
        // Debounce refresh to avoid too many updates
        setTimeout(() => {
          fetchAnalytics();
        }, 2000);
      }
    },
    [fetchAnalytics]
  );

  const { isConnected } = useWebSocket(handleWebSocketMessage);

  // Load data on mount and when date range changes
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!refreshing) {
        fetchAnalytics();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchAnalytics, refreshing]);

  // Export functionality
  const handleExport = async () => {
    try {
      const blob = await AnalyticsService.exportCSV(dateRange);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kds-analytics-${dateRange}-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to export:", error);
      alert("Failed to export data");
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={["manager"]}>
        <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !analyticsData) {
    return (
      <ProtectedRoute requiredRoles={["manager"]}>
        <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <p className="text-gray-900 font-semibold mb-2">
              Failed to load analytics
            </p>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={["manager"]}>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Manager Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  isConnected
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                  }`}
                ></div>
                <span>{isConnected ? "Live" : "Offline"}</span>
              </div>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              <button
                onClick={fetchAnalytics}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <MetricCard
            icon={Package}
            label="Total Orders"
            value={analyticsData.summary.totalOrders}
            color="blue"
          />
          <MetricCard
            icon={Activity}
            label="Active Orders"
            value={analyticsData.summary.activeOrders}
            subtext="Currently processing"
            color="green"
          />
          <MetricCard
            icon={Clock}
            label="Avg Prep Time"
            value={formatDuration(analyticsData.summary.avgPrepTime)}
            color="purple"
          />
          <MetricCard
            icon={CheckCircle}
            label="Completion Rate"
            value={`${analyticsData.summary.completionRate}%`}
            color="green"
          />
          <MetricCard
            icon={TrendingUp}
            label="Peak Hour"
            value={analyticsData.summary.peakHour}
            subtext="Busiest period"
            color="orange"
          />
          <MetricCard
            icon={AlertTriangle}
            label="Parked Orders"
            value={analyticsData.summary.parkedOrders}
            subtext="Needs attention"
            color="red"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Orders by Hour */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Orders by Hour
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Orders by Stage */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Orders by Stage
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.stageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Average Time per Stage */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Avg Time per Stage
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.stageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip
                  formatter={(value: number | undefined) =>
                    value !== undefined ? formatDuration(value) : "N/A"
                  }
                  labelFormatter={(label) => `Stage: ${label}`}
                />
                <Legend />
                <Bar dataKey="avgTime" fill="#f59e0b" name="Avg Time" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Time Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Completion Time Distribution
            </h3>
            {analyticsData.timeDistribution.every((d) => d.count === 0) ? (
              <div className="h-75 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Clock className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No completed orders with duration data</p>
                  <p className="text-sm mt-1">Orders need time to complete</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.timeDistribution
                      .filter((d) => d.count > 0)
                      .map((d) => ({ ...d } as ChartDataPoint))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props) => {
                      const entry = props as unknown as {
                        range: string;
                        percent: number;
                      };
                      return `${entry.range}: ${(entry.percent * 100).toFixed(
                        0
                      )}%`;
                    }}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analyticsData.timeDistribution
                      .filter((d) => d.count > 0)
                      .map((_, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bottom Section: Alerts and Popular Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Real-time Alerts */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Orders Exceeding Time Limits
              </h3>
              <span className="text-sm text-gray-500">
                {analyticsData.alerts.length} alerts
              </span>
            </div>
            {analyticsData.alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>All orders are within time limits</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-100 overflow-y-auto">
                {analyticsData.alerts.map((alert: AlertData) => (
                  <div
                    key={alert.id}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      alert.type === "error"
                        ? "bg-red-50 border border-red-200"
                        : "bg-yellow-50 border border-yellow-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle
                        className={`w-5 h-5 ${
                          alert.type === "error"
                            ? "text-red-600"
                            : "text-yellow-600"
                        }`}
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          {alert.order_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          Stage: {alert.stage} (limit: {alert.holdingTime} min)
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {alert.displayDuration || `${alert.duration} min`}
                      </p>
                      <p className="text-xs text-gray-500">Elapsed time</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Popular Items */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top Selling Items
            </h3>
            {analyticsData.popularItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2" />
                <p>No orders yet</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-100 overflow-y-auto">
                {analyticsData.popularItems.map(
                  (item: PopularItem, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-blue-600">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.product_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {item.count} orders • Avg:{" "}
                            {formatDuration(item.avgPrepTime)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Insights Section */}
        <div className="mt-8 bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Insights & Recommendations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Find slowest stage */}
            {(() => {
              const slowestStage = analyticsData.stageData.reduce(
                (prev, current) =>
                  current.avgTime > prev.avgTime ? current : prev,
                analyticsData.stageData[0] || {
                  name: "Unknown",
                  avgTime: 0,
                  count: 0,
                }
              );

              return (
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 rounded-lg shrink-0">
                      <Timer className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Slowest Stage</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {slowestStage.name} stage is averaging{" "}
                        {formatDuration(slowestStage.avgTime)}. Consider
                        reviewing this workflow.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="bg-white rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg shrink-0">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Order Volume</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Peak hour is {analyticsData.summary.peakHour}. Ensure
                    adequate staffing during this period.
                  </p>
                </div>
              </div>
            </div>

            {analyticsData.summary.parkedOrders > 0 ? (
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg shrink-0">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Parked Orders</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {analyticsData.summary.parkedOrders} orders are currently
                      parked. Review these to prevent delays.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Great Performance
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Completion rate is {analyticsData.summary.completionRate}
                      %. Keep up the excellent work!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
