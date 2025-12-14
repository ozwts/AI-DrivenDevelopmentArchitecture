# API: HTTP通信基盤

## 核心原則

APIは**HTTP通信を抽象化するインフラ基盤**であり、認証・エラーハンドリング・ログ出力を一元化する。

**根拠となる憲法**:
- `architecture-principles.md`: 型による契約
- `analyzability-principles.md`: 影響範囲の静的追跡
- `observability-principles.md`: 通信ログの出力

## API配置のコロケーション

APIは3層に分かれ、使用範囲に応じてコロケーションする：

| 層 | 配置先 | 役割 | 判断基準 |
|----|--------|------|---------|
| インフラ基盤 | `lib/api/` | HTTP通信の共通処理 | 全アプリで使用 |
| Feature API | `features/{feature}/api/` | 機能別エンドポイント | 3+ルートで使用 |
| Route API | `routes/({role})/{feature}/_shared/api/` | 親子ルート間で共有 | 機能内の親子ルートで使用 |

```
app/
├── lib/api/                           # インフラ基盤
│   ├── api-client.ts                  # request, requestVoid, initialize
│   ├── auth-handler.ts                # 認証ヘッダー生成
│   ├── error-handler.ts               # エラーハンドリング
│   └── external-upload.ts             # 署名付きURL
│
├── features/
│   ├── todo/api/todos.ts              # 3+ルートで使用
│   ├── project/api/projects.ts        # 3+ルートで使用
│   ├── user/api/users.ts              # 3+ルートで使用
│   └── auth/api/auth-user.ts          # 3+ルートで使用
│
└── routes/(user)/todos/
    └── _shared/api/attachments.ts     # todos配下のみで使用
```

### 配置判断フロー

```
エンドポイントを追加する
    ↓
3つ以上のルートで使用される？
    ├─ Yes → features/{feature}/api/ に配置
    └─ No  → 親子ルート間で共有する？
               ├─ Yes → routes/({role})/{feature}/_shared/api/ に配置
               └─ No  → そのルート内に配置（または将来の共通化を見越してfeatures/に）
```

## インフラ基盤の責務

### 実施すること

1. **認証ヘッダーの自動付与**: 全リクエストにアクセストークンを付与
2. **エラーハンドリングの一元化**: HTTPエラー、バリデーションエラーの統一処理
3. **通信ログの出力**: リクエスト開始・成功・失敗をログ出力
4. **型安全なレスポンス**: Zodスキーマによるバリデーション

### 実施しないこと

1. **エンドポイントの定義** → Feature API / Route API に配置
2. **ビジネスロジックの実装** → `app/features/`に配置
3. **直接のfetch()呼び出し** → インフラ基盤経由で統一

## 状態管理

インフラ基盤は以下の状態を保持する：

| 状態 | 用途 |
|------|------|
| `isInitialized` | 初期化済みフラグ |
| `getAccessToken` | アクセストークン取得関数 |

## 使用例

### インフラ基盤の初期化

```typescript
// app/features/auth/components/AuthInitializer.tsx
import { initialize } from "@/app/lib/api";

initialize({
  getAccessToken: async () => {
    // Cognitoなどからトークン取得
  },
});
```

### Feature API（3+ルートで使用）

```typescript
// app/features/todo/api/todos.ts
import { request, requestVoid } from "@/app/lib/api";
import { schemas } from "@/generated/zod-schemas";

export const todoApi = {
  getTodos: async (filters?: { status?: TodoStatus }) => {
    return request("/todos", schemas.TodosResponse);
  },

  createTodo: async (data: RegisterTodoParams) => {
    return request("/todos", schemas.TodoResponse, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  deleteTodo: async (todoId: string) => {
    return requestVoid(`/todos/${todoId}`, { method: "DELETE" });
  },
};
```

### Route API（1-2ルートで使用）

```typescript
// app/routes/(user)/todos/_shared/api/attachments.ts
import { request, requestVoid, uploadToSignedUrl } from "@/app/lib/api";
import { schemas } from "@/generated/zod-schemas";

export const attachmentApi = {
  getAttachments: async (todoId: string) => {
    return request(`/todos/${todoId}/attachments`, schemas.AttachmentsResponse);
  },

  prepareAttachment: async (todoId: string, data: PrepareAttachmentParams) => {
    return request(`/todos/${todoId}/attachments`, schemas.PrepareAttachmentResponse, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  uploadFileToS3: (uploadUrl: string, file: File) => {
    return uploadToSignedUrl(uploadUrl, file);
  },
};
```

### Hook層での使用

```typescript
// app/features/todo/hooks/useTodos.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { todoApi } from "../api/todos";

export function useTodos() {
  return useQuery({
    queryKey: ["todos"],
    queryFn: todoApi.getTodos,
  });
}
```

## 外部サービスへのアップロード

S3署名付きURLなど、API基盤を経由しない外部サービスへのアップロードは`uploadToSignedUrl`を使用する。

```typescript
import { uploadToSignedUrl } from "@/app/lib/api";

await uploadToSignedUrl(presignedUrl, file);
```

**注意**: 直接`fetch()`を使用してはならない。`uploadToSignedUrl`を経由することで：
- 一貫したエラーハンドリング
- ログ出力
- 将来の拡張性（リトライ、プログレス等）

を確保する。

## エラーレベルの使い分け

| HTTPステータス | ログレベル | 理由 |
|---------------|-----------|------|
| 5xx | ERROR | サーバーエラー（監視対象） |
| 4xx | WARN | クライアントエラー（ユーザー操作起因） |

## Do / Don't

### Do

```typescript
// Feature API: 3+ルートで使用されるエンドポイント
// app/features/todo/api/todos.ts
export const todoApi = { ... };

// Route API: 特定ルート配下でのみ使用
// app/routes/(user)/todos/_shared/api/attachments.ts
export const attachmentApi = { ... };

// インフラ基盤を経由
import { request } from "@/app/lib/api";
const todos = await request("/todos", TodoListSchema);
```

### Don't

```typescript
// 直接fetch（NG）
const response = await fetch("/api/todos");

// 1ルートでしか使わないAPIをfeatures/に配置（NG）
// app/features/attachment/api/attachments.ts  // 使用箇所が少ない

// 3+ルートで使うAPIをroutes/に配置（NG）
// app/routes/(user)/todos/_shared/api/todos.ts  // 広く使われるべき
```

## 関連ドキュメント

- `../lib/10-lib-overview.md`: 技術基盤設計概要
- `../logger/10-logger-overview.md`: ログ出力基盤
- `../route/30-shared-placement.md`: _shared配置基準
- `../feature/10-feature-overview.md`: Feature設計概要
- `../hooks/20-query-patterns.md`: React Queryパターン
