"use client";
import kdsApi from "@/lib/kds-auth-service";
import { KDSUser } from "@/types/auth.types";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

interface AuthContextType {
  user: KDSUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<KDSUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkAuth = async () => {
    setLoading(true);
    if (kdsApi.token) {
      try {
        const result = await kdsApi.verifyToken();
        if (result.valid && result.user) {
          setUser(result.user);
          setLoading(false);
        }
      } catch (err) {
        setLoading(false);

        console.error("Auth check failed:", err);
      } finally {
        setLoading(false);
      }
    }
  };
  useEffect(() => {
    checkAuth();
    setLoading(false);
  }, []);

  const logout = async () => {
    setLoading(true);
    try {
      await kdsApi.logout();
      setUser(null);

      console.log("Logout successful");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoading(false);
      router.push("/login");
    }
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,

        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
