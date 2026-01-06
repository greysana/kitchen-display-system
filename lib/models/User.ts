import { IUser } from '@/types';
import mongoose, { Schema, Model } from 'mongoose';
const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      max: 50,
      unique: true,
    },
    username: {
      type: String,
      max: 30,
      unique: false,
    },
    password: {
      type: String,
      required: true,
      min: 5,
    },
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;