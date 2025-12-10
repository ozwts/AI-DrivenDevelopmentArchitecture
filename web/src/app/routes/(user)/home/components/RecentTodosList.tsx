import { Link } from "react-router";
import { ClockIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { z } from "zod";
import { Card, Badge } from "@/app/lib/ui";
import {
  getStatusLabel,
  getPriorityLabel,
  getStatusBadgeVariant,
  getPriorityBadgeVariant,
} from "@/app/lib/utils";
import { schemas } from "@/generated/zod-schemas";

type TodoResponse = z.infer<typeof schemas.TodoResponse>;

type Props = {
  readonly todos: TodoResponse[];
  readonly onTodoClick: (todo: TodoResponse) => void;
};

export function RecentTodosList({ todos, onTodoClick }: Props) {
  if (todos.length === 0) {
    return null;
  }

  return (
    <Card className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <ClockIcon className="h-6 w-6 text-primary-600" />
          最近追加されたタスク
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
        {todos.map((todo) => (
          <button
            key={todo.id}
            onClick={() => {
              onTodoClick(todo);
            }}
            className="w-full text-left p-4 border border-border-light rounded-md hover:border-primary-600 hover:shadow-sm transition-all cursor-pointer"
            data-testid={`recent-todo-${todo.id}`}
            aria-label={`タスク: ${todo.title}`}
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
                  {todo.dueDate && (
                    <Badge variant="default">
                      期限: {new Date(todo.dueDate).toLocaleDateString("ja-JP")}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-text-tertiary mt-2">
                  作成: {new Date(todo.createdAt).toLocaleDateString("ja-JP")}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
