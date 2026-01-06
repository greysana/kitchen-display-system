import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";
import bcrypt from "bcrypt";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { email, password } = await request.json();

    const emailTaken = await User.findOne({ email });

    if (emailTaken) {
      return NextResponse.json({ error: "email taken" }, { status: 400 });
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      email,
      password: passwordHash,
    });

    const userSaved = await newUser.save();
    const user = await User.findOne({ email });

    return NextResponse.json({ userSaved, user }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Registration failed! an unexpected error occured" },
      { status: 500 }
    );
  }
}
