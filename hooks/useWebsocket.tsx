import { useEffect, useRef, useState, useCallback } from "react";

interface KDSUpdateMessage {
  type: "kds_update";
  kds_id: number;
  action: "update" | "delete" | "create";
  timestamp: string;
  stage?: string;
  state?: string;
  items_updated?: boolean;
  order_name?: string;
}

interface WebSocketMessage {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export function useWebSocket(
  onMessage: (data: WebSocketMessage) => void,
  onKDSUpdate?: (data: KDSUpdateMessage) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Store callbacks in refs to avoid reconnecting on every render
  const onMessageRef = useRef(onMessage);
  const onKDSUpdateRef = useRef(onKDSUpdate);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onKDSUpdateRef.current = onKDSUpdate;
  }, [onMessage, onKDSUpdate]);

  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket(
          process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3002/"
        );

        ws.onopen = () => {
          console.log("✓ WebSocket connected");
          setIsConnected(true);

          // Join the KDS channel
          const message = {
            type: "join",
            channelId: "kds_update",
            content: "loggedin",
          };
          ws.send(JSON.stringify(message));
        };

        ws.onmessage = (event) => {
          try {
            const receivedMessage: WebSocketMessage = JSON.parse(event.data);
            console.log("📩 WebSocket message:", receivedMessage);

            // Handle join confirmation
            if (receivedMessage.type === "join_success") {
              console.log("✓ Joined channel:", receivedMessage.channel);
            }

            // Handle KDS-specific updates
            if (
              receivedMessage.type === "kds_update" &&
              onKDSUpdateRef.current
            ) {
              onKDSUpdateRef.current(receivedMessage as KDSUpdateMessage);
            }

            // Call the general message handler
            onMessageRef.current(receivedMessage);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        ws.onclose = () => {
          console.log("○ WebSocket disconnected");
          setIsConnected(false);

          // Attempt to reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("🔄 Attempting to reconnect...");
            connect();
          }, 3000);
        };

        ws.onerror = (error) => {
          console.error("❌ WebSocket error:", error);
          ws.close();
        };

        wsRef.current = ws;
      } catch (error) {
        console.error("Failed to connect WebSocket:", error);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []); // Empty dependency array is fine now

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("⚠️ WebSocket is not connected");
    }
  }, []);

  return {
    isConnected,
    sendMessage,
  };
}
