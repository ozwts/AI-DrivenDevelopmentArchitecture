import { Routes, Route, Outlet } from "react-router-dom";
import { Layout } from "./_shared/components";
import { ProtectedRoute } from "@/app/features/auth";

// 新しいルートコンポーネント
import { HomeRoute } from "./home";
import { TodosRoute } from "./todos";
import { ProjectsRoute } from "./projects";
import { ProfileRoute } from "./profile";
import { LoginRoute } from "./login";
import { SignupRoute } from "./signup";
import { ResetPasswordRoute } from "./reset-password";

/**
 * 認証が必要なルートのラッパー
 * ProtectedRouteとLayoutを1箇所にまとめる
 */
function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <Layout>
        <Outlet />
      </Layout>
    </ProtectedRoute>
  );
}

export function Router() {
  return (
    <Routes>
      {/* 公開ルート */}
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/signup" element={<SignupRoute />} />
      <Route path="/reset-password" element={<ResetPasswordRoute />} />

      {/* 認証が必要なルート */}
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/todos" element={<TodosRoute />} />
        <Route path="/projects" element={<ProjectsRoute />} />
        <Route path="/profile" element={<ProfileRoute />} />
      </Route>
    </Routes>
  );
}
