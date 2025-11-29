import type { z } from "zod";
import { schemas } from "@/generated/zod-schemas";
import type { Todo } from "@/domain/model/todo/todo";
import type { Attachment } from "@/domain/model/todo/attachment";

type TodoResponse = z.infer<typeof schemas.TodoResponse>;
type AttachmentResponse = z.infer<typeof schemas.AttachmentResponse>;

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
  size: attachment.fileSize,
  status: attachment.status,
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
  status: todo.status,
  priority: todo.priority,
  dueDate: todo.dueDate,
  projectId: todo.projectId,
  assigneeUserId: todo.assigneeUserId,
  attachments: todo.attachments
    .filter((attachment) => attachment.status === "UPLOADED")
    .map((attachment) => convertToAttachmentResponse(todo.id, attachment)),
  createdAt: todo.createdAt,
  updatedAt: todo.updatedAt,
});
