// StageColumn.tsx
import { KDSOrder, Stage } from "@/types/types";
import {
  SortableContext as _SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { OrderCard } from "./OrderCard";
const SortableContext = _SortableContext as unknown as React.FC<
  React.PropsWithChildren<{
    items: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    strategy?: any;
    disabled?: boolean;
  }>
>;
function EmptyDropZone({ id }: { id: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`mt-4 h-32 border-2 border-dashed rounded-lg flex items-center justify-center transition-all ${
        isOver
          ? "border-green-500 bg-green-50 scale-105"
          : "border-gray-300 text-gray-400"
      }`}
    >
      Drop here
    </div>
  );
}
export function StageColumn({
  stageId,
  orders,
  stages,
}: {
  stageId: string;
  orders: KDSOrder[];
  stages: Stage[];
}) {
  const { isOver, setNodeRef } = useDroppable({ id: stageId });

  return (
    <div
      ref={setNodeRef}
      className={`bg-gray-50 rounded-xl p-4 min-h-[calc(100vh-8rem)] w-80 transition-all ${
        isOver ? "bg-green-50 ring-2 ring-green-400 scale-105" : ""
      }`}
    >
      <div className="sticky top-0 bg-gray-50 pb-4 z-10">
        <h3 className="font-bold text-center text-gray-700 uppercase tracking-wide text-lg">
          {stageId}
        </h3>
        <div className="text-center text-sm text-gray-500 mt-1">
          {orders.length} {orders.length === 1 ? "order" : "orders"}
        </div>
      </div>

      {/* ALWAYS render SortableContext even when `orders` is empty.
          This makes the column a valid drop target for empty columns. */}
      <SortableContext
        items={orders.map((o) => o._id)}
        strategy={verticalListSortingStrategy}
      >
        {orders.length === 0 ? (
          <EmptyDropZone id={stageId} />
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <OrderCard key={order._id} order={order} stages={stages} />
            ))}
          </div>
        )}
      </SortableContext>
    </div>
  );
}

// Loading Skeleton
export function LoadingSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-6">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          key={idx}
          className="bg-gray-50 rounded-xl p-4 min-h-[calc(100vh-8rem)] w-80 animate-pulse"
        >
          <div className="h-6 bg-gray-200 rounded mb-4 w-32 mx-auto"></div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, cardIdx) => (
              <div key={cardIdx} className="h-32 bg-white rounded-xl"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
