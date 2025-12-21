import { Link, useSearchParams, useNavigate } from "react-router";
import { PlusIcon, ListBulletIcon } from "@heroicons/react/24/outline";
import { Button, LoadingPage, Alert, EmptyState, SelectField } from "@/app/lib/ui";
import { buildLogger } from "@/app/lib/logger";
import { useToast } from "@/app/lib/contexts";
import { useTodos, useUpdateTodo, useDeleteTodo } from "@/app/features/todo";
import { useUsers } from "@/app/features/user";
import { useProjects } from "@/app/features/project";
import { z } from "zod";
import { schemas } from "@/generated/zod-schemas";
import { TodoCard } from "./_shared/components";

const logger = buildLogger("TodosIndexRoute");

type TodoResponse = z.infer<typeof schemas.TodoResponse>;
type TodoStatus = z.infer<typeof schemas.TodoStatus>;

/**
 * TODO一覧ページ
 * 責務: 一覧表示、フィルタリング、ステータス変更、削除
 */
export default function TodosIndexRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL クエリパラメータから直接フィルタ値を取得
  const filterStatus = (searchParams.get("status") ?? "") as TodoStatus | "";
  const filterProjectId = searchParams.get("projectId") ?? "";

  const toast = useToast();

  const filters = {
    status: filterStatus || undefined,
    projectId: filterProjectId || undefined,
  };

  const setFilterStatus = (status: TodoStatus | "") => {
    setSearchParams((prev) => {
      if (status) {
        prev.set("status", status);
      } else {
        prev.delete("status");
      }
      return prev;
    });
  };

  const setFilterProjectId = (projectId: string) => {
    setSearchParams((prev) => {
      if (projectId) {
        prev.set("projectId", projectId);
      } else {
        prev.delete("projectId");
      }
      return prev;
    });
  };

  const { data: todos, isLoading, error } = useTodos(filters);
  const { data: projects } = useProjects();
  const { data: users } = useUsers();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();

  const handleStatusChange = async (todo: TodoResponse, status: TodoStatus) => {
    logger.info("TODOステータス変更開始", {
      todoId: todo.id,
      title: todo.title,
      newStatus: status,
    });
    try {
      await updateTodo.mutateAsync({
        todoId: todo.id,
        data: { status },
        dirtyFields: { status: true },
      });
      logger.info("TODOステータス変更成功", { todoId: todo.id });
      toast.success("ステータスを更新しました");
    } catch (error) {
      logger.error(
        "TODOステータス変更失敗",
        error instanceof Error ? error : { todoId: todo.id },
      );
      toast.error("ステータスの更新に失敗しました");
    }
  };

  const handleDelete = async (todo: TodoResponse) => {
    if (!confirm(`TODO「${todo.title}」を削除してもよろしいですか？`)) {
      return;
    }
    logger.info("TODO削除開始", { todoId: todo.id, title: todo.title });
    try {
      await deleteTodo.mutateAsync(todo.id);
      logger.info("TODO削除成功", { todoId: todo.id });
      toast.success("TODOを削除しました");
    } catch (error) {
      logger.error(
        "TODO削除失敗",
        error instanceof Error ? error : { todoId: todo.id },
      );
      toast.error("TODOの削除に失敗しました");
    }
  };

  const statusFilterOptions = [
    { value: "", label: "全てのステータス" },
    { value: "TODO", label: "未着手" },
    { value: "IN_PROGRESS", label: "進行中" },
    { value: "COMPLETED", label: "完了" },
  ];

  const projectFilterOptions = [
    { value: "", label: "全てのプロジェクト" },
    ...(projects ?? []).map((project) => ({
      value: project.id,
      label: project.name,
    })),
  ];

  const getProjectById = (projectId?: string) => {
    if (!projectId || !projects) return undefined;
    return projects.find((p) => p.id === projectId);
  };

  const getUserById = (userId?: string) => {
    if (!userId || !users) return undefined;
    return users.find((u) => u.id === userId);
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <Alert variant="error" title="エラーが発生しました">
          TODOの読み込みに失敗しました。
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">TODO</h1>
            <p className="mt-2 text-text-secondary">
              タスクを管理して、効率的に作業を進めましょう
            </p>
          </div>
          <Link to="/todos/new">
            <Button variant="primary">
              <PlusIcon className="h-5 w-5 mr-2" />
              新規TODO
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="w-48">
            <SelectField
              options={statusFilterOptions}
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as TodoStatus);
              }}
            />
          </div>
          <div className="w-48">
            <SelectField
              options={projectFilterOptions}
              value={filterProjectId}
              onChange={(e) => {
                setFilterProjectId(e.target.value);
              }}
            />
          </div>
        </div>
      </div>

      {/* Todos Grid */}
      {todos && todos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {todos.map((todo: TodoResponse) => (
            <TodoCard
              key={todo.id}
              todo={todo}
              project={getProjectById(todo.projectId)}
              assignee={getUserById(todo.assigneeUserId)}
              onEdit={(t) => {
                navigate(`/todos/${t.id}/edit`);
              }}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              onView={(t) => {
                navigate(`/todos/${t.id}`);
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ListBulletIcon className="h-16 w-16 text-neutral-400" />}
          title="TODOがありません"
          description="新しいTODOを作成して始めましょう"
          action={
            <Link to="/todos/new">
              <Button variant="primary">
                <PlusIcon className="h-5 w-5 mr-2" />
                新規TODO
              </Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
