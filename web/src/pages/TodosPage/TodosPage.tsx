import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PlusIcon, ListBulletIcon } from "@heroicons/react/24/outline";
import {
  useTodos,
  useCreateTodo,
  useUpdateTodo,
  useDeleteTodo,
} from "../../hooks/useTodos";
import { useProjects } from "../../hooks/useProjects";
import { useUsers } from "../../hooks/useUsers";
import { useFileUpload } from "../../hooks/useFileUpload";
import {
  Button,
  Modal,
  LoadingPage,
  Alert,
  EmptyState,
  Select,
} from "../../components";
import { TodoForm } from "./TodoForm";
import { TodoCard } from "./TodoCard";
import { TodoDetail } from "./TodoDetail";
import { useToast } from "../../contexts/ToastContext";
import { z } from "zod";
import { schemas } from "../../generated/zod-schemas";

type TodoResponse = z.infer<typeof schemas.TodoResponse>;
type RegisterTodoParams = z.infer<typeof schemas.RegisterTodoParams>;
type UpdateTodoParams = z.infer<typeof schemas.UpdateTodoParams>;
type TodoStatus = z.infer<typeof schemas.TodoStatus>;

export const TodosPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoResponse | undefined>();
  const [deletingTodo, setDeletingTodo] = useState<TodoResponse | undefined>();
  const [viewingTodo, setViewingTodo] = useState<TodoResponse | undefined>();
  const [filterStatus, setFilterStatus] = useState<TodoStatus | "">("");
  const [filterProjectId, setFilterProjectId] = useState<string>("");

  const toast = useToast();

  // URL クエリパラメータからフィルタを取得
  useEffect(() => {
    const statusParam = searchParams.get("status");
    const projectIdParam = searchParams.get("projectId");

    if (statusParam) {
      setFilterStatus(statusParam as TodoStatus);
    }
    if (projectIdParam) {
      setFilterProjectId(projectIdParam);
    }
  }, [searchParams]);

  const filters = {
    status: filterStatus || undefined,
    projectId: filterProjectId || undefined,
  };

  const { data: todos, isLoading, error } = useTodos(filters);
  const { data: projects } = useProjects();
  const { data: users } = useUsers();
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const { uploadFiles, isUploading: isUploadingFiles } = useFileUpload();

  const handleCreate = async (data: RegisterTodoParams, files: File[]) => {
    try {
      // TODO作成
      const newTodo = await createTodo.mutateAsync(data);
      setIsCreateModalOpen(false);

      // ファイルアップロード処理
      if (files.length > 0) {
        const result = await uploadFiles(newTodo.id, files);

        // 結果に応じた通知
        if (result.failedFiles.length === 0) {
          toast.success(
            `TODOを作成し、${result.totalFiles}個のファイルをアップロードしました`,
          );
        } else if (result.successCount > 0) {
          toast.warning(
            `TODOを作成しました。一部のファイルのアップロードに失敗しました: ${result.failedFiles.join(", ")}`,
          );
        } else {
          toast.error(
            `TODOを作成しましたが、すべてのファイルのアップロードに失敗しました`,
          );
        }

        // 詳細画面を開く
        setViewingTodo(newTodo);
      } else {
        toast.success("TODOを作成しました");
      }
    } catch {
      toast.error("TODOの作成に失敗しました");
    }
  };

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

  const handleDelete = async () => {
    if (!deletingTodo) return;
    try {
      await deleteTodo.mutateAsync(deletingTodo.id);
      setDeletingTodo(undefined);
      toast.success("TODOを削除しました");
    } catch {
      toast.error("TODOの削除に失敗しました");
    }
  };

  const handleStatusChange = async (todo: TodoResponse, status: TodoStatus) => {
    try {
      await updateTodo.mutateAsync({
        todoId: todo.id,
        data: { ...todo, status },
      });
      toast.success("ステータスを更新しました");
    } catch {
      toast.error("ステータスの更新に失敗しました");
    }
  };

  const statusFilterOptions = [
    { value: "", label: "全てのステータス" },
    { value: "TODO", label: "未着手" },
    { value: "IN_PROGRESS", label: "進行中" },
    { value: "DONE", label: "完了" },
  ];

  const projectFilterOptions = [
    { value: "", label: "全てのプロジェクト" },
    ...(projects || []).map((project) => ({
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
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2"
            data-testid="create-todo-button"
          >
            <PlusIcon className="h-5 w-5" />
            新規TODO
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="w-48">
            <Select
              options={statusFilterOptions}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as TodoStatus)}
            />
          </div>
          <div className="w-48">
            <Select
              options={projectFilterOptions}
              value={filterProjectId}
              onChange={(e) => {
                setFilterProjectId(e.target.value);
                // URLパラメータをクリア
                if (!e.target.value) {
                  setSearchParams({});
                }
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
              onEdit={setEditingTodo}
              onDelete={setDeletingTodo}
              onStatusChange={handleStatusChange}
              onView={setViewingTodo}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ListBulletIcon className="h-16 w-16 text-gray-400" />}
          title="TODOがありません"
          description="新しいTODOを作成して始めましょう"
          action={
            <Button
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
              data-testid="create-todo-button"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              新規TODO
            </Button>
          }
        />
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !isUploadingFiles && setIsCreateModalOpen(false)}
        title="新規TODO"
        size="lg"
      >
        {isUploadingFiles ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="text-text-secondary">
              ファイルをアップロード中です...
            </p>
          </div>
        ) : (
          <TodoForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateModalOpen(false)}
            isLoading={createTodo.isPending}
          />
        )}
      </Modal>

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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingTodo}
        onClose={() => setDeletingTodo(undefined)}
        title="TODOの削除"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingTodo(undefined)}>
              キャンセル
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteTodo.isPending}
            >
              削除
            </Button>
          </>
        }
      >
        <p className="text-gray-700">
          TODO「{deletingTodo?.title}」を削除してもよろしいですか？
          <br />
          この操作は取り消せません。
        </p>
      </Modal>

      {/* Detail View Modal */}
      <Modal
        isOpen={!!viewingTodo}
        onClose={() => setViewingTodo(undefined)}
        title="TODO詳細"
        size="lg"
      >
        {viewingTodo && (
          <TodoDetail
            todo={viewingTodo}
            project={getProjectById(viewingTodo.projectId)}
          />
        )}
      </Modal>
    </div>
  );
};
