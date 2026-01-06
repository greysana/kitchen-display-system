import { IKDS, IKDSItem } from '@/types';
import mongoose, { Schema, Model } from 'mongoose';


const KDSItemSchema = new Schema<IKDSItem>(
  {
    ordered_prod_id: { type: Number },
    product_id: { type: Number },
    quantity: { type: Number },
    order_id: { type: Number },
    product_name: { type: String },
    note: { type: String },
  },
  { _id: false }
);

const KDSSchema = new Schema<IKDS>(
  {
    order_id: { type: Number, required: true, unique: true },
    order_name: { type: String },
    order_date: { type: String },
    cancelled: { type: Boolean },
    ref_ticket: { type: String },
    take_away: { type: Boolean },
    seat_id: { type: String },
    customer_count: { type: Number },
    row_pos: { type: Number },
    ref_id: { type: String, required: true, unique: true },
    items: { type: [KDSItemSchema] },
    stage: { type: String },
    state: { type: String },
    duration: { type: Number },
  },
  { timestamps: true }
);

const KDS: Model<IKDS> = mongoose.models.KDS || mongoose.model<IKDS>('KDS', KDSSchema);

export default KDS;