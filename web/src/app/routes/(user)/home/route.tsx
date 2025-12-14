import { useEffect } from "react";
import { useNavigate } from "react-router";
import { z } from "zod";
import { LoadingSpinner } from "@/app/lib/ui";
import { buildLogger } from "@/app/lib/logger";
import { schemas } from "@/generated/zod-schemas";
import { useTodos } from "@/app/features/todo";
import { StatsGrid, UpcomingTodosList, RecentTodosList } from "./components";

const logger = buildLogger("HomeRoute");

type TodoResponse = z.infer<typeof schemas.TodoResponse>;
type TodoWithDueDate = TodoResponse & { dueDate: string };

export default function HomeRoute() {
  const navigate = useNavigate();
  const { data: todos, isLoading } = useTodos();

  const todoCount =
    todos?.filter((t: TodoResponse) => t.status === "TODO").length ?? 0;
  const inProgressCount =
    todos?.filter((t: TodoResponse) => t.status === "IN_PROGRESS").length ?? 0;
  const doneCount =
    todos?.filter((t: TodoResponse) => t.status === "COMPLETED").length ?? 0;

  const recentTodos =
    todos
      ?.filter((t: TodoResponse) => t.status !== "COMPLETED")
      .sort(
        (a: TodoResponse, b: TodoResponse) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5) ?? [];

  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const upcomingTodos: TodoWithDueDate[] =
    todos
      ?.filter((t: TodoResponse): t is TodoWithDueDate => {
        if (t.status === "COMPLETED" || t.dueDate === undefined) return false;
        const dueDate = new Date(t.dueDate);
        return dueDate <= threeDaysLater;
      })
      .sort((a, b) => {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }) ?? [];

  // ページ表示ログ
  useEffect(() => {
    if (!isLoading && todos) {
      logger.info("ホームページ表示", {
        todoCount,
        inProgressCount,
        doneCount,
      });
    }
  }, [isLoading, todos, todoCount, inProgressCount, doneCount]);

  const handleTodoClick = (todo: TodoResponse) => {
    logger.info("TODO詳細遷移", { todoId: todo.id, todoTitle: todo.title });
    navigate(`/todos/${todo.id}`);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-text-primary mb-4">TODO App</h1>
        <p className="text-xl text-text-secondary">
          タスクを効率的に管理しましょう
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <StatsGrid
            todoCount={todoCount}
            inProgressCount={inProgressCount}
            doneCount={doneCount}
          />
          <UpcomingTodosList
            todos={upcomingTodos}
            onTodoClick={handleTodoClick}
          />
          <RecentTodosList todos={recentTodos} onTodoClick={handleTodoClick} />
        </>
      )}
    </div>
  );
}
