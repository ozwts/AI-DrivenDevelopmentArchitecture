import { Link } from "react-router";
import {
  ExclamationCircleIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { z } from "zod";
import { Card, Badge } from "@/app/lib/ui";
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

  const now = new Date();

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
          const dueDate = new Date(todo.dueDate);
          const isOverdue = dueDate < now;
          const daysUntilDue = Math.ceil(
            (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );

          return (
            <button
              key={todo.id}
              onClick={() => onTodoClick(todo)}
              className="w-full text-left p-4 border border-border-light rounded-md hover:border-primary-600 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-text-primary mb-2">
                    {todo.title}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={
                        todo.status === "IN_PROGRESS" ? "info" : "default"
                      }
                    >
                      {todo.status === "TODO"
                        ? "未着手"
                        : todo.status === "IN_PROGRESS"
                          ? "進行中"
                          : "完了"}
                    </Badge>
                    <Badge
                      variant={
                        todo.priority === "HIGH"
                          ? "danger"
                          : todo.priority === "MEDIUM"
                            ? "warning"
                            : "default"
                      }
                    >
                      {todo.priority === "HIGH"
                        ? "高"
                        : todo.priority === "MEDIUM"
                          ? "中"
                          : "低"}
                    </Badge>
                    <Badge variant={isOverdue ? "danger" : "warning"}>
                      {isOverdue && (
                        <ExclamationCircleIcon className="h-3 w-3 mr-1 inline" />
                      )}
                      {isOverdue
                        ? "期限超過"
                        : daysUntilDue === 0
                          ? "今日が期限"
                          : `残り${daysUntilDue}日`}
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
