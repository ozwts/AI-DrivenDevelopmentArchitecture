import { Outlet, Navigate } from "react-router";
import { useAuth } from "@/app/features/auth";
import { LoadingSpinner } from "@/app/lib/ui";
import { Header } from "./Header";

/**
 * 認証必須ルートのレイアウト
 * 未認証の場合はログインページにリダイレクト
 */
export default function UserLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-primary-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
