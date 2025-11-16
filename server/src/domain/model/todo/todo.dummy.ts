import { Todo, type TodoStatus, type TodoPriority } from "./todo";
import type { Attachment } from "../attachment/attachment";
import {
  getDummyId,
  getDummyShortText,
  getDummyDescription,
  getDummyRecentDate,
  getDummyTodoStatus,
  getDummyTodoPriority,
  getDummyDueDate,
} from "@/util/testing-util/dummy-data";

export type TodoDummyProps = Partial<{
  id: string;
  title: string;
  description?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  dueDate?: string;
  projectId?: string;
  assigneeUserId: string;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
}>;

/**
 * テスト用のダミーTODOを生成する
 *
 * @example todoDummyFrom()
 * @example todoDummyFrom({ title: "カスタムタイトル" })
 * @example todoDummyFrom({ status: "IN_PROGRESS", priority: "HIGH" })
 */
export const todoDummyFrom = (props?: TodoDummyProps): Todo => {
  const now = getDummyRecentDate();

  return new Todo({
    id: props?.id ?? getDummyId(),
    title: props?.title ?? getDummyShortText(),
    description: props?.description ?? getDummyDescription(),
    status: props?.status ?? getDummyTodoStatus(),
    priority: props?.priority ?? getDummyTodoPriority(),
    dueDate: props?.dueDate ?? getDummyDueDate(),
    projectId: props?.projectId ?? getDummyId(),
    assigneeUserId: props?.assigneeUserId ?? getDummyId(),
    attachments: props?.attachments ?? [],
    createdAt: props?.createdAt ?? now,
    updatedAt: props?.updatedAt ?? now,
  });
};
