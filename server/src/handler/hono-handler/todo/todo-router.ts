import { Hono } from "hono";
import type { Container } from "inversify";
import { buildRegisterTodoHandler } from "./register-todo-handler";
import { buildListTodosHandler } from "./list-todos-handler";
import { buildGetTodoHandler } from "./get-todo-handler";
import { buildUpdateTodoHandler } from "./update-todo-handler";
import { buildDeleteTodoHandler } from "./delete-todo-handler";
import { buildListAttachmentsHandler } from "./list-attachments-handler";
import { buildPrepareAttachmentUploadHandler } from "./prepare-attachment-upload-handler";
import { buildUpdateAttachmentStatusHandler } from "./update-attachment-status-handler";
import { buildGetAttachmentDownloadUrlHandler } from "./get-attachment-download-url-handler";
import { buildDeleteAttachmentHandler } from "./delete-attachment-handler";

export const buildTodoRouter = ({
  container,
}: {
  container: Container;
}): Hono => {
  const todoRouter = new Hono();

  // GET /todos - TODO一覧
  todoRouter.get("/", buildListTodosHandler({ container }));

  // POST /todos - TODO登録
  todoRouter.post("/", buildRegisterTodoHandler({ container }));

  // GET /todos/:todoId - TODO詳細
  todoRouter.get("/:todoId", buildGetTodoHandler({ container }));

  // PATCH /todos/:todoId - TODO更新
  todoRouter.patch("/:todoId", buildUpdateTodoHandler({ container }));

  // DELETE /todos/:todoId - TODO削除
  todoRouter.delete("/:todoId", buildDeleteTodoHandler({ container }));

  // GET /todos/:todoId/attachments - 添付ファイル一覧
  todoRouter.get(
    "/:todoId/attachments",
    buildListAttachmentsHandler({ container }),
  );

  // POST /todos/:todoId/attachments - 添付ファイルアップロード準備
  todoRouter.post(
    "/:todoId/attachments",
    buildPrepareAttachmentUploadHandler({ container }),
  );

  // PATCH /todos/:todoId/attachments/:attachmentId - 添付ファイルステータス更新
  todoRouter.patch(
    "/:todoId/attachments/:attachmentId",
    buildUpdateAttachmentStatusHandler({ container }),
  );

  // GET /todos/:todoId/attachments/:attachmentId/download-url - ダウンロードURL取得
  todoRouter.get(
    "/:todoId/attachments/:attachmentId/download-url",
    buildGetAttachmentDownloadUrlHandler({ container }),
  );

  // DELETE /todos/:todoId/attachments/:attachmentId - 添付ファイル削除
  todoRouter.delete(
    "/:todoId/attachments/:attachmentId",
    buildDeleteAttachmentHandler({ container }),
  );

  return todoRouter;
};
