import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";

export async function GET() {
  try {
    await dbConnect();
    const users = await User.find();
    return NextResponse.json(users, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Fetching user list failed! an unexpected error occured" },
      { status: 404 }
    );
  }
}
