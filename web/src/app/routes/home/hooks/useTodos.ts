import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/app/lib/api";
import { schemas } from "@/generated/zod-schemas";

type UpdateTodoParams = z.infer<typeof schemas.UpdateTodoParams>;

const QUERY_KEY = "todos";

export function useTodos() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => apiClient.getTodos(),
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
