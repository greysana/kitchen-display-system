"use client";

import KDS from "@/components/kds/KDS";
import ProtectedRoute from "@/components/protected-route";
import { useAuth } from "@/hooks/AuthContext";
import { useEffect } from "react";

export default function Home() {
  const { user, loading, refreshUser } = useAuth();

  console.log(user);
  console.log(loading);
  useEffect(() => {
    refreshUser();
  }, []);
  return (
    <ProtectedRoute requiredRoles={["user", "manager", "admin"]}>
      <KDS />
    </ProtectedRoute>
  );
}
