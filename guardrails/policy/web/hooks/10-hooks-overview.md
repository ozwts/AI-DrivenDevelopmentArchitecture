# カスタムフック設計概要

## 核心原則

カスタムフックは**TanStack Queryを基盤とし、最小限の責務**で実装する。独自の状態管理層を作らず、TanStack Queryが提供する機能を最大限活用する。

**根拠となる憲法**:
- `simplicity-principles.md`: Simple First（構造を先に決め、Easyは後から乗せる）
- `implementation-minimization-principles.md`: 使っていないインターフェースは実装しない
- `module-cohesion-principles.md`: 機能的凝集、コロケーション

## 実施すること

1. **TanStack Query中心の設計**: useQuery/useMutationをラップし、API通信を抽象化
2. **単一責務の維持**: 1フック = 1つの明確なデータ操作
3. **配置場所の適切な選択**: 使用スコープに応じてroutes/features/libに配置
4. **型安全な実装**: Zod生成型を直接使用
5. **ログ出力の実施**: ビジネスロジックの実行をLoggerで記録（`../logger/10-logger-overview.md`）

## 実施しないこと

1. **独自の状態管理層の構築** → TanStack Queryの機能を使う
2. **オプションの過剰公開** → 必要なオプションのみ受け取る
3. **複数責務の集約** → 単一責務に分割
4. **早すぎる抽象化** → 3回ルールを適用

## 例外: Context/Providerが必要なケース

以下の条件を**すべて満たす**場合のみ、TanStack Queryではなく独自のContext/Providerパターンを使用する：

1. **HTTPリクエスト/レスポンスではない** - 通常のREST API呼び出しではない
2. **外部ライブラリが状態を管理する** - SDK側でセッションや接続を保持する
3. **ライフサイクルがリクエスト単位ではない** - アプリ全体で永続する状態

| 例 | 該当する条件 |
|----|-------------|
| 認証SDK（Cognito, Auth0等） | セッション管理、トークンリフレッシュ |
| WebSocket接続 | 接続状態の永続管理 |
| Analytics SDK | 初期化とイベント送信 |

**注意**: 「認証されたユーザーのデータ取得」はHTTPリクエストなのでTanStack Queryで管理する。Context/Providerは「認証状態そのもの」の管理に限定すること。

## フックの分類と配置

### 配置基準

| 使用スコープ | 配置先 | 例 |
|-------------|--------|-----|
| 同一ルート内 | `app/routes/({role})/{feature}/hooks/` | ルート固有のデータ操作 |
| 親子ルート間 | `app/routes/({role})/{feature}/_shared/hooks/` | 作成・編集で共通のミューテーション |
| 3+ルート横断 | `app/features/{feature}/hooks/` | useTodos, useProjects |
| 全アプリ共通（純粋） | `app/lib/hooks/` | useDebounce, useLocalStorage |

### 分類

| 種類 | 責務 | 例 |
|------|------|-----|
| **データ取得フック** | useQueryのラップ | useTodos, useTodo |
| **ミューテーションフック** | useMutationのラップ | useCreateTodo, useUpdateTodo |
| **UIステートフック** | ローカルUI状態の管理 | useFileUpload, useModalState |
| **汎用フック** | ビジネスロジックなし | useDebounce, useLocalStorage |

## TanStack Query中心の設計

### なぜTanStack Query中心なのか

TanStack Queryは以下を提供する：
- **キャッシュ管理**: 同一データの重複取得を防止
- **状態管理**: isLoading, isError, data を自動提供
- **再取得制御**: staleTime, refetchOnWindowFocus
- **楽観的更新**: onMutate, onError, onSettled

独自の状態管理層を作ると、これらの機能と**競合**または**重複**する。

**根拠となる憲法**:
- `simplicity-principles.md`: 「この抽象化がなくても動くか？」

### データ取得フックの基本形

```typescript
// app/features/todo/hooks/useTodos.ts
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/app/lib/api";
import type { TodoStatus } from "@/generated/zod-schemas";

const QUERY_KEY = "todos";

export function useTodos(filters?: { status?: TodoStatus; projectId?: string }) {
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
```

