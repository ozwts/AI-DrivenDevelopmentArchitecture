# TanStack Queryパターン

## 概要

TanStack Queryを使用したデータ取得・更新の実装パターン。独自の状態管理を避け、TanStack Queryの機能を最大限活用する。

**根拠となる憲法**:
- `simplicity-principles.md`: Simple First（TanStack Queryが提供する機能を使う）
- `implementation-minimization-principles.md`: 既存機能で代替可能なら新規実装不要

## Query Keyの設計

### 基本構造

```typescript
// 階層的なキー設計
const QUERY_KEYS = {
  todos: {
    all: ["todos"] as const,
    lists: () => [...QUERY_KEYS.todos.all, "list"] as const,
    list: (filters: TodoFilters) => [...QUERY_KEYS.todos.lists(), filters] as const,
    details: () => [...QUERY_KEYS.todos.all, "detail"] as const,
    detail: (id: string) => [...QUERY_KEYS.todos.details(), id] as const,
  },
} as const;
```

### シンプルな設計（推奨）

```typescript
// 小規模プロジェクトではシンプルに
const QUERY_KEY = "todos";

// 一覧
queryKey: [QUERY_KEY, filters]

// 詳細
queryKey: [QUERY_KEY, todoId]
```

**判断基準**:
- エンティティが10未満 → シンプルな設計
- エンティティが10以上 → 階層的な設計を検討

## データ取得パターン

### 一覧取得

```typescript
export function useTodos(filters?: { status?: TodoStatus; projectId?: string }) {
  return useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: () => apiClient.getTodos(filters),
  });
}
```

### 詳細取得

```typescript
export function useTodo(todoId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, todoId],
    queryFn: () => apiClient.getTodo(todoId),
    enabled: !!todoId,  // 空文字列やundefinedを防止
  });
}
```

### 条件付き取得

```typescript
export function useTodosByProject(projectId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, { projectId }],
    queryFn: () => apiClient.getTodos({ projectId: projectId! }),
    enabled: !!projectId,  // projectIdが存在する場合のみ実行
  });
}
```

### 依存クエリ（Dependent Queries）

```typescript
export function useTodoWithProject(todoId: string) {
  // 1. まずTODOを取得
  const todoQuery = useTodo(todoId);

  // 2. TODOが取得できたらプロジェクトを取得
  const projectQuery = useQuery({
    queryKey: ["projects", todoQuery.data?.projectId],
    queryFn: () => apiClient.getProject(todoQuery.data!.projectId),
    enabled: !!todoQuery.data?.projectId,  // TODOのprojectIdが存在する場合のみ
  });

  return { todoQuery, projectQuery };
}
```

## ミューテーションパターン

### 基本的な作成・更新・削除

```typescript
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
    mutationFn: ({ todoId, data }: { todoId: string; data: UpdateTodoParams }) =>
      apiClient.updateTodo(todoId, data),
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
```

### 楽観的更新（Optimistic Updates）

```typescript
export function useToggleTodoStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ todoId, status }: { todoId: string; status: TodoStatus }) =>
      apiClient.updateTodo(todoId, { status }),

    // 楽観的更新：UIを即座に更新
    onMutate: async ({ todoId, status }) => {
      // 既存のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY] });

      // 現在のデータをスナップショット
      const previousTodos = queryClient.getQueryData([QUERY_KEY]);

      // キャッシュを楽観的に更新
      queryClient.setQueryData([QUERY_KEY], (old: Todo[] | undefined) =>
        old?.map((todo) =>
          todo.id === todoId ? { ...todo, status } : todo
        )
      );

      // ロールバック用のコンテキストを返す
      return { previousTodos };
    },

    // エラー時：ロールバック
    onError: (_err, _variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData([QUERY_KEY], context.previousTodos);
      }
    },

    // 成功・失敗に関わらず：サーバーデータで再同期
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
```

