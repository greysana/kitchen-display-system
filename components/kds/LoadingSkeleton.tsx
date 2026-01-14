// Loading Skeleton
export function LoadingSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-6" data-testid="kds-skeleton">
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
