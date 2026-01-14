"use client";

import { useAuth } from "@/hooks/AuthContext";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Monitor,
  Users,
  User,
  LogOut,
  Home,
  ChevronUp,
  ChevronDown,
  Loader,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
}

const navigationItems: NavItem[] = [
  {
    label: "KDS",
    href: "/",
    icon: <Monitor className="w-5 h-5" />,
    roles: ["user", "manager", "admin"],
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ["manager", "admin"],
  },

  {
    label: "Customer",
    href: "/customer",
    icon: <Users className="w-5 h-5" />,
    roles: ["user", "manager", "admin"],
  },
];

export default function RoleBasedNavigation() {
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);

  if (!user) return null;

  // Filter navigation items based on user roles
  const allowedNavItems = navigationItems.filter((item) =>
    item.roles.some((role) => user.roles?.includes(role))
  );

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      setIsVisible(false);
      setLoading(false);

      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      logout();
      setIsVisible(false);
      router.push("/login");
    }
  };
  // if (!user) return null;
  return (
    <>
      {/* Toggle Button - Always visible at top */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed top-0 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-b-lg shadow-lg px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all duration-300"
        aria-label={isVisible ? "Hide navigation" : "Show navigation"}
      >
        {isVisible ? (
          <ChevronUp className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
        ) : (
          <ChevronDown className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
        )}
      </button>

      {/* Navigation */}
      <nav
        className={`bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ease-in-out ${
          isVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="shrink-0">
                <h1
                  className={`text-2xl sm:text-3xl font-bold
                      bg-linear-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent
                  }`}
                >
                  Kitchen Display
                </h1>
              </Link>
              <div className="hidden md:flex space-x-1">
                {allowedNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div data-testid="user_auth" className="hidden sm:flex items-center space-x-3 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                <User className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                <div className="text-sm">
                  <span className="font-medium text-zinc-900 dark:text-white">
                    {user.name}
                  </span>
                 
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                title="Logout"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 dark:border-white mx-auto"></div>
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                Logout
                <span className="hidden sm:inline"></span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {allowedNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${
                    isActive
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Spacer to prevent content from being hidden under nav when visible */}
      <div
        className={`transition-all duration-300 ${
          isVisible ? "h-16 md:h-16" : "h-0"
        }`}
      />
    </>
  );
}
