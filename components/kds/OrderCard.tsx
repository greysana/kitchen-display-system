"use client";

import { useOrderTimer } from "@/hooks/useorderTime"; // Ensure path is correct
import { KDSOrder, Stage } from "@/types/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Clock, Users } from "lucide-react";

export function OrderCard({ order, stages }: { order: KDSOrder; stages: Stage[] }) {
  // Timer Hook: Automatically recalculates when order.updatedAt or order.stage changes
  const { isExpired, formatTime, holdingTimeMs } = useOrderTimer(order, stages);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Helper to determine border color based on state
  const getBorderColor = () => {
    if (order.state === "done") return "border-green-500 bg-green-50";
    if (isExpired) return "ring-4 ring-red-500 animate-pulse border-red-500";
    return "border-gray-200 hover:shadow-lg";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white rounded-2xl overflow-hidden shadow-md mb-3 cursor-move transition-all border ${getBorderColor()}`}
    >
      <div className={`px-4 h-10 flex items-center justify-between border-b ${
          isExpired ? "bg-red-50" : "bg-yellow-50"
        }`}
      >
        <h4 className="font-semibold text-sm">
          {order.seat_id}{" "}
          <span className="text-gray-500 font-normal text-xs">
            (#{order.order_id})
          </span>
        </h4>
        
        {/* Only show timer if stage has a holding time */}
        {holdingTimeMs > 0 && (
          <span className={`flex items-center gap-1 text-sm ${
             isExpired ? "text-red-600 font-bold" : "text-gray-700"
          }`}>
            <Clock className="w-4 h-4" />
            <span>{formatTime()}</span>
          </span>
        )}
      </div>

      <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-500">
        <span>
          Ticket: {order.ref_ticket === "false" ? "-" : order.ref_ticket}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {order.customer_count || 1}
        </span>
      </div>

      <div className="px-4 pb-3">
        <ul className="space-y-1">
          {order.items.map((item, i) => (
            <li key={i} className="flex justify-between items-center text-sm">
              <span className="font-medium">{item.product_name}</span>
              <span className="text-gray-600">x{item.quantity}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}