# API通信パターン

## 概要

`app/lib/api/`のapiClientを使用したデータ取得・更新パターン。

**根拠となる憲法**:
- `architecture-principles.md`: 型による契約
- `analyzability-principles.md`: 影響範囲の静的追跡

## apiClient基盤

```typescript
// app/lib/api/api-client.ts
import { ApiError } from "./error-handler";

type RequestOptions = {
  readonly headers?: Record<string, string>;
};

async function request<T>(
  url: string,
  options: RequestInit & RequestOptions = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  return response.json();
}

export const apiClient = {
  get: <T>(url: string, options?: RequestOptions) =>
    request<T>(url, { method: "GET", ...options }),

  post: <T>(url: string, data: unknown, options?: RequestOptions) =>
    request<T>(url, {
      method: "POST",
      body: JSON.stringify(data),
      ...options,
    }),

  put: <T>(url: string, data: unknown, options?: RequestOptions) =>
    request<T>(url, {
      method: "PUT",
      body: JSON.stringify(data),
      ...options,
    }),

  delete: <T>(url: string, options?: RequestOptions) =>
    request<T>(url, { method: "DELETE", ...options }),
};
```

## ApiError

```typescript
// app/lib/api/error-handler.ts
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string
  ) {
    super(`API Error: ${status}`);
    this.name = "ApiError";
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}
```

## React Queryパターン

### useQuery（データ取得）

```typescript
// app/routes/todos+/hooks/use-todos.ts
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { TodoResponse } from "@/generated/zod-schemas";

export function useTodos() {
  return useQuery({
    queryKey: ["todos"],
    queryFn: () => apiClient.get<TodoResponse[]>("/api/todos"),
  });
}
```

### useMutation（データ更新）

```typescript
// app/routes/todos+/hooks/use-create-todo.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { CreateTodoRequest, TodoResponse } from "@/generated/zod-schemas";

export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTodoRequest) =>
      apiClient.post<TodoResponse>("/api/todos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}
```

### キャッシュ無効化

```typescript
// 単一リソースの更新後
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["todos"] });
}

// 特定IDのリソース更新後
onSuccess: (_, variables) => {
  queryClient.invalidateQueries({ queryKey: ["todos", variables.id] });
}
```

## エラーハンドリング

```typescript
// app/routes/todos+/components/todo-actions.tsx
import { useCreateTodo } from "../hooks/use-create-todo";
import { useToast } from "@/features/toast";

export function TodoActions() {
  const createTodo = useCreateTodo();
  const toast = useToast();

  const handleCreate = async (data: CreateTodoRequest) => {
    try {
      await createTodo.mutateAsync(data);
      toast.success("TODOを作成しました");
    } catch {
      toast.error("TODOの作成に失敗しました");
    }
  };
}
```

## 関連ドキュメント

- `10-lib-overview.md`: 技術基盤設計概要
- `../feature/10-feature-overview.md`: Feature設計（トースト通知）