**楽観的更新の使用基準**:
| 条件 | 使用する？ |
|------|----------|
| 即座のフィードバックが重要（トグル、いいね等） | Yes |
| 失敗時のロールバックが複雑 | No（通常の更新） |
| 複数エンティティに影響 | No（invalidateのみ） |

## キャッシュ無効化パターン

### 関連クエリの無効化

```typescript
export function useUpdateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ todoId, data }: { todoId: string; data: UpdateTodoParams }) =>
      apiClient.updateTodo(todoId, data),
    onSuccess: (_, { todoId }) => {
      // 一覧と詳細の両方を無効化
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, todoId] });
    },
  });
}
```

### プロジェクト削除時の関連TODO無効化

```typescript
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => apiClient.deleteProject(projectId),
    onSuccess: () => {
      // プロジェクト関連のクエリを全て無効化
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["todos"] });  // TODOも再取得
    },
  });
}
```

## エラーハンドリング

### グローバルエラーハンドリング

```typescript
// app/lib/api/queryClient.ts
import { QueryClient } from "@tanstack/react-query";
import { toast } from "@/features/toast";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,  // 5分
    },
    mutations: {
      onError: (error) => {
        // 全ミューテーションのエラーをトースト表示
        if (error instanceof ApiError) {
          toast.error(error.message);
        } else {
          toast.error("エラーが発生しました");
        }
      },
    },
  },
});
```

### 個別エラーハンドリング

```typescript
export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterTodoParams) => apiClient.createTodo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("TODOを作成しました");
    },
    onError: (error) => {
      // 特定のエラーに対するカスタム処理
      if (error instanceof ValidationError) {
        // フォームにエラーを表示（グローバルトーストではなく）
        return;
      }
      // その他のエラーはグローバルハンドラに任せる
      throw error;
    },
  });
}
```

## Do / Don't

### Do

```typescript
// TanStack Queryの戻り値をそのまま返す
export function useTodos() {
  return useQuery({ ... });
}

// 使う側
const { data, isLoading, error } = useTodos();
```

### Don't

```typescript
// 独自の状態にマッピング（NG）
export function useTodos() {
  const query = useQuery({ ... });

  return {
    todos: query.data,           // NG: 名前を変えただけ
    loading: query.isLoading,    // NG: 別名にする意味がない
    fetchError: query.error,     // NG
  };
}

// カスタムローディング状態（NG）
export function useTodos() {
  const [isLoading, setIsLoading] = useState(false);  // NG: TanStack Queryが提供
  const query = useQuery({ ... });

  // ...
}
```

## queryOptionsの活用（v5）

TanStack Query v5では`queryOptions`でクエリ設定を共有できる：

```typescript
// app/features/todo/hooks/todoQueries.ts
import { queryOptions } from "@tanstack/react-query";

export const todoQueries = {
  all: () => queryOptions({
    queryKey: ["todos"],
    queryFn: () => apiClient.getTodos(),
  }),

  detail: (todoId: string) => queryOptions({
    queryKey: ["todos", todoId],
    queryFn: () => apiClient.getTodo(todoId),
    enabled: !!todoId,
  }),

  byProject: (projectId: string) => queryOptions({
    queryKey: ["todos", { projectId }],
    queryFn: () => apiClient.getTodos({ projectId }),
    enabled: !!projectId,
  }),
};

// 使用例
const { data } = useQuery(todoQueries.detail(todoId));
const { data } = useSuspenseQuery(todoQueries.all());
```

**メリット**:
- クエリ設定の一元管理
- 型安全なqueryKey
- prefetchとの共有が容易

## 関連ドキュメント

- `10-hooks-overview.md`: カスタムフック設計概要
- `30-state-patterns.md`: 複雑な状態管理パターン
- `../lib/30-api-patterns.md`: API通信パターン

## 参考

- [TanStack Query Custom Hooks Example](https://tanstack.com/query/v4/docs/react/examples/react/custom-hooks)
- [Queries | TanStack Query React Docs](https://tanstack.com/query/v4/docs/react/guides/queries)
