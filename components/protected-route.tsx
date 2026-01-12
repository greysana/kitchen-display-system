"use client";

import { useAuth } from "@/hooks/AuthContext";
import ErrorPage from "./error-page";
import { useEffect } from "react";
import RoleBasedNavigation from "./role-base-navigation";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export default function ProtectedRoute({
  children,
  requiredRoles = [],
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  console.log(user);
  console.log(loading);
  
  // Check if user is authenticated
  if (!user && !loading) {
    return <ErrorPage type="unauthorized" />;
  }

  // Check if user has required roles (if any specified)
  if (requiredRoles.length > 0 && !loading && user) {
    const hasRequiredRole = requiredRoles.some((role) =>
      user.roles?.includes(role)
    );

    if (!hasRequiredRole) {
      return <ErrorPage type="forbidden" />;
    }
  }

  // User is authenticated and authorized
  return (
    <>
      <RoleBasedNavigation />
      {children}
    </>
  );
}