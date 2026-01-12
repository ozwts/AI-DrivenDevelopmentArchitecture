import { Hono } from "hono";
import type { Container } from "inversify";
import { buildListUsersHandler } from "./list-users-handler";
import { buildGetUserHandler } from "./get-user-handler";
import { buildGetCurrentUserHandler } from "./get-current-user-handler";
import { buildRegisterCurrentUserHandler } from "./register-current-user-handler";
import { buildUpdateCurrentUserHandler } from "./update-current-user-handler";
import { buildDeleteCurrentUserHandler } from "./delete-current-user-handler";
import { buildSearchUsersHandler } from "./search-users-handler";

export const buildUserRouter = ({
  container,
}: {
  container: Container;
}): Hono => {
  const userRouter = new Hono();

  // GET /users/search - ユーザー検索
  userRouter.get("/search", buildSearchUsersHandler({ container }));

  // GET /users - ユーザーリスト
  userRouter.get("/", buildListUsersHandler({ container }));

  // GET /users/me - 現在のユーザー情報を取得
  userRouter.get("/me", buildGetCurrentUserHandler({ container }));

  // POST /users/me - 現在のユーザーを登録
  userRouter.post("/me", buildRegisterCurrentUserHandler({ container }));

  // PUT /users/me - 現在のユーザー情報を更新
  userRouter.put("/me", buildUpdateCurrentUserHandler({ container }));

  // DELETE /users/me - 現在のユーザーを削除（自分自身のアカウントのみ）
  userRouter.delete("/me", buildDeleteCurrentUserHandler({ container }));

  // GET /users/:userId - ユーザー詳細
  userRouter.get("/:userId", buildGetUserHandler({ container }));

  return userRouter;
};
