import { Routes, Route, Outlet } from "react-router-dom";
import { Layout } from "../components";
import { HomePage } from "../pages/HomePage";
import { TodosPage } from "../pages/TodosPage";
import { ProjectsPage } from "../pages/ProjectsPage";
import { ProfilePage } from "../pages/ProfilePage";
import { LoginPage } from "../pages/LoginPage";
import { SignupPage } from "../pages/SignupPage";
import { ResetPasswordPage } from "../pages/ResetPasswordPage";
import { ProtectedRoute } from "../auth/ProtectedRoute";

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
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* 認証が必要なルート */}
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/todos" element={<TodosPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}
