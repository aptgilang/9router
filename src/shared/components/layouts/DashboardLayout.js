"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useNotificationStore } from "@/store/notificationStore";
import { cn } from "@/shared/utils/cn";
import Sidebar from "../Sidebar";
import Header from "../Header";

function getToastStyle(type) {
  if (type === "success") {
    return {
      wrapper: "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
      icon: "check_circle",
    };
  }
  if (type === "error") {
    return {
      wrapper: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
      icon: "error",
    };
  }
  if (type === "warning") {
    return {
      wrapper: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      icon: "warning",
    };
  }
  return {
    wrapper: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    icon: "info",
  };
}

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const notifications = useNotificationStore((state) => state.notifications);
  const removeNotification = useNotificationStore((state) => state.removeNotification);

  const isTabActive = (href) => {
    if (href === "/dashboard/endpoint") {
      return pathname === "/dashboard" || pathname.startsWith("/dashboard/endpoint");
    }
    return pathname.startsWith(href);
  };

  const mobileNavItems = [
    { href: "/dashboard/endpoint", label: "Endpoint", icon: "api" },
    { href: "/dashboard/providers", label: "Providers", icon: "dns" },
    { href: "/dashboard/combos", label: "Combos", icon: "layers" },
    { href: "/dashboard/usage", label: "Usage", icon: "bar_chart" },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg">
      <div className="fixed top-4 right-4 z-[80] flex w-[min(92vw,380px)] flex-col gap-2">
        {notifications.map((n) => {
          const style = getToastStyle(n.type);
          return (
            <div
              key={n.id}
              className={`rounded-lg border px-3 py-2 shadow-lg backdrop-blur-sm ${style.wrapper}`}
            >
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] leading-5">{style.icon}</span>
                <div className="min-w-0 flex-1">
                  {n.title ? <p className="text-xs font-semibold mb-0.5">{n.title}</p> : null}
                  <p className="text-xs whitespace-pre-wrap break-words">{n.message}</p>
                </div>
                {n.dismissible ? (
                  <button
                    type="button"
                    onClick={() => removeNotification(n.id)}
                    className="text-current/70 hover:text-current"
                    aria-label="Dismiss notification"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Sidebar - Mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform lg:hidden transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main className="flex flex-col flex-1 h-full min-w-0 relative transition-colors duration-300 isolate">
        {/* Faint grid background */}
        <div className="landing-grid absolute inset-0 pointer-events-none -z-10" aria-hidden="true" />
        <Header key={pathname} onMenuClick={() => setSidebarOpen(true)} />
        <div
          className={`flex-1 overflow-y-auto custom-scrollbar ${
            pathname === "/dashboard/basic-chat"
              ? "flex flex-col overflow-hidden"
              : "p-3.5 sm:p-5 md:p-6 lg:p-8 pb-24 lg:pb-8"
          }`}
        >
          <div className={`${pathname === "/dashboard/basic-chat" ? "flex-1 w-full h-full flex flex-col" : "max-w-7xl mx-auto"}`}>
            {children}
          </div>
        </div>

        {/* Mobile Bottom Floating Navigation Bar */}
        {pathname !== "/dashboard/basic-chat" && (
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-xl border-t border-border-subtle px-3 py-1.5 flex items-center justify-around shadow-lg">
            {mobileNavItems.map((item) => {
              const active = isTabActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer",
                    active
                      ? "text-primary font-semibold"
                      : "text-text-muted hover:text-text-main"
                  )}
                >
                  <span className={cn(
                    "material-symbols-outlined text-[20px] transition-transform",
                    active && "scale-110"
                  )}>
                    {item.icon}
                  </span>
                  <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
                </Link>
              );
            })}

            {/* Menu Drawer Toggle */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer",
                sidebarOpen ? "text-primary font-semibold" : "text-text-muted hover:text-text-main"
              )}
            >
              <span className="material-symbols-outlined text-[20px]">
                grid_view
              </span>
              <span className="text-[10px] mt-0.5 tracking-tight">More</span>
            </button>
          </nav>
        )}
      </main>
    </div>
  );
}
