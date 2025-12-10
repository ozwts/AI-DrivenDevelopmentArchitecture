import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  // ゲストロール（未認証ユーザー）
  layout("routes/(guest)/_layout.tsx", [
    route("login", "routes/(guest)/login/route.tsx"),
    route("signup", "routes/(guest)/signup/route.tsx"),
    route("signup/confirm", "routes/(guest)/signup/confirm/route.tsx"),
    route("reset-password", "routes/(guest)/reset-password/route.tsx"),
  ]),

  // ユーザーロール（認証済みユーザー）
  layout("routes/(user)/_layout.tsx", [
    index("routes/(user)/home/route.tsx"),
    route("profile", "routes/(user)/profile/route.tsx"),

    // Projects
    route("projects", "routes/(user)/projects/route.tsx"),
    route("projects/new", "routes/(user)/projects/new/route.tsx"),
    route("projects/:projectId", "routes/(user)/projects/[projectId]/route.tsx"),
    route(
      "projects/:projectId/edit",
      "routes/(user)/projects/[projectId]/edit/route.tsx",
    ),

    // Todos
    route("todos", "routes/(user)/todos/route.tsx"),
    route("todos/new", "routes/(user)/todos/new/route.tsx"),
    route("todos/:todoId", "routes/(user)/todos/[todoId]/route.tsx"),
    route("todos/:todoId/edit", "routes/(user)/todos/[todoId]/edit/route.tsx"),
  ]),
] satisfies RouteConfig;
