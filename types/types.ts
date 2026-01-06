export interface OrderItem {
  ordered_prod_id: number;
  product_id: number;
  quantity: number;
  order_id: number;
  product_name: string;
  note: string;
}

export interface KDSOrder {
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
  items: OrderItem[];
  stage: string;
  state: string;
  duration: number;
  updatedAt?: string;
  row_pos?: number;
}

export interface Stage {
  id: number;
  name: string;
  holding_time: number;
  last_stage?: boolean;
  cancel_stage?: boolean;
}

export interface Table {
  id: number;
  floor_id: [number, string];
}

export interface Order {
  id: number;
  name: string;
  write_date: string;
  date_order: string;
  state: string;
  tracking_number: string;
  take_away: boolean;
  table_id: [number, string];
  customer_count: number;
  pos_reference: string;
  lines: number[];
}

export interface ProductOrdered {
  id: number;
  product_id: [number];
  qty: number;
  full_product_name: string;
  customer_note: string;
}