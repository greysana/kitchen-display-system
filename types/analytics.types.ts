
export interface OrderMetrics {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  avgPrepTime: number;
  completionRate: number;
  peakHour: string;
  parkedOrders: number;
}

export interface HourlyData {
  hour: string;
  orders: number;
}

export interface StageMetrics {
  name: string;
  count: number;
  avgTime: number;
  maxTime: number;
  minTime: number;
}

export interface PopularItem {
  product_name: string;
  count: number;
  avgPrepTime: number;
}

export interface TimeDistribution {
  range: string;
  count: number;
  percentage: number;
}

export interface OrderAlert {
  id: string;
  order_id: number;
  order_name: string;
  stage: string;
  duration: number;
  displayDuration?: string;
  holdingTime: number;
  type: "warning" | "error";
}

export interface AnalyticsData {
  summary: OrderMetrics;
  hourlyData: HourlyData[];
  stageData: StageMetrics[];
  popularItems: PopularItem[];
  timeDistribution: TimeDistribution[];
  alerts: OrderAlert[];
}
