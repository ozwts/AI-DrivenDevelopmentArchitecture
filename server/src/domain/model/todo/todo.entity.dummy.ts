import { Todo, TodoStatus, type TodoPriority } from "./todo.entity";
import type { Attachment } from "./attachment.entity";
import { todoStatusDummyFrom } from "./todo-status.vo.dummy";
import {
  getDummyId,
  getDummyShortText,
  getDummyDescription,
  getDummyRecentDate,
  getDummyTodoPriority,
  getDummyDueDate,
} from "@/util/testing-util/dummy-data";

export type TodoDummyProps = Partial<{
  id: string;
  title: string;
  description: string | undefined;
  status: TodoStatus;
  priority: TodoPriority;
  dueDate: string | undefined;
  projectId: string | undefined;
  assigneeUserId: string;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}>;

/**
 * テスト用のダミーTODOを生成する
 *
 * @example todoDummyFrom()
 * @example todoDummyFrom({ title: "カスタムタイトル" })
 * @example todoDummyFrom({ status: TodoStatus.inProgress(), priority: "HIGH" })
 */
export const todoDummyFrom = (props?: TodoDummyProps): Todo => {
  const now = getDummyRecentDate();

  return Todo.from({
    id: props?.id ?? getDummyId(),
    title: props?.title ?? getDummyShortText(),
    description:
      props !== undefined && "description" in props
        ? props.description
        : getDummyDescription(),
    status: props?.status ?? todoStatusDummyFrom(),
    priority: props?.priority ?? getDummyTodoPriority(),
    dueDate:
      props !== undefined && "dueDate" in props
        ? props.dueDate
        : getDummyDueDate(),
    projectId:
      props !== undefined && "projectId" in props
        ? props.projectId
        : getDummyId(),
    assigneeUserId: props?.assigneeUserId ?? getDummyId(),
    attachments: props?.attachments ?? [],
    createdAt: props?.createdAt ?? now,
    updatedAt: props?.updatedAt ?? now,
  });
};
