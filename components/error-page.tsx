"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, Lock, UserX, Home } from "lucide-react";

interface ErrorPageProps {
  type: "unauthorized" | "forbidden" | "session-expired" | "not-found";
}

export default function ErrorPage({ type }: ErrorPageProps) {
  const router = useRouter();

  const errorConfig = {
    unauthorized: {
      icon: <Lock className="w-16 h-16 text-amber-500" />,
      title: "Authentication Required",
      message: "You need to be logged in to access this page.",
      action: "Go to Login",
      actionHandler: () => router.push("/login"),
    },
    forbidden: {
      icon: <UserX className="w-16 h-16 text-red-500" />,
      title: "Access Denied",
      message:
        "You don't have permission to access this page. Please contact your administrator if you believe this is an error.",
      action: "Go to Home",
      actionHandler: () => router.push("/"),
    },
    "session-expired": {
      icon: <AlertCircle className="w-16 h-16 text-orange-500" />,
      title: "Session Expired",
      message:
        "Your session has expired for security reasons. Please log in again to continue.",
      action: "Go to Login",
      actionHandler: () => router.push("/login"),
    },
    "not-found": {
      icon: <Home className="w-16 h-16 text-blue-500" />,
      title: "Page Not Found",
      message:
        "The page you're looking for doesn't exist or has been moved.",
      action: "Go to Home",
      actionHandler: () => router.push("/"),
    },
  };

  const config = errorConfig[type];

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">{config.icon}</div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">
          {config.title}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
          {config.message}
        </p>
        <button
          onClick={config.actionHandler}
          className="px-6 py-3 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
        >
          {config.action}
        </button>
      </div>
    </div>
  );
}