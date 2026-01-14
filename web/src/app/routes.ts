import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  // 認証ページ（公開）
  layout("routes/(user)/auth/_layout/layout.tsx", [
    route("auth", "routes/(user)/auth/route.tsx"),
    route("auth/signup", "routes/(user)/auth/signup/route.tsx"),
    route("auth/signup/confirm", "routes/(user)/auth/signup/confirm/route.tsx"),
    route("auth/reset-password", "routes/(user)/auth/reset-password/route.tsx"),
  ]),

  // アプリページ（認証必要）
  layout("routes/(user)/_layout/layout.tsx", [
    index("routes/(user)/home/route.tsx"),
    route("profile", "routes/(user)/profile/route.tsx"),

    // Projects
    route("projects", "routes/(user)/projects/route.tsx"),
    route("projects/new", "routes/(user)/projects/new/route.tsx"),
    route("projects/:projectId", "routes/(user)/projects/[projectId]/route.tsx", [
      index("routes/(user)/projects/[projectId]/_index/route.tsx"),
      route("edit", "routes/(user)/projects/[projectId]/edit/route.tsx"),
      route("members", "routes/(user)/projects/[projectId]/members/route.tsx"),
    ]),

    // Todos
    route("todos", "routes/(user)/todos/route.tsx"),
    route("todos/new", "routes/(user)/todos/new/route.tsx"),
    route("todos/:todoId", "routes/(user)/todos/[todoId]/route.tsx", [
      index("routes/(user)/todos/[todoId]/_index/route.tsx"),
      route("edit", "routes/(user)/todos/[todoId]/edit/route.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
