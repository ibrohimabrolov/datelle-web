import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell, ShellSkeleton } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="theme-app">
      <Suspense fallback={<ShellSkeleton />}>
        <AdminShell>{children}</AdminShell>
      </Suspense>
    </div>
  );
}
