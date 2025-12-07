import { useParams, useNavigate } from "react-router";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Button, Card, LoadingPage, Alert } from "@/app/lib/ui";
import { useToast } from "@/app/features/toast";
import { useTodo, useUpdateTodo } from "@/app/features/todo";
import { z } from "zod";
import { schemas } from "@/generated/zod-schemas";
import { TodoForm } from "../../_shared/components";

type UpdateTodoParams = z.infer<typeof schemas.UpdateTodoParams>;

/**
 * TODO編集ページ
 * 責務: 既存TODOの編集フォームと更新処理
 */
export default function TodoEditRoute() {
  const { todoId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: todo, isLoading, error } = useTodo(todoId!);
  const updateTodo = useUpdateTodo();

  const handleUpdate = async (data: UpdateTodoParams) => {
    try {
      await updateTodo.mutateAsync({
        todoId: todoId!,
        data,
      });
      toast.success("TODOを更新しました");
      navigate(`/todos/${todoId}`);
    } catch {
      toast.error("TODOの更新に失敗しました");
    }
  };

  const handleCancel = () => {
    navigate(`/todos/${todoId}`);
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error || !todo) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="error" title="エラーが発生しました">
          TODOの読み込みに失敗しました。
        </Alert>
        <Button
          variant="ghost"
          onClick={() => navigate("/todos")}
          className="mt-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          一覧に戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={handleCancel}
          className="mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          戻る
        </Button>
        <h1 className="text-3xl font-bold text-text-primary">TODO編集</h1>
        <p className="mt-2 text-text-secondary">
          タスクの内容を編集します
        </p>
      </div>

      {/* Form */}
      <Card>
        <TodoForm
          mode="edit"
          todo={todo}
          onSubmit={handleUpdate}
          onCancel={handleCancel}
          isLoading={updateTodo.isPending}
        />
      </Card>
    </div>
  );
}
