import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ListBulletIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { useTodos, useUpdateTodo } from "../../hooks/useTodos";
import { Card, LoadingSpinner, Badge, Modal } from "../../components";
import { TodoForm } from "../TodosPage/TodoForm";
import { useToast } from "../../contexts/ToastContext";
import { z } from "zod";
import { schemas } from "../../generated/zod-schemas";

type TodoResponse = z.infer<typeof schemas.TodoResponse>;
type UpdateTodoParams = z.infer<typeof schemas.UpdateTodoParams>;

export function HomePage() {
  const [editingTodo, setEditingTodo] = useState<TodoResponse | undefined>();
  const { data: todos, isLoading: isLoadingTodos } = useTodos();
  const updateTodo = useUpdateTodo();
  const toast = useToast();

  const todoCount =
    todos?.filter((t: { status: string }) => t.status === "TODO").length || 0;
  const inProgressCount =
    todos?.filter((t: { status: string }) => t.status === "IN_PROGRESS")
      .length || 0;
  const doneCount =
    todos?.filter((t: { status: string }) => t.status === "DONE").length || 0;

  // 最近追加されたタスク（5件）
  const recentTodos =
    todos
      ?.filter((t: TodoResponse) => t.status !== "DONE")
      .sort(
        (a: TodoResponse, b: TodoResponse) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5) || [];

  // 期限が近いタスク（3日以内、未完了のみ）
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const upcomingTodos =
    todos
      ?.filter((t: TodoResponse) => {
        if (t.status === "DONE" || !t.dueDate) return false;
        const dueDate = new Date(t.dueDate);
        return dueDate <= threeDaysLater;
      })
      .sort(
        (a: TodoResponse, b: TodoResponse) =>
          new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
      ) || [];

  const handleUpdate = async (data: UpdateTodoParams) => {
    if (!editingTodo) return;
    try {
      await updateTodo.mutateAsync({
        todoId: editingTodo.id,
        data,
      });
      setEditingTodo(undefined);
      toast.success("TODOを更新しました");
    } catch {
      toast.error("TODOの更新に失敗しました");
    }
  };

  const isLoading = isLoadingTodos;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-text-primary mb-4">TODO App</h1>
        <p className="text-xl text-text-secondary">
          タスクを効率的に管理しましょう
        </p>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* TODO Count */}
            <Card className="bg-background-surface">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-1">
                    未着手のTODO
                  </p>
                  <p className="text-3xl font-bold text-text-primary">
                    {todoCount}
                  </p>
                </div>
                <ListBulletIcon className="h-12 w-12 text-text-tertiary" />
              </div>
            </Card>

            {/* In Progress Count */}
            <Card className="bg-background-surface">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-1">
                    進行中のTODO
                  </p>
                  <p className="text-3xl font-bold text-primary-600">
                    {inProgressCount}
                  </p>
                </div>
                <ClockIcon className="h-12 w-12 text-primary-600" />
              </div>
            </Card>

            {/* Done Count */}
            <Card className="bg-background-surface">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-1">
                    完了したTODO
                  </p>
                  <p className="text-3xl font-bold text-text-primary">
                    {doneCount}
                  </p>
                </div>
                <CheckCircleIcon className="h-12 w-12 text-text-tertiary" />
              </div>
            </Card>
          </div>

          {/* 期限が近いタスク */}
          {upcomingTodos.length > 0 && (
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
                {upcomingTodos.map((todo: TodoResponse) => {
                  const dueDate = new Date(todo.dueDate!);
                  const isOverdue = dueDate < now;
                  const daysUntilDue = Math.ceil(
                    (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
                  );

                  return (
                    <button
                      key={todo.id}
                      onClick={() => setEditingTodo(todo)}
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
                                todo.status === "IN_PROGRESS"
                                  ? "info"
                                  : "default"
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
          )}

          {/* 最近追加されたタスク */}
          {recentTodos.length > 0 && (
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
                {recentTodos.map((todo: TodoResponse) => (
                  <button
                    key={todo.id}
                    onClick={() => setEditingTodo(todo)}
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
                          {todo.dueDate && (
                            <Badge variant="default">
                              期限:{" "}
                              {new Date(todo.dueDate).toLocaleDateString(
                                "ja-JP",
                              )}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-text-tertiary mt-2">
                          作成:{" "}
                          {new Date(todo.createdAt).toLocaleDateString("ja-JP")}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingTodo}
        onClose={() => setEditingTodo(undefined)}
        title="TODO編集"
        size="lg"
      >
        <TodoForm
          todo={editingTodo}
          onSubmit={handleUpdate}
          onCancel={() => setEditingTodo(undefined)}
          isLoading={updateTodo.isPending}
        />
      </Modal>
    </div>
  );
}
