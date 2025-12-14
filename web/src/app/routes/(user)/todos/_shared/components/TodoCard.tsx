import {
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  FolderIcon,
  UserCircleIcon,
  PaperClipIcon,
} from "@heroicons/react/24/outline";
import { z } from "zod";
import { Card, Badge, Button } from "@/app/lib/ui";
import { isOverdue as checkOverdue } from "@/app/lib/utils/formatter";
import { schemas } from "@/generated/zod-schemas";

type TodoResponse = z.infer<typeof schemas.TodoResponse>;
type TodoStatus = z.infer<typeof schemas.TodoStatus>;
type TodoPriority = z.infer<typeof schemas.TodoPriority>;
type ProjectResponse = z.infer<typeof schemas.ProjectResponse>;
type UserResponse = z.infer<typeof schemas.UserResponse>;

type TodoCardProps = {
  readonly todo: TodoResponse;
  readonly project?: ProjectResponse;
  readonly assignee?: UserResponse;
  readonly onEdit: (todo: TodoResponse) => void;
  readonly onDelete: (todo: TodoResponse) => void;
  readonly onStatusChange: (todo: TodoResponse, status: TodoStatus) => void;
  readonly onView?: (todo: TodoResponse) => void;
};

const statusConfig: Record<
  TodoStatus,
  {
    label: string;
    variant: "default" | "success" | "warning" | "info";
    icon: typeof CheckCircleIcon;
  }
> = {
  TODO: {
    label: "未着手",
    variant: "default",
    icon: ClockIcon,
  },
  IN_PROGRESS: {
    label: "進行中",
    variant: "info",
    icon: ClockIcon,
  },
  COMPLETED: {
    label: "完了",
    variant: "success",
    icon: CheckCircleIcon,
  },
};

const priorityConfig: Record<
  TodoPriority,
  { label: string; variant: "default" | "warning" | "danger" }
> = {
  LOW: { label: "低", variant: "default" },
  MEDIUM: { label: "中", variant: "warning" },
  HIGH: { label: "高", variant: "danger" },
};

export const TodoCard = ({
  todo,
  project,
  assignee,
  onEdit,
  onDelete,
  onStatusChange,
  onView,
}: TodoCardProps) => {
  const statusCfg = statusConfig[todo.status];
  const priorityCfg = priorityConfig[todo.priority];
  const StatusIcon = statusCfg.icon;

  const overdueFlag =
    todo.dueDate != null &&
    checkOverdue(todo.dueDate) &&
    todo.status !== "COMPLETED";

  const nextStatus: TodoStatus | null =
    todo.status === "TODO"
      ? "IN_PROGRESS"
      : todo.status === "IN_PROGRESS"
        ? "COMPLETED"
        : null;

  const handleStatusClick = () => {
    if (nextStatus) {
      onStatusChange(todo, nextStatus);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base font-semibold text-text-primary">
                {todo.title}
              </h3>
            </div>
            {todo.description && (
              <p className="text-text-secondary text-sm line-clamp-2">
                {todo.description}
              </p>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusCfg.variant}>
            <StatusIcon className="h-3 w-3 mr-1 inline" />
            {statusCfg.label}
          </Badge>
          <Badge variant={priorityCfg.variant}>{priorityCfg.label}</Badge>
          {assignee && (
            <Badge variant="info">
              <UserCircleIcon className="h-3 w-3 mr-1 inline" />
              {assignee.name}
            </Badge>
          )}
          {project && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border"
              style={{
                backgroundColor: project.color + "20",
                color: project.color,
                borderColor: project.color,
              }}
            >
              <FolderIcon className="h-3 w-3" />
              {project.name}
            </span>
          )}
          {todo.dueDate && (
            <Badge variant={overdueFlag ? "danger" : "default"}>
              {overdueFlag && (
                <ExclamationCircleIcon className="h-3 w-3 mr-1 inline" />
              )}
              期限: {new Date(todo.dueDate).toLocaleDateString("ja-JP")}
            </Badge>
          )}
          {todo.attachments.length > 0 && (
            <Badge variant="default">
              <PaperClipIcon className="h-3 w-3 mr-1 inline" />
              {todo.attachments.length}件
            </Badge>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border-light">
          <div className="flex items-center gap-3">
            <div className="text-xs text-text-tertiary">
              作成: {new Date(todo.createdAt).toLocaleDateString("ja-JP")}
            </div>
            {onView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onView(todo);
                }}
              >
                詳細を見る
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {todo.status !== "COMPLETED" && (
              <Button variant="secondary" size="sm" onClick={handleStatusClick}>
                {todo.status === "TODO" ? "開始" : "完了"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onEdit(todo);
              }}
              className="!p-2"
              aria-label="編集"
            >
              <PencilIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onDelete(todo);
              }}
              className="!p-2 text-red-600 hover:text-red-700"
              aria-label="削除"
            >
              <TrashIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