**ポイント**:
- useQueryの戻り値をそのまま返す（ラップしすぎない）
- queryKeyは定数化して一貫性を保つ
- filtersをqueryKeyに含めてキャッシュを分離

### ミューテーションフックの基本形

```typescript
// app/features/todo/hooks/useTodos.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/app/lib/api";
import type { RegisterTodoParams } from "@/generated/zod-schemas";

export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterTodoParams) => apiClient.createTodo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
```

**ポイント**:
- onSuccessでキャッシュを無効化
- mutationFnの引数は型安全に
- useMutationの戻り値をそのまま返す

## オプション公開の制限

### 原則

**必要なオプションのみ公開する**。全てのTanStack Queryオプションを透過させない。

**根拠となる憲法**:
- `simplicity-principles.md`: 「この抽象化がなくても動くか？」
- `implementation-minimization-principles.md`: 使っていないインターフェースは実装しない

### Do

```typescript
// 必要なパラメータのみ受け取る
export function useTodos(filters?: { status?: TodoStatus; projectId?: string }) {
  return useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: () => apiClient.getTodos(filters),
    // staleTime, cacheTime等は内部で固定
  });
}
```

### Don't

```typescript
// 全オプションを透過（NG）
export function useTodos(
  filters?: { status?: TodoStatus },
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>  // NG: 過剰な公開
) {
  return useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: () => apiClient.getTodos(filters),
    ...options,  // NG: 何が渡されるか不明
  });
}
```

## UIステートフックの設計

### いつUIステートフックを作るか

TanStack Queryで対応できない以下のケースのみ：
- **ファイルアップロード**: 複数ステップの非同期処理
- **モーダル状態**: 開閉とデータの紐付け
- **ウィザード**: 複数ステップの状態遷移

### UIステートフックの基本形

```typescript
// app/routes/(user)/todos/_shared/hooks/useFileUpload.ts
import { useState } from "react";
import { apiClient } from "@/app/lib/api";

type FileUploadResult = {
  totalFiles: number;
  failedFiles: string[];
  successCount: number;
};

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFiles = async (todoId: string, files: File[]): Promise<FileUploadResult> => {
    if (files.length === 0) {
      return { totalFiles: 0, failedFiles: [], successCount: 0 };
    }

    setIsUploading(true);
    try {
      // アップロード処理...
      return { totalFiles: files.length, failedFiles: [], successCount: files.length };
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFiles, isUploading };
}
```

**ポイント**:
- 返り値は最小限（関数 + 状態）
- useReducerは複雑な状態遷移がある場合のみ

### useReducerの使用基準

| 条件 | 使用する？ |
|------|----------|
| 3つ以上の関連する状態がある | 検討 |
| 状態遷移が複雑（ウィザード等） | Yes |
| 単純なboolean/string状態 | No（useState） |
| TanStack Queryで代替可能 | No（Query使用） |

## 汎用フックの設計

### lib/hooks/に配置する基準

| 条件 | lib/hooks/ |
|------|-----------|
| ビジネスロジックなし | Yes |
| どのプロジェクトでも使える | Yes |
| Context/Provider不要 | Yes |
| 純粋な状態管理 | Yes |

### 例

```typescript
// app/lib/hooks/useDebounce.ts
import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```

```typescript
// app/lib/hooks/useLocalStorage.ts
import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch {
      // 書き込み失敗を無視
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}
```

## 依存の方向

```
routes/hooks/ → features/hooks/ → lib/hooks/
                                      ↑
                                 最下層（何にも依存しない）
```

**逆方向のインポートは禁止**。

## 関連ドキュメント

- `20-query-patterns.md`: TanStack Queryパターン
- `30-state-patterns.md`: 複雑な状態管理パターン
- `../route/20-colocation-patterns.md`: コロケーション
- `../feature/10-feature-overview.md`: Feature設計概要
- `../lib/10-lib-overview.md`: 技術基盤設計概要
- `../logger/10-logger-overview.md`: ログ出力基盤（Hooksでのログ実装必須）
