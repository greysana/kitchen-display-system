/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { KDSService } from "@/lib/kds-service";
import { StageColumn } from "./StageColumn";
import React, { useCallback, useEffect, useState, useRef } from "react";
import { useWebSocket } from "@/hooks/useWebsocket";
import { getTodayDate, isSameDay, KDSDataProcessor } from "@/lib/kds-processor";
import { KDSOrder, Stage } from "@/types/types";
import {
  DndContext,
  DragOverlay as _DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Loader2 } from "lucide-react";
import { OrderCard } from "./OrderCard";
import kdsApi from "@/lib/kds-auth-service";
import { LoadingSkeleton } from "./LoadingSkeleton";

export const DragOverlay = _DragOverlay as unknown as React.FC<
  React.PropsWithChildren<{
    adjustScale?: boolean;
    dropAnimation?: any;
    style?: React.CSSProperties;
    transition?: string;
    modifiers?: any;
    wrapperElement?: keyof React.JSX.IntrinsicElements;
    className?: string;
    zIndex?: number;
  }>
>;

export default function KDS() {
  const [ordersMap, setOrdersMap] = useState<Record<string, KDSOrder[]>>({});
  const [stages, setStages] = useState<Stage[]>([]);
  const [activeOrder, setActiveOrder] = useState<KDSOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshPaused, setIsRefreshPaused] = useState(false);
  const [isWsUpdate, setisWsUpdate] = useState(false);

  // Track previous state to detect changes
  const prevKdsRef = useRef<KDSOrder[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Sync KDS with backend data
  const syncKDS = useCallback(async () => {
    if (stages.length === 0) {
      //console.log("Skipping sync - stages not loaded yet");
      return;
    }

    try {
      //console.log("Starting KDS sync...");

      const kdsData = await KDSService.getKDS(kdsApi.token ?? "");

      //console.log("Fetched KDS data:", kdsData.length);
      // console.table(kdsData);

      // Check if there are actual changes in the KDS data from backend
      const hasKDSChanges =
        JSON.stringify(kdsData) !== JSON.stringify(prevKdsRef.current);

      //console.log("Change detection:", {
      //   kdsCount: kdsData.length,
      //   prevKdsCount: prevKdsRef.current.length,
      //   hasKDSChanges,
      // });

      // Process if there are changes
      if (hasKDSChanges || kdsData.length !== prevKdsRef.current.length) {
        //console.log("Changes detected, processing updates...");

        // Update refs
        prevKdsRef.current = kdsData;

        // Filter for today's orders
        const today = getTodayDate();
        const filteredKDS = kdsData.filter((order) =>
          isSameDay(order.order_date, today)
        );

        //console.log("Filtered KDS orders:", filteredKDS.length);

        const grouped = KDSDataProcessor.groupByStage(filteredKDS, stages);
        //console.log("Grouped orders:", grouped);

        // Only update if not paused by drag operation
        if (!isRefreshPaused) {
          setOrdersMap(grouped);
          //console.log("Orders map updated");
        } else {
          //console.log("Update skipped - drag in progress");
        }
      } else {
        //console.log("No changes detected in KDS data");

        // Even if no changes detected, ensure UI reflects current state
        const today = getTodayDate();
        const currentFilteredKDS = kdsData.filter((order) =>
          isSameDay(order.order_date, today)
        );

        if (currentFilteredKDS.length > 0) {
          const currentGrouped = KDSDataProcessor.groupByStage(
            currentFilteredKDS,
            stages
          );
          if (!isRefreshPaused) {
            setOrdersMap(currentGrouped);
            //console.log("Orders map refreshed with current data");
          }
        } else {
          // If no orders exist, initialize empty stage structure
          const groupedData = stages.reduce((acc, stage) => {
            acc[stage.name.toLowerCase()] = [];
            return acc;
          }, {} as Record<string, KDSOrder[]>);

          if (!isRefreshPaused) {
            setOrdersMap(groupedData);
            //console.log("Initialized empty stages");
          }
        }
      }
      if (isWsUpdate) {
        setisWsUpdate(false);
      }
    } catch (error) {
      console.error("Failed to sync KDS:", error);
    }
  }, [stages, isRefreshPaused, isWsUpdate, setisWsUpdate]);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      //console.log("Loading initial data...");

      const stagesData = await KDSService.getStages(kdsApi.token ?? "");
      //console.log("Loaded stages:", stagesData);
      setStages(stagesData);

      // Initial KDS load
      const kdsData = await KDSService.getKDS(kdsApi.token ?? "");
      const today = getTodayDate();
      const filteredKDS = kdsData.filter((order) =>
        isSameDay(order.order_date, today)
      );

      //console.log("Initial KDS data:", filteredKDS.length);

      // Initialize refs
      prevKdsRef.current = filteredKDS;

      const grouped = KDSDataProcessor.groupByStage(filteredKDS, stagesData);
      //console.log("Initial grouped orders:", grouped);

      setOrdersMap(grouped);
    } catch (error) {
      console.error("Failed to load initial data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback(
    (message: any) => {
      //console.log("WebSocket message received:", message);

      // Only sync for NEW orders - Odoo creates the KDS entry
      if (message.type === "new_order") {
        //console.log("New order received via WebSocket, syncing KDS...");
        setisWsUpdate(true);
        syncKDS();
      }
      // Handle real-time stage updates
      else if (
        message.type === "kds_stage_update" ||
        message.type === "kds_update"
      ) {
        //console.log("KDS stage update received:", message);

        if (!isRefreshPaused) {
          setOrdersMap((prev) => {
            const newMap = { ...prev };
            const { kds_id, stage } = message;

            let itemToUpdate: KDSOrder | undefined;

            for (const orders of Object.values(prev)) {
              const found = orders.find((item) => item._id === String(kds_id));
              if (found) {
                itemToUpdate = found;
                break;
              }
            }

            if (!itemToUpdate) {
              console.warn(`Item with id ${kds_id} not found in ordersMap`);
              return prev;
            }

            // Remove from all stages
            for (const stageKey of Object.keys(newMap)) {
              newMap[stageKey] = newMap[stageKey].filter(
                (item) => item._id !== String(kds_id)
              );
            }

            const updatedItem: KDSOrder = {
              ...itemToUpdate,
              stage,
              updatedAt: message.timestamp ?? new Date().toISOString(),
            };

            const targetStage = stage?.toLowerCase();
            if (targetStage && newMap[targetStage]) {
              newMap[targetStage].push(updatedItem);
              newMap[targetStage].sort(
                (a, b) => (a.row_pos ?? 0) - (b.row_pos ?? 0)
              );
            } else {
              console.warn(`Stage "${targetStage}" not found in ordersMap`);
            }

            return newMap;
          });
        }
      }
      // Handle order updates (state/status changes)
      else if (message.type === "order_update") {
        //console.log("Order update received:", message);

        if (!isRefreshPaused) {
          const { order_id, state, cancelled, ref_ticket } = message;

          setOrdersMap((prev) => {
            const newMap = { ...prev };
            let updated = false;

            // Find and update the order in any stage
            Object.keys(newMap).forEach((stageKey) => {
              newMap[stageKey] = newMap[stageKey].map((order) => {
                if (order.order_id === order_id) {
                  updated = true;
                  const updatedOrder = { ...order };

                  if (state !== undefined) updatedOrder.state = state;
                  if (cancelled !== undefined)
                    updatedOrder.cancelled = cancelled;
                  if (ref_ticket !== undefined)
                    updatedOrder.ref_ticket = ref_ticket;
                  updatedOrder.updatedAt = new Date().toISOString();

                  //console.log("Updated order locally:", updatedOrder);
                  return updatedOrder;
                }
                return order;
              });
            });

            if (!updated) {
              console.warn(
                `Order ${order_id} not found in ordersMap, syncing...`
              );
              syncKDS();
            }

            return newMap;
          });
        }
      }
      // Handle generic content updates
      else if (message.content?.value) {
        try {
          const updatedItem = JSON.parse(message.content.value);
          //console.log("WebSocket content update received:", updatedItem);

          if (!isRefreshPaused) {
            setOrdersMap((prev) => {
              const newMap = { ...prev };

              // Remove from old stage
              Object.keys(newMap).forEach((stage) => {
                newMap[stage] = newMap[stage].filter(
                  (item) => item._id !== updatedItem._id
                );
              });

              // Add to new stage
              const targetStage = updatedItem.stage?.toLowerCase();
              if (newMap[targetStage]) {
                newMap[targetStage].push(updatedItem);
                // Sort by row_pos
                newMap[targetStage].sort(
                  (a, b) => (a.row_pos || 0) - (b.row_pos || 0)
                );
              }

              return newMap;
            });
          }
        } catch (error) {
          console.error("Failed to parse WebSocket update:", error);
        }
      }
    },
    [syncKDS, isRefreshPaused]
  );

  const { isConnected } = useWebSocket(handleWebSocketMessage);

  // Load data on mount
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Trigger initial sync after stages are loaded
  useEffect(() => {
    if (stages.length > 0 && !loading) {
      //console.log("Stages loaded, triggering initial sync");
      syncKDS();
    }
  }, [stages.length, loading, syncKDS]);

  // Drag handlers
  const handleDragStart = useCallback(
    (event: any) => {
      const { active } = event;
      const order = Object.values(ordersMap)
        .flat()
        .find((o) => o._id === active.id);
      setActiveOrder(order || null);
      setIsRefreshPaused(true);
      //console.log("Drag started, refresh paused");
    },
    [ordersMap]
  );

  const handleDragEnd = useCallback(
    async (event: any) => {
      const { active, over } = event;
      setActiveOrder(null);

      if (!over) {
        setIsRefreshPaused(false);
        return;
      }

      // Normalize IDs
      const activeId = String(active.id);
      const overId = String(over.id);

      // Find source container (stage key)
      const activeContainer = Object.keys(ordersMap).find((stage) =>
        ordersMap[stage].some((o) => o._id === activeId)
      );

      if (!activeContainer) {
        setIsRefreshPaused(false);
        return;
      }

      // Find the active order to check its state
      const activeOrder = ordersMap[activeContainer].find(
        (o) => o._id === activeId
      );

      // Prevent dragging if the order state is "done"
      if (activeOrder?.state === "done" || activeOrder?.cancelled === true) {
        setIsRefreshPaused(false);
        return;
      }

      // Determine target container:
      // First check if overId is an item in any stage
      const foundOverContainer = Object.keys(ordersMap).find((stage) =>
        ordersMap[stage].some((o) => o._id === overId)
      );

      // If not found as an item, overId IS the container (stage) itself
      const overContainer = foundOverContainer
        ? foundOverContainer.toLowerCase()
        : overId.toLowerCase();

      // Verify the target container exists in our ordersMap
      if (!ordersMap.hasOwnProperty(overContainer)) {
        console.warn(
          `Target container "${overContainer}" not found in ordersMap`
        );
        setIsRefreshPaused(false);
        return;
      }

      // Create a safe copy of the map
      const newOrdersMap: Record<string, KDSOrder[]> = {};
      Object.keys(ordersMap).forEach((key) => {
        newOrdersMap[key] = [...ordersMap[key]];
      });

      const activeIndex = newOrdersMap[activeContainer].findIndex(
        (o) => o._id === activeId
      );
      const activeOrderFromMap = newOrdersMap[activeContainer][activeIndex];

      // Safety: if activeOrder missing, abort
      if (!activeOrderFromMap) {
        setIsRefreshPaused(false);
        return;
      }

      /* -----------------------------
   Reorder within same column
   -----------------------------*/
      if (activeContainer === overContainer) {
        // Only reorder if dropping on another item (not the container itself)
        if (foundOverContainer) {
          const overIndex = newOrdersMap[overContainer].findIndex(
            (o) => o._id === overId
          );

          // If overIndex not found or is same index, nothing to do
          if (overIndex === -1 || overIndex === activeIndex) {
            setIsRefreshPaused(false);
            return;
          }

          newOrdersMap[activeContainer] = arrayMove(
            newOrdersMap[activeContainer],
            activeIndex,
            overIndex
          );

          setOrdersMap(newOrdersMap);

          await KDSService.updateKDS(
            activeOrderFromMap._id,
            {
              row_pos: overIndex,
            },
            kdsApi.token ?? ""
          );
        }
        // If dropped on the same container (not on an item), do nothing
        setIsRefreshPaused(false);
        return;
      }

      /* -----------------------------
   Move to different column
   -----------------------------*/

      // Remove from source container
      newOrdersMap[activeContainer] = newOrdersMap[activeContainer].filter(
        (o) => o._id !== activeId
      );

      const updatedOrder: KDSOrder = {
        ...activeOrderFromMap,
        stage: overContainer,
        updatedAt: new Date().toISOString(),
      };

      // If dropped on an item, insert at that position
      // If dropped on empty container, add as first item
      if (foundOverContainer) {
        const overIndex = newOrdersMap[overContainer].findIndex(
          (o) => o._id === overId
        );

        if (overIndex !== -1) {
          // Insert at the position of the item we dropped on
          newOrdersMap[overContainer].splice(overIndex, 0, updatedOrder);
        } else {
          // Fallback: add to end
          newOrdersMap[overContainer].push(updatedOrder);
        }
      } else {
        // Dropped on empty container or container itself - add as first item
        newOrdersMap[overContainer].unshift(updatedOrder);
      }

      // Calculate new position
      const newPos = newOrdersMap[overContainer].findIndex(
        (o) => o._id === activeId
      );

      setOrdersMap(newOrdersMap);

      // Backend updates
      await KDSService.updateKDS(
        activeOrderFromMap._id,
        {
          stage: overContainer,
          row_pos: newPos,
        },
        kdsApi.token ?? ""
      );

      // Update order state if needed (compare lowercased)
      const lastStageName = stages
        .find((s) => s.last_stage)
        ?.name?.toLowerCase();
      const cancelStageName = stages
        .find((s) => s.cancel_stage)
        ?.name?.toLowerCase();

      if (overContainer === lastStageName) {
        await KDSService.updateOrderState(
          activeOrderFromMap.order_id,
          "done",
          kdsApi.token ?? ""
        );
      } else if (overContainer === cancelStageName) {
        await KDSService.updateOrderState(
          activeOrderFromMap.order_id,
          "cancel",
          kdsApi.token ?? ""
        );
      }

      setIsRefreshPaused(false);
    },
    [ordersMap, stages]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Kitchen Display System
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 overflow-x-scroll">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              isConnected
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
              }`}
            ></div>
            <span>{isConnected ? "Connected" : "Disconnected"}</span>
          </div>
          <div className="text-sm text-gray-500">
            Total Orders: {Object.values(ordersMap).flat().length}
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-6">
          {Object.keys(ordersMap).map((stage) => (
            <StageColumn
              key={stage}
              stageId={stage}
              orders={ordersMap[stage]}
              stages={stages}
            />
          ))}
        </div>

        <DragOverlay>
          {activeOrder ? (
            <div className="opacity-90 rotate-3 scale-105">
              <OrderCard order={activeOrder} stages={stages} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
