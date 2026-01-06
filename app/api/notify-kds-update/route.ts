import { NextRequest, NextResponse } from "next/server";

const WS_HTTP_BRIDGE = process.env.WS_HTTP_BRIDGE || "http://localhost:3003";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { kds_id, action, timestamp, ...additionalData } = body;

    if (!kds_id || !action) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: kds_id and action",
        },
        { status: 400 }
      );
    }

    console.log(`📢 Broadcasting KDS ${action}: ${kds_id}`);

    const message = {
      type: action === "create" ? "new_order" : "kds_update",
      kds_id,
      action,
      timestamp: timestamp || new Date().toISOString(),
      ...additionalData,
    };

    // Send to WebSocket server via HTTP bridge
    const response = await fetch(`${WS_HTTP_BRIDGE}/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: "kds_update",
        message,
      }),
    });

    const result = await response.json();

    console.log(`✓ Sent to ${result.clients_notified} KDS clients`);

    return NextResponse.json({
      success: true,
      clients_notified: result.clients_notified,
      message: `KDS ${action} notification sent`,
    });
  } catch (error) {
    console.error("Error broadcasting KDS update:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const response = await fetch(`${WS_HTTP_BRIDGE}/channel/kds_update`);
    const data = await response.json();

    return NextResponse.json({
      status: "ok",
      ...data,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        error: "Could not connect to WebSocket server",
      },
      { status: 500 }
    );
  }
}
