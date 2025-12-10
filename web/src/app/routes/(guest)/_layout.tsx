import { Outlet, Navigate } from "react-router";
import { useAuth } from "@/app/features/auth";
import { LoadingSpinner } from "@/app/lib/ui/LoadingSpinner";

/**
 * 未認証ユーザー専用のレイアウト
 * 認証済みの場合はホームにリダイレクト
 */
export default function GuestLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
