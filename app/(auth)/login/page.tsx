"use client";
import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { KDSUser, LoginResponse } from "@/types/auth.types";
import kdsApi from "@/lib/kds-auth-service";

interface LoginFormState {
  login: string;
  password: string;
}

export default function KDSLoginPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<KDSUser | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [loginForm, setLoginForm] = useState<LoginFormState>({
    login: "",
    password: "",
  });

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (kdsApi.token) {
        try {
          const result = await kdsApi.verifyToken();
          if (result.valid && result.user) {
            setUser(result.user);
            setIsLoggedIn(true);
          }
        } catch (err) {
          console.error("Auth check failed:", err);
        }
      }
    };

    checkAuth();
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response: LoginResponse = await kdsApi.login(
        loginForm.login,
        loginForm.password
      );

      if (response.success && response.user) {
        setUser(response.user);
        setIsLoggedIn(true);
        console.log("Login successful:", response);

        router.push("/");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Login view
  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white min-h-140 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">KDS Login</h1>
          <p className="text-gray-600">
            Sign in to access the Kitchen Display System
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 my-15">
          <div className="my-5">
            <label
              htmlFor="login"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email / Login
            </label>
            <input
              id="login"
              name="login"
              type="email"
              value={loginForm.login}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              placeholder="user@example.com"
              required
              autoComplete="username"
            />
          </div>

          <div className="my-5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={loginForm.password}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-10 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 font-medium transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
