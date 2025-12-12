import { useNavigate } from "react-router";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Button, Card } from "@/app/lib/ui";
import { buildLogger } from "@/app/lib/logger";
import { useToast } from "@/app/features/toast";
import { useCreateTodo } from "@/app/features/todo";
import { z } from "zod";
import { schemas } from "@/generated/zod-schemas";
import { useFileUpload } from "../_shared/hooks";
import { TodoForm } from "../_shared/components";

const logger = buildLogger("TodoNewRoute");

type RegisterTodoParams = z.infer<typeof schemas.RegisterTodoParams>;

/**
 * TODO新規作成ページ
 * 責務: 新規作成フォームの表示と作成処理
 */
export default function TodoNewRoute() {
  const navigate = useNavigate();
  const toast = useToast();
  const createTodo = useCreateTodo();
  const { uploadFiles, isUploading } = useFileUpload();

  const handleCreate = async (data: RegisterTodoParams, files: File[]) => {
    logger.info("TODO作成開始", { title: data.title, fileCount: files.length });
    try {
      const newTodo = await createTodo.mutateAsync(data);
      logger.info("TODO作成成功", { todoId: newTodo.id });

      // ファイルアップロード処理
      if (files.length > 0) {
        const result = await uploadFiles(newTodo.id, files);

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
        // 詳細画面に遷移
        navigate(`/todos/${newTodo.id}`);
      } else {
        toast.success("TODOを作成しました");
        navigate("/todos");
      }
    } catch (error) {
      logger.error("TODO作成失敗", error instanceof Error ? error : { message: String(error) });
      toast.error("TODOの作成に失敗しました");
    }
  };

  const handleCancel = () => {
    navigate("/todos");
  };

  if (isUploading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="text-text-secondary">
              ファイルをアップロード中です...
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={handleCancel} className="mb-4">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          戻る
        </Button>
        <h1 className="text-3xl font-bold text-text-primary">新規TODO</h1>
        <p className="mt-2 text-text-secondary">新しいタスクを作成します</p>
      </div>

      {/* Form */}
      <Card>
        <TodoForm
          mode="create"
          onSubmit={handleCreate}
          onCancel={handleCancel}
          isLoading={createTodo.isPending}
        />
      </Card>
    </div>
  );
}
