import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/app/lib/api";
import { schemas } from "@/generated/zod-schemas";

type RegisterTodoParams = z.infer<typeof schemas.RegisterTodoParams>;
type UpdateTodoParams = z.infer<typeof schemas.UpdateTodoParams>;
type TodoStatus = z.infer<typeof schemas.TodoStatus>;

const QUERY_KEY = "todos";

export function useTodos(filters?: {
  status?: TodoStatus;
  projectId?: string;
}) {
  return useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: () => apiClient.getTodos(filters),
  });
}

export function useTodo(todoId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, todoId],
    queryFn: () => apiClient.getTodo(todoId),
    enabled: !!todoId,
  });
}

export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterTodoParams) => apiClient.createTodo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      todoId,
      data,
    }: {
      todoId: string;
      data: UpdateTodoParams;
    }) => apiClient.updateTodo(todoId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (todoId: string) => apiClient.deleteTodo(todoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
