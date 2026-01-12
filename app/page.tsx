"use client";

import KDS from "@/components/kds/KDS";
import ProtectedRoute from "@/components/protected-route";
import RoleBasedNavigation from "@/components/role-base-navigation";
import { useAuth } from "@/hooks/AuthContext";
import kdsApi from "@/lib/kds-auth-service";
import { User, LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
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
