import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: NextRequest, { params }: RouteContext) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { message: "User identifier is required" },
        { status: 400 }
      );
    }

    const user = await User.findOne().or([
      { email: id },
      { phone: id },
      { username: id },
    ]);

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(user, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Fetching user failed! An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    await dbConnect();
    const { id } = await params;
    const { email, username, phone } = await request.json();

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(email && { email }),
          ...(username && { username }),
          ...(phone && { phone }),
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { message: "User does not exist" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedUser, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "User update failed! An unexpected error occurred" },
      { status: 400 }
    );
  }
}

export async function DELETE(_: NextRequest, { params }: RouteContext) {
  try {
    await dbConnect();
    const { id } = await params;

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return NextResponse.json(
        { message: "User does not exist" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "User has been deleted" },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { message: "User deletion failed! An unexpected error occurred" },
      { status: 500 }
    );
  }
}
