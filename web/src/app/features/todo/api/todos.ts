/**
 * Todo API エンドポイント
 */
import { z } from "zod";
import { schemas } from "@/generated/zod-schemas";
import {
  request,
  requestVoid,
  normalizePatchRequest,
  normalizePostRequest,
} from "@/app/lib/api";

type TodoResponse = z.infer<typeof schemas.TodoResponse>;
type RegisterTodoParams = z.infer<typeof schemas.RegisterTodoParams>;
type UpdateTodoParams = z.infer<typeof schemas.UpdateTodoParams>;
type TodoStatus = z.infer<typeof schemas.TodoStatus>;

export const todoApi = {
  getTodos: async (filters?: {
    status?: TodoStatus;
    projectId?: string;
  }): Promise<TodoResponse[]> => {
    const params = new URLSearchParams();
    if (filters?.status !== undefined) {
      params.append("status", filters.status);
    }
    if (filters?.projectId !== undefined) {
      params.append("projectId", filters.projectId);
    }
    const query = params.toString();
    return request(
      `/todos${query !== "" ? `?${query}` : ""}`,
      schemas.TodosResponse,
    );
  },

  getTodo: async (todoId: string): Promise<TodoResponse> => {
    return request(`/todos/${todoId}`, schemas.TodoResponse);
  },

  createTodo: async (data: RegisterTodoParams): Promise<TodoResponse> => {
    const normalized = normalizePostRequest(data);
    return request("/todos", schemas.TodoResponse, {
      method: "POST",
      body: JSON.stringify(normalized),
    });
  },

  updateTodo: async (
    todoId: string,
    data: UpdateTodoParams,
    dirtyFields: Partial<Record<keyof UpdateTodoParams, boolean>>,
  ): Promise<TodoResponse> => {
    const normalized = normalizePatchRequest(data, dirtyFields);
    return request(`/todos/${todoId}`, schemas.TodoResponse, {
      method: "PATCH",
      body: JSON.stringify(normalized),
    });
  },

  deleteTodo: async (todoId: string): Promise<void> => {
    return requestVoid(`/todos/${todoId}`, {
      method: "DELETE",
    });
  },
};
