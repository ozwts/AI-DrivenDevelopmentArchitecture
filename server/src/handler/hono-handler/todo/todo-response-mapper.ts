import type { z } from "zod";
import { schemas } from "@/generated/zod-schemas";
import type { Todo } from "@/domain/model/todo/todo.entity";
import { TodoStatus } from "@/domain/model/todo/todo.entity";
import type { Attachment } from "@/domain/model/todo/attachment.entity";

type TodoResponse = z.infer<typeof schemas.TodoResponse>;
type AttachmentResponse = z.infer<typeof schemas.AttachmentResponse>;
type PrepareAttachmentResponse = z.infer<
  typeof schemas.PrepareAttachmentResponse
>;

/**
 * Attachmentエンティティを AttachmentResponseに変換する
 *
 * @param todoId 親TODOのID
 * @param attachment Attachmentエンティティ
 * @returns AttachmentResponse
 */
export const convertToAttachmentResponse = (
  todoId: string,
  attachment: Attachment,
): AttachmentResponse => ({
  id: attachment.id,
  todoId,
  filename: attachment.fileName,
  contentType: attachment.contentType,
  filesize: attachment.fileSize,
  status: attachment.status.status,
  createdAt: attachment.createdAt,
  updatedAt: attachment.updatedAt,
});

/**
 * TodoエンティティをTodoResponseに変換する
 *
 * UPLOADEDステータスの添付ファイルのみをレスポンスに含めます。
 * PREPAREDステータスのファイルは、アップロードが完了していないため除外されます。
 *
 * @param todo Todoエンティティ
 * @returns TodoResponse
 */
export const convertToTodoResponse = (todo: Todo): TodoResponse => ({
  id: todo.id,
  title: todo.title,
  description: todo.description,
  status: todo.status.status,
  priority: todo.priority,
  dueDate: todo.dueDate,
  projectId: todo.projectId,
  assigneeUserId: todo.assigneeUserId,
  attachments: todo.attachments
    .filter((attachment) => attachment.status.isUploaded())
    .map((attachment) => convertToAttachmentResponse(todo.id, attachment)),
  createdAt: todo.createdAt,
  updatedAt: todo.updatedAt,
});

/**
 * 文字列をTodoStatusに変換する
 *
 * @param status ステータス文字列（undefined許容）
 * @returns TodoStatus または undefined
 */
export const convertToTodoStatus = (
  status: "TODO" | "IN_PROGRESS" | "COMPLETED" | undefined,
): TodoStatus | undefined => {
  if (status === undefined) {
    return undefined;
  }
  switch (status) {
    case "TODO":
      return TodoStatus.todo();
    case "IN_PROGRESS":
      return TodoStatus.inProgress();
    case "COMPLETED":
      return TodoStatus.completed();
    default:
      return undefined;
  }
};

/**
 * アップロード準備完了レスポンスを生成する
 *
 * @param todoId 親TODOのID
 * @param uploadUrl 署名済みアップロードURL
 * @param attachment 添付ファイルエンティティ
 * @returns PrepareAttachmentResponse
 */
export const convertToPrepareAttachmentResponse = (
  todoId: string,
  uploadUrl: string,
  attachment: Attachment,
): PrepareAttachmentResponse => ({
  uploadUrl,
  attachment: convertToAttachmentResponse(todoId, attachment),
});
