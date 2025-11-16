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
import { apiClient } from "../../api/client";
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
import { AttachmentUpload } from "./AttachmentUpload";
import { AttachmentList } from "./AttachmentList";
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
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  const toast = useToast();

  // URL クエリパラメータからプロジェクトIDを取得
  useEffect(() => {
    const projectIdParam = searchParams.get("projectId");
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

  const handleCreate = async (data: RegisterTodoParams, files: File[]) => {
    try {
      // 1. TODO作成
      const newTodo = await createTodo.mutateAsync(data);
      setIsCreateModalOpen(false);

      // 2. ファイルがある場合はアップロード処理
      if (files.length > 0) {
        setIsUploadingFiles(true);
        const failedFiles: string[] = [];

        for (const file of files) {
          try {
            // 2-1. アップロード準備（uploadUrlとattachmentを取得）
            const { uploadUrl, attachment } = await apiClient.prepareAttachment(
              newTodo.id,
              {
                filename: file.name,
                contentType: file.type,
                size: file.size,
              },
            );

            // 2-2. S3に直接アップロード
            await apiClient.uploadFileToS3(uploadUrl, file);

            // 2-3. ステータスをUPLOADEDに更新
            await apiClient.updateAttachment(newTodo.id, attachment.id, {
              status: "UPLOADED",
            });
          } catch (error) {
            console.error(`ファイルアップロードエラー (${file.name}):`, error);
            failedFiles.push(file.name);
          }
        }

        setIsUploadingFiles(false);

        // 3. 結果通知と詳細画面への遷移
        if (failedFiles.length === 0) {
          toast.success(
            `TODOを作成し、${files.length}個のファイルをアップロードしました`,
          );
        } else if (failedFiles.length < files.length) {
          toast.warning(
            `TODOを作成しました。一部のファイルのアップロードに失敗しました: ${failedFiles.join(", ")}`,
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
      setIsUploadingFiles(false);
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
          <div className="space-y-6">
            {/* TODO基本情報 */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-text-primary">
                  {viewingTodo.title}
                </h3>
                {viewingTodo.description && (
                  <p className="text-text-secondary mt-2">
                    {viewingTodo.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-text-tertiary">
                    ステータス:
                  </span>
                  <p className="text-text-primary font-medium">
                    {viewingTodo.status === "TODO"
                      ? "未着手"
                      : viewingTodo.status === "IN_PROGRESS"
                        ? "進行中"
                        : "完了"}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-text-tertiary">優先度:</span>
                  <p className="text-text-primary font-medium">
                    {viewingTodo.priority === "LOW"
                      ? "低"
                      : viewingTodo.priority === "MEDIUM"
                        ? "中"
                        : "高"}
                  </p>
                </div>
                {viewingTodo.dueDate && (
                  <div>
                    <span className="text-sm text-text-tertiary">期限:</span>
                    <p className="text-text-primary font-medium">
                      {new Date(viewingTodo.dueDate).toLocaleDateString(
                        "ja-JP",
                      )}
                    </p>
                  </div>
                )}
                {viewingTodo.projectId &&
                  getProjectById(viewingTodo.projectId) && (
                    <div>
                      <span className="text-sm text-text-tertiary">
                        プロジェクト:
                      </span>
                      <p className="text-text-primary font-medium">
                        {getProjectById(viewingTodo.projectId)?.name}
                      </p>
                    </div>
                  )}
              </div>
            </div>

            {/* 添付ファイルセクション */}
            <div className="border-t border-border-light pt-6">
              <h4 className="text-md font-semibold text-text-primary mb-4">
                添付ファイル
              </h4>

              <div className="space-y-4">
                <AttachmentUpload todoId={viewingTodo.id} />
                <AttachmentList todoId={viewingTodo.id} />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
