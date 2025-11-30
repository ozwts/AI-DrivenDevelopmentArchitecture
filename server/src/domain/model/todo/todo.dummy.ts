import { Todo, TodoStatus, type TodoPriority } from "./todo";
import type { Attachment } from "./attachment";
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

  return new Todo({
    id: props?.id ?? getDummyId(),
    title: props?.title ?? getDummyShortText(),
    description: props?.description !== undefined ? props.description : getDummyDescription(),
    status: props?.status !== undefined ? props.status : todoStatusDummyFrom(),
    priority: props?.priority !== undefined ? props.priority : getDummyTodoPriority(),
    dueDate: props?.dueDate !== undefined ? props.dueDate : getDummyDueDate(),
    projectId: props?.projectId !== undefined ? props.projectId : getDummyId(),
    assigneeUserId: props?.assigneeUserId ?? getDummyId(),
    attachments: props?.attachments !== undefined ? props.attachments : [],
    createdAt: props?.createdAt ?? now,
    updatedAt: props?.updatedAt ?? now,
  });
};
