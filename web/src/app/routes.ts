import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  // 未認証ユーザー専用（GuestLayout適用）
  layout("features/auth/GuestLayout.tsx", [
    route("login", "routes/_guest+/login+/route.tsx"),
    route("signup", "routes/_guest+/signup+/route.tsx"),
    route("signup/confirm", "routes/_guest+/signup+/confirm+/route.tsx"),
    route("reset-password", "routes/_guest+/reset-password+/route.tsx"),
  ]),

  // 認証必須（AppLayout適用）
  layout("features/auth/AppLayout.tsx", [
    index("routes/home/route.tsx"),
    route("profile", "routes/profile/route.tsx"),

    // Projects
    route("projects", "routes/projects+/route.tsx"),
    route("projects/new", "routes/projects+/new+/route.tsx"),
    route("projects/:projectId", "routes/projects+/$projectId+/route.tsx"),
    route(
      "projects/:projectId/edit",
      "routes/projects+/$projectId+/edit+/route.tsx",
    ),

    // Todos
    route("todos", "routes/todos+/route.tsx"),
    route("todos/new", "routes/todos+/new+/route.tsx"),
    route("todos/:todoId", "routes/todos+/$todoId+/route.tsx"),
    route("todos/:todoId/edit", "routes/todos+/$todoId+/edit+/route.tsx"),
  ]),
] satisfies RouteConfig;
