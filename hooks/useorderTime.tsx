"use client";
import { KDSOrder, Stage } from "@/types/types";
import { useEffect, useMemo, useState } from "react";

export function useOrderTimer(order: KDSOrder, stages: Stage[]) {
  const [now, setNow] = useState<number>(0);

  const currentStageConfig = useMemo(() => {
    if (!order.stage || !stages.length) return null;
    return stages.find(
      (s) => s.name.toLowerCase() === order.stage.toLowerCase()
    );
  }, [order.stage, stages]);

  const holdingTimeMs = (currentStageConfig?.holding_time ?? 0) * 60 * 1000;

  const stageEnteredAt = useMemo(() => {
    let dateStr = order.updatedAt ?? order.order_date;
    if (!dateStr) return null;

    if (typeof dateStr === "string" && !dateStr.endsWith("Z")) {
      dateStr = dateStr.replace(" ", "T") + "Z";
    }

    const parsed = new Date(dateStr).getTime();
    return isNaN(parsed) ? null : parsed;
  }, [order.updatedAt, order.order_date]);

  useEffect(() => {
    if (holdingTimeMs <= 0 || stageEnteredAt == null) return;

    // Schedule an initial tick asynchronously to avoid synchronous setState in effect.
    const initTimeout = setTimeout(() => setNow(Date.now()), 0);

    // Regular interval for ticking every second.
    const intervalId = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      clearTimeout(initTimeout);
      clearInterval(intervalId);
    };
  }, [holdingTimeMs, stageEnteredAt]);

  if (holdingTimeMs <= 0 || stageEnteredAt == null) {
    return {
      isExpired: false,
      holdingTimeMs,
      formatTime: () => "--:--",
    };
  }

  const elapsed = now - stageEnteredAt;
  const remaining = holdingTimeMs - elapsed;
  const isExpired = remaining < 0;

  const formatTime = () => {
    const totalSeconds = Math.floor(Math.abs(remaining) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const text =
      hours > 0
        ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`
        : `${minutes}:${seconds.toString().padStart(2, "0")}`;

    return isExpired ? `+${text}` : text;
  };

  return {
    isExpired,
    holdingTimeMs,
    formatTime,
  };
}
