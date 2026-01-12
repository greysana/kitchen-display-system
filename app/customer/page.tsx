"use client";

import CustomerDisplay from "@/components/kds/CustomerDisplay";
import ProtectedRoute from "@/components/protected-route";

export default function Home() {
  return (
    <ProtectedRoute requiredRoles={["user", "manager", "admin"]}>
      <div className="flex min-h-screen w-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        {/* <main className="w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start"> */}
        <CustomerDisplay />
        {/* </main> */}
      </div>
    </ProtectedRoute>
  );
}
