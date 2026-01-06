import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { users, password } = await request.json();

    const user = await User.findOne().or([
      { email: users },
      { phone: users },
      { username: users },
    ]);

    if (!user) {
      return NextResponse.json(
        { msg: "User does not exist." },
        { status: 404 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { msg: "Invalid credentials." },
        { status: 400 }
      );
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!);
    const userObj = user.toObject();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (userObj as any).password;

    return NextResponse.json({ token, user: userObj }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Login Failed! an unexpected error occured" },
      { status: 500 }
    );
  }
}
