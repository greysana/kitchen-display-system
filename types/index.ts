export interface IUser {
  email: string;
  username?: string;
  password: string;
}

export interface IKDSItem {
  ordered_prod_id: number;
  product_id: number;
  quantity: number;
  order_id: number;
  product_name: string;
  note: string;
}

export interface IKDS {
  order_id: number;
  order_name: string;
  order_date: string;
  cancelled: boolean;
  ref_ticket: string;
  take_away: boolean;
  seat_id: string;
  customer_count: number;
  row_pos?: number;
  ref_id: string;
  items: IKDSItem[];
  stage: string;
  state: string;
  duration: number;
}
