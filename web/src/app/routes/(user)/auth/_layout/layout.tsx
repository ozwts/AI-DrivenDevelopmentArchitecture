import { Outlet, Navigate } from "react-router";
import { useAuth } from "@/app/features/auth";

/**
 * 未認証ユーザー専用のレイアウト
 * 認証済みの場合はホームにリダイレクト
 */
export default function GuestLayout() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
