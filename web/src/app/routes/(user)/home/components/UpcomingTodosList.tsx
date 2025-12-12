import { Link } from "react-router";
import {
  ExclamationCircleIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { z } from "zod";
import { Card, Badge } from "@/app/lib/ui";
import {
  isOverdue,
  getDueDateLabel,
  getStatusLabel,
  getPriorityLabel,
  getStatusBadgeVariant,
  getPriorityBadgeVariant,
} from "@/app/lib/utils";
import { schemas } from "@/generated/zod-schemas";

type TodoResponse = z.infer<typeof schemas.TodoResponse>;
type TodoWithDueDate = TodoResponse & { dueDate: string };

type Props = {
  readonly todos: TodoWithDueDate[];
  readonly onTodoClick: (todo: TodoResponse) => void;
};

export function UpcomingTodosList({ todos, onTodoClick }: Props) {
  if (todos.length === 0) {
    return null;
  }

  return (
    <Card className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <ExclamationCircleIcon className="h-6 w-6 text-orange-500" />
          期限が近いタスク（3日以内）
        </h2>
        <Link
          to="/todos"
          className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-sm font-medium"
        >
          すべて表示
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
      <div className="space-y-3">
        {todos.map((todo) => {
          const overdueFlag = isOverdue(todo.dueDate);
          const dueDateLabel = getDueDateLabel(todo.dueDate);

          return (
            <button
              key={todo.id}
              onClick={() => {
                onTodoClick(todo);
              }}
              className="w-full text-left p-4 border border-border-light rounded-md hover:border-primary-600 hover:shadow-sm transition-all cursor-pointer"
              aria-label={`タスク: ${todo.title}、${dueDateLabel}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-text-primary mb-2">
                    {todo.title}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getStatusBadgeVariant(todo.status)}>
                      {getStatusLabel(todo.status)}
                    </Badge>
                    <Badge variant={getPriorityBadgeVariant(todo.priority)}>
                      {getPriorityLabel(todo.priority)}
                    </Badge>
                    <Badge
                      variant={overdueFlag ? "danger" : "warning"}
                      data-testid={
                        overdueFlag
                          ? `overdue-badge-${todo.id}`
                          : `due-badge-${todo.id}`
                      }
                    >
                      {overdueFlag && (
                        <ExclamationCircleIcon className="h-3 w-3 mr-1 inline" />
                      )}
                      {dueDateLabel}
                    </Badge>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
