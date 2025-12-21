# API: リクエスト正規化

## 核心原則

フォームからPATCHリクエストを送信する際、**変更されたフィールドのみを送信**し、**空文字列はnullに変換**する。

**根拠となる憲法**:
- `simplicity-principles.md`: Simple First, Then Easy
- `architecture-principles.md`: 型による契約

**根拠となる契約**:
- `contract/api/20-endpoint-design.md`: PATCH操作の3値セマンティクス

## PATCHリクエストの3値セマンティクス

| 操作 | JSON表現 | 意味 | 実現方法 |
|------|----------|------|----------|
| フィールド省略 | `{}` | 変更しない | `dirtyFields`で未変更を検出 |
| `null`送信 | `{"dueDate": null}` | クリアする | 空文字列 → null変換 |
| 値を送信 | `{"dueDate": "2025-01-01"}` | 値を設定 | そのまま送信 |

## なぜdirtyFieldsベースか

### 問題: PUT的アプローチの副作用

全フィールドを常に送信すると以下の問題が発生する：

1. **意図しないクリア**: 初期値が空のフィールドが `null` として送信される
2. **同時編集時の上書き**: 後から保存した人が他者の変更を上書き
3. **契約違反**: `contract/api/20-endpoint-design.md` の3値セマンティクスと不整合

### 解決: dirtyFieldsによる変更検出

React Hook Formの `formState.dirtyFields` を使用し、ユーザーが実際に変更したフィールドのみを送信する。

```
フォーム初期値: { title: "元のタイトル", description: "" }
ユーザー操作: title を "新タイトル" に変更
dirtyFields: { title: true }
送信データ: { title: "新タイトル" }  // descriptionは送信しない
```

## 正規化ルール

### 1. dirtyFieldsによるフィルタリング

変更されていないフィールドはリクエストから除外する。

```typescript
// 変更されたフィールドのみを抽出
function pickDirtyFields<T extends Record<string, unknown>>(
  data: T,
  dirtyFields: Partial<Record<keyof T, boolean>>,
): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(dirtyFields) as Array<keyof T>) {
    if (dirtyFields[key]) {
      result[key] = data[key];
    }
  }
  return result;
}
```

### 2. 空文字列 → null 変換

HTMLフォームは未入力を空文字列として扱う。PATCH契約では「クリア」は `null` で表現するため、変換が必要。

```typescript
// 空文字列をnullに変換
function normalizeEmptyStrings<T extends Record<string, unknown>>(
  data: T,
): { [K in keyof T]: T[K] extends string ? T[K] | null : T[K] } {
  const result = { ...data } as Record<string, unknown>;
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === "string" && value.trim() === "") {
      result[key] = null;
    }
  }
  return result as { [K in keyof T]: T[K] extends string ? T[K] | null : T[K] };
}
```

### 3. 統合された正規化関数

```typescript
// PATCHリクエスト用の正規化
export function normalizePatchRequest<T extends Record<string, unknown>>(
  data: T,
  dirtyFields: Partial<Record<keyof T, boolean>>,
): Partial<{ [K in keyof T]: T[K] extends string ? T[K] | null : T[K] }> {
  const dirty = pickDirtyFields(data, dirtyFields);
  return normalizeEmptyStrings(dirty);
}
```

## 配置場所

正規化関数は `lib/api/` に配置する。

```
app/
└── lib/api/
    ├── api-client.ts         # request, requestVoid
    ├── normalize.ts          # normalizePatchRequest
    └── index.ts              # 公開API
```

## 使用例

### Feature API での使用

```typescript
// app/features/todo/api/todos.ts
import { request } from "@/app/lib/api";
import { normalizePatchRequest } from "@/app/lib/api/normalize";
import { schemas } from "@/generated/zod-schemas";

export const todoApi = {
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
};
```

### Hook層での使用

```typescript
// app/features/todo/hooks/useUpdateTodo.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { todoApi } from "../api/todos";

export function useUpdateTodo(todoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      data,
      dirtyFields,
    }: {
      data: UpdateTodoParams;
      dirtyFields: Partial<Record<keyof UpdateTodoParams, boolean>>;
    }) => todoApi.updateTodo(todoId, data, dirtyFields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}
```

