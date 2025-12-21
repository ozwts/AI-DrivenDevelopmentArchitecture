import { useOutletContext, useNavigate } from "react-router";
import { Card } from "@/app/lib/ui";
import { buildLogger } from "@/app/lib/logger";
import { useToast } from "@/app/lib/contexts";
import { useUpdateTodo } from "@/app/features/todo";
import { z } from "zod";
import { schemas } from "@/generated/zod-schemas";
import { TodoForm } from "../../_shared/components";
import type { TodoOutletContext } from "../route";

const logger = buildLogger("TodoEditRoute");

type UpdateTodoParams = z.infer<typeof schemas.UpdateTodoParams>;

/**
 * TODO編集ページ
 * 責務: 既存TODOの編集フォームと更新処理
 */
export default function TodoEditRoute() {
  const { todo } = useOutletContext<TodoOutletContext>();
  const navigate = useNavigate();
  const toast = useToast();

  const updateTodo = useUpdateTodo();

  const handleUpdate = async (data: UpdateTodoParams) => {
    logger.info("TODO更新開始", { todoId: todo.id, title: data.title });
    try {
      await updateTodo.mutateAsync({
        todoId: todo.id,
        data,
      });
      logger.info("TODO更新成功", { todoId: todo.id });
      toast.success("TODOを更新しました");
      navigate(`/todos/${todo.id}`);
    } catch (error) {
      logger.error("TODO更新失敗", error instanceof Error ? error : { todoId: todo.id });
      toast.error("TODOの更新に失敗しました");
    }
  };

  const handleCancel = () => {
    navigate(`/todos/${todo.id}`);
  };

  return (
    <>
      {/* ヘッダー */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-text-primary">TODO編集</h1>
        <p className="mt-2 text-text-secondary">タスクの内容を編集します</p>
      </div>

      {/* Form */}
      <Card className="p-6">
        <TodoForm
          mode="edit"
          todo={todo}
          onSubmit={handleUpdate}
          onCancel={handleCancel}
          isLoading={updateTodo.isPending}
        />
      </Card>
    </>
  );
}
