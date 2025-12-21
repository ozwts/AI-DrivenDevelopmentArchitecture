import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { todoApi } from "../api";
import { buildLogger } from "@/app/lib/logger";
import { schemas } from "@/generated/zod-schemas";

type RegisterTodoParams = z.infer<typeof schemas.RegisterTodoParams>;
type UpdateTodoParams = z.infer<typeof schemas.UpdateTodoParams>;
type TodoStatus = z.infer<typeof schemas.TodoStatus>;

const logger = buildLogger("useTodos");
const QUERY_KEY = "todos";

/**
 * TODO一覧を取得するフック
 * 3+ルートで使用されるため app/features/ に配置
 */
export function useTodos(filters?: {
  status?: TodoStatus;
  projectId?: string;
}) {
  return useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: () => todoApi.getTodos(filters),
  });
}

/**
 * 単一のTODOを取得するフック
 */
export function useTodo(todoId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, todoId],
    queryFn: () => todoApi.getTodo(todoId),
    enabled: !!todoId,
  });
}

/**
 * TODO作成のミューテーション
 */
export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterTodoParams) => {
      logger.info("TODO作成開始", {
        title: data.title,
        projectId: data.projectId,
      });
      return todoApi.createTodo(data);
    },
    onSuccess: () => {
      logger.info("TODO作成成功");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (error) => {
      logger.error("TODO作成失敗", error);
    },
  });
}

/**
 * TODO更新のミューテーション
 */
export function useUpdateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      todoId,
      data,
      dirtyFields,
    }: {
      todoId: string;
      data: UpdateTodoParams;
      dirtyFields: Partial<Record<keyof UpdateTodoParams, boolean>>;
    }) => {
      logger.info("TODO更新開始", { todoId, status: data.status });
      return todoApi.updateTodo(todoId, data, dirtyFields);
    },
    onSuccess: (_, { todoId }) => {
      logger.info("TODO更新成功", { todoId });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, todoId] });
    },
    onError: (error, { todoId }) => {
      logger.error("TODO更新失敗", { todoId, error });
    },
  });
}

/**
 * TODO削除のミューテーション
 */
export function useDeleteTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (todoId: string) => {
      logger.info("TODO削除開始", { todoId });
      return todoApi.deleteTodo(todoId);
    },
    onSuccess: (_, todoId) => {
      logger.info("TODO削除成功", { todoId });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, todoId] });
    },
    onError: (error, todoId) => {
      logger.error("TODO削除失敗", { todoId, error });
    },
  });
}