### フォームでの使用

```typescript
// コンポーネント内
const {
  handleSubmit,
  formState: { dirtyFields },
} = useForm<UpdateTodoParams>({
  defaultValues: todo, // サーバーから取得した現在値
});

const updateTodo = useUpdateTodo(todoId);

const onSubmit = handleSubmit((data) => {
  updateTodo.mutate({ data, dirtyFields });
});
```

## POSTリクエストの扱い

POSTリクエスト（新規作成）では `dirtyFields` は不要。

ただし、空文字列のフィールドは**省略（送信しない）**する。

**根拠となる契約**:
- `contract/api/15-validation-constraints.md`: Register*ParamsとUpdate*Paramsの違い
- `contract/api/20-endpoint-design.md`: POST操作の2値セマンティクス

**理由**: `Register*Params` には `nullable: true` が設定されていないため、`null` を送信するとバリデーションエラーになる。空文字列も `minLength: 1` でエラーになる。

| HTTPメソッド | 空文字列の扱い | 許可される状態 |
|-------------|---------------|----------------|
| POST | 省略（フィールド自体を送信しない） | 2値: 有効な値 or 省略 |
| PATCH | `null`に変換 | 3値: 有効な値 or null or 省略 |

```typescript
// POSTリクエスト用の正規化（空文字列フィールドを除外）
export function normalizePostRequest<T extends Record<string, unknown>>(
  data: T,
): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(data)) {
    // 空文字列は除外（送信しない）
    if (typeof value === "string" && value.trim() === "") {
      continue;
    }
    result[key as keyof T] = value as T[keyof T];
  }
  return result;
}
```

## 変換フロー図

```
┌─────────────────────────────────────────────────────────────────┐
│ フォーム送信                                                     │
│ data: { title: "新タイトル", description: "", dueDate: "" }     │
│ dirtyFields: { title: true, description: true }                 │
└────────────────────────────────┬────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 1. pickDirtyFields                                              │
│ 結果: { title: "新タイトル", description: "" }                  │
│ ※ dueDate は dirtyFields に含まれないため除外                  │
└────────────────────────────────┬────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. normalizeEmptyStrings                                        │
│ 結果: { title: "新タイトル", description: null }                │
│ ※ 空文字列 "" は null に変換                                    │
└────────────────────────────────┬────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. JSON.stringify → HTTPリクエスト                               │
│ PATCH /todos/123                                                │
│ Body: {"title":"新タイトル","description":null}                 │
└─────────────────────────────────────────────────────────────────┘
```

## Do / Don't

### Do

```typescript
// dirtyFieldsを使用して変更フィールドのみ送信
const normalized = normalizePatchRequest(data, dirtyFields);
await request(`/todos/${id}`, schema, {
  method: "PATCH",
  body: JSON.stringify(normalized),
});

// フォームのdefaultValuesにサーバーの現在値を設定
const { formState: { dirtyFields } } = useForm({
  defaultValues: todo,
});

// POSTでは空文字列フィールドを除外
const normalized = normalizePostRequest(data);
await request("/todos", schema, {
  method: "POST",
  body: JSON.stringify(normalized),
});
```

### Don't

```typescript
// 全フィールドをそのまま送信（NG）
await request(`/todos/${id}`, schema, {
  method: "PATCH",
  body: JSON.stringify(data), // dirtyFieldsを考慮していない
});

// defaultValuesに空オブジェクトを設定（NG）
const { formState: { dirtyFields } } = useForm({
  defaultValues: {}, // 全フィールドがdirtyになってしまう
});

// 空文字列をそのまま送信（NG）
// → OpenAPIの minLength: 1 でバリデーションエラー
await request("/todos", schema, {
  method: "POST",
  body: JSON.stringify({ title: "タイトル", description: "" }),
});
```

## 関連ドキュメント

- `10-api-overview.md`: API配置のコロケーション
- `../../contract/api/20-endpoint-design.md`: PATCH操作の3値セマンティクス
- `../form/10-form-overview.md`: フォーム設計概要
- `../../server/handler/21-http-handler-implementation.md`: Handler層でのnull→undefined変換
