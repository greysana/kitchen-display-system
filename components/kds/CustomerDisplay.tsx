import React, { useState, useEffect, useRef, useCallback } from "react";
import { Clock, Zap, Sun, Moon } from "lucide-react";
import { KDSOrder, Stage } from "@/types/types";
import { KDSService } from "@/lib/kds-service";
import { useWebSocket } from "@/hooks/useWebsocket";
import kdsApi from "@/lib/kds-auth-service";

const CustomerDisplay = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [orders, setOrders] = useState<KDSOrder[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [recentlyReady, setRecentlyReady] = useState<string[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Utility function to filter active orders
  const filterActiveOrders = (ordersList: KDSOrder[]) => {
    return ordersList.filter(
      (order) =>
        order.state !== "done" &&
        !order.cancelled &&
        order.stage.toLowerCase() !== "parked" &&
        order.stage.toLowerCase() !== "new"
    );
  };

  // Centralized function to fetch and update orders
  const refreshOrders = useCallback(async () => {
    try {
      const kdsData = await KDSService.getKDS( kdsApi.token ?? "");
      setOrders(filterActiveOrders(kdsData));
    } catch {
      console.error("Failed to load data:");
    }
  }, []);

  // Play sound and animate new ready orders
  const handleReadyOrder = useCallback((ticketId: string) => {
    setRecentlyReady((prev) => [...prev, ticketId]);

    if (audioRef.current) {
      audioRef.current
        .play()
        .catch((e) => console.log("Audio play failed:", e));
    }

    setTimeout(() => {
      setRecentlyReady((prev) => prev.filter((t) => t !== ticketId));
    }, 5000);
  }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [kdsData, stagesData] = await Promise.all([
          KDSService.getKDS( kdsApi.token ?? ""),
          KDSService.getStages( kdsApi.token ?? ""),
        ]);

        setOrders(filterActiveOrders(kdsData));
        setStages(stagesData);
      } catch {
        console.error("Failed to load data:");
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (message: any) => {
      console.log("WebSocket message:", message);

      if (message.type === "new_order") {
        // Refresh all orders for new orders
        refreshOrders();
      } else if (
        message.type === "kds_stage_update" ||
        message.type === "kds_update"
      ) {
        const { kds_id, stage } = message;
        const kdsIdStr = String(kds_id);

        setOrders((prev) => {
          // Check if order exists in current state
          const existingOrder = prev.find((o) => o._id === kdsIdStr);

          if (existingOrder) {
            // Update existing order
            const wasReady = existingOrder.stage.toLowerCase() === "ready";
            const isNowReady = stage.toLowerCase() === "ready";

            // Trigger ready animation
            if (!wasReady && isNowReady) {
              handleReadyOrder(existingOrder.ref_ticket);
            }

            const updated = prev.map((order) =>
              order._id === kdsIdStr
                ? { ...order, stage, updatedAt: new Date().toISOString() }
                : order
            );

            return filterActiveOrders(updated);
          } else {
            // Order not in state - might be transitioning from new/parked
            // Refresh to get the latest data
            refreshOrders();
            return prev;
          }
        });
      } else if (message.type === "order_update") {
        const { order_id, state, cancelled } = message;

        setOrders((prev) => {
          const updated = prev.map((order) =>
            order.order_id === order_id
              ? {
                  ...order,
                  state: state ?? order.state,
                  cancelled: cancelled ?? order.cancelled,
                  updatedAt: new Date().toISOString(),
                }
              : order
          );

          return filterActiveOrders(updated);
        });
      }
    },
    [refreshOrders, handleReadyOrder]
  );

  const { isConnected } = useWebSocket(handleWebSocketMessage);

  // Group orders by stage
  const preparingOrders = orders.filter((order) => {
    const stage = order.stage.toLowerCase();
    return stage === "preparing" || stage === "cooking";
  });

  const readyOrders = orders.filter(
    (order) => order.stage.toLowerCase() === "ready"
  );

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const TicketCard = ({
    ticket,
    isReady = false,
    isNew = false,
  }: {
    ticket: string;
    isReady?: boolean;
    isNew?: boolean;
  }) => (
    <div
      className={`
        relative rounded-xl p-6 sm:p-8 transition-all duration-300 w-auto
        ${
          darkMode
            ? isReady
              ? "bg-linear-to-br from-emerald-600 to-emerald-700 shadow-xl"
              : "bg-linear-to-br from-slate-700 to-slate-800 shadow-lg"
            : isReady
            ? "bg-linear-to-br from-emerald-500 to-emerald-600 shadow-xl"
            : "bg-linear-to-br from-slate-100 to-slate-200 shadow-md"
        }
        ${isNew ? "ring-2 ring-amber-400 animate-pulse" : ""}
      `}
    >
      {isNew && (
        <div
          className={`absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold animate-bounce ${
            darkMode
              ? "bg-amber-500 text-amber-950"
              : "bg-amber-400 text-amber-900"
          }`}
        >
          NEW
        </div>
      )}

      <div className="text-center">
        <div
          className={`text-3xl sm:text-2xl md:text-3xl font-bold mb-2 ${
            darkMode
              ? isReady
                ? "text-white"
                : "text-slate-200"
              : isReady
              ? "text-white"
              : "text-slate-800"
          }`}
        >
          {ticket}
        </div>
        {isReady && (
          <div
            className={`flex items-center justify-center gap-1.5 mt-3 ${
              darkMode ? "text-emerald-100" : "text-white"
            }`}
          >
            <Zap className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-semibold">PICK UP</span>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          darkMode ? "bg-slate-900 text-white" : "bg-gray-50 text-gray-900"
        }`}
      >
        <div className="text-center">
          <div className="text-5xl mb-4">⏳</div>
          <div className="text-xl font-semibold">Loading Display...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen w-full transition-colors duration-300 ${
        darkMode ? "bg-slate-900 text-white" : "bg-gray-50 text-gray-900"
      }`}
      data-testid="main-container"
    >
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAo="
      />

      {/* Header */}
      <div
        className={`sticky top-0 z-10 border-b ${
          darkMode
            ? "bg-slate-800/95 backdrop-blur-md border-slate-700"
            : "bg-white/95 backdrop-blur-md border-gray-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1
                className={`text-2xl sm:text-3xl font-bold ${
                  darkMode
                    ? "bg-linear-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent"
                    : "bg-linear-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent"
                }`}
              >
                Kitchen Display
              </h1>
              <p
                className={`text-xs sm:text-sm mt-1 ${
                  darkMode ? "text-slate-400" : "text-gray-600"
                }`}
              >
                Watch for your order number
              </p>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  isConnected
                    ? darkMode
                      ? "bg-green-900/30 text-green-400"
                      : "bg-green-100 text-green-700"
                    : darkMode
                    ? "bg-red-900/30 text-red-400"
                    : "bg-red-100 text-red-700"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected
                      ? "bg-green-400 animate-pulse"
                      : darkMode
                      ? "bg-red-400"
                      : "bg-red-500"
                  }`}
                ></div>
                <span>{isConnected ? "Live" : "Offline"}</span>
              </div>

              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode
                    ? "bg-slate-700 hover:bg-slate-600 text-yellow-400"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                }`}
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              <div className="text-right">
                <div
                  className={`flex items-center gap-1.5 text-xs mb-1 ${
                    darkMode ? "text-slate-400" : "text-gray-600"
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span className="hidden sm:inline">Time</span>
                </div>
                <div className="text-lg sm:text-2xl font-mono font-bold">
                  {formatTime(currentTime)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {readyOrders.length === 0 && preparingOrders.length === 0 ? (
          // Empty State
          <div className="text-center py-16 sm:py-24">
            <div className="text-5xl sm:text-6xl mb-4">🍽️</div>
            <h3
              className={`text-xl sm:text-2xl font-bold mb-2 ${
                darkMode ? "text-slate-400" : "text-gray-500"
              }`}
            >
              No Active Orders
            </h3>
            <p className={darkMode ? "text-slate-500" : "text-gray-400"}>
              New orders will appear here automatically
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Ready Orders Section */}
            <div
              className={`rounded-xl p-4 sm:p-6 ${
                darkMode ? "bg-slate-800/50" : "bg-white"
              } ${readyOrders.length > 0 ? "shadow-lg" : ""}`}
            >
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div
                  className={`p-2 rounded-lg ${
                    darkMode ? "bg-emerald-600" : "bg-emerald-500"
                  }`}
                >
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <h2
                  className={`text-xl sm:text-2xl font-bold ${
                    darkMode ? "text-emerald-400" : "text-emerald-600"
                  }`}
                >
                  Ready for Pickup
                </h2>
              </div>

              {readyOrders.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                  {readyOrders.map((order) => (
                    <TicketCard
                      key={order._id}
                      ticket={order.ref_ticket}
                      isReady={true}
                      isNew={recentlyReady.includes(order.ref_ticket)}
                    />
                  ))}
                </div>
              ) : (
                <div
                  className={`text-center py-8 ${
                    darkMode ? "text-slate-500" : "text-gray-400"
                  }`}
                >
                  <p className="text-sm">No orders ready yet</p>
                </div>
              )}
            </div>

            {/* Preparing Orders Section */}
            <div
              className={`rounded-xl p-4 sm:p-6 ${
                darkMode ? "bg-slate-800/50" : "bg-white"
              } ${preparingOrders.length > 0 ? "shadow-lg" : ""}`}
            >
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div
                  className={`p-2 rounded-lg ${
                    darkMode ? "bg-slate-600" : "bg-gray-400"
                  }`}
                >
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <h2
                  className={`text-xl sm:text-2xl font-bold ${
                    darkMode ? "text-slate-300" : "text-gray-700"
                  }`}
                >
                  Preparing
                </h2>
              </div>

              {preparingOrders.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {preparingOrders.map((order) => (
                    <TicketCard key={order._id} ticket={order.ref_ticket} />
                  ))}
                </div>
              ) : (
                <div
                  className={`text-center py-8 ${
                    darkMode ? "text-slate-500" : "text-gray-400"
                  }`}
                >
                  <p className="text-sm">No orders in progress</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className={`fixed bottom-0 left-0 right-0 border-t ${
          darkMode
            ? "bg-slate-800/95 backdrop-blur-md border-slate-700"
            : "bg-white/95 backdrop-blur-md border-gray-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between text-xs sm:text-sm flex-wrap gap-2">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className={darkMode ? "text-slate-300" : "text-gray-600"}>
                  <span className="hidden sm:inline">Ready = </span>Pick Up
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    darkMode ? "bg-slate-500" : "bg-gray-400"
                  }`}
                ></div>
                <span className={darkMode ? "text-slate-300" : "text-gray-600"}>
                  <span className="hidden sm:inline">Gray = </span>In Progress
                </span>
              </div>
            </div>

            <div className={darkMode ? "text-slate-400" : "text-gray-600"}>
              <span className="font-semibold">Active:</span> {orders.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDisplay;
