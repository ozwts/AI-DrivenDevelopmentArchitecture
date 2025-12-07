# MSWハンドラーパターン

## 概要

MSW（Mock Service Worker）を使用したAPIモックのパターン。スナップショットテストや開発時のAPI模擬に使用。

**根拠となる憲法**:
- `testing-principles.md`: 決定論的テスト

## 基本構造

```typescript
// src/mocks/mock.ts
import { setupWorker, rest } from "msw";
import { TodoDummy1, TodoDummy2, TodoDummy3, UserDummy1 } from "./mock-data";

export const TodosResponseDummy = [TodoDummy1, TodoDummy2, TodoDummy3];

const handlers = [
  rest.get("/api/todos", (req, res, ctx) => {
    return res(ctx.delay(100), ctx.json(TodosResponseDummy));
  }),
  rest.post("/api/todos", async (req, res, ctx) => {
    const body = await req.json();
    return res(ctx.delay(100), ctx.status(201), ctx.json({ id: "new-id", ...body }));
  }),
  rest.get("/api/users/:id", (req, res, ctx) => {
    return res(ctx.delay(100), ctx.json(UserDummy1));
  }),
];
```

## ハンドラー切り替えパターン

テストシナリオに応じてハンドラーを切り替える。

```typescript
// src/mocks/mock.ts

// 空のレスポンス用ハンドラー
const emptyHandlers = [
  rest.get("/api/todos", (req, res, ctx) => {
    return res(ctx.delay(100), ctx.json([]));
  }),
];

// エラーレスポンス用ハンドラー
const errorHandlers = [
  rest.get("/api/todos", (req, res, ctx) => {
    return res(ctx.delay(100), ctx.status(500), ctx.json({ error: "Internal Server Error" }));
  }),
];

// ハンドラー切り替え関数
export function getHandlersByType(type: string) {
  switch (type) {
    case "HAS_ALL":
      return handlers;
    case "EMPTY":
      return emptyHandlers;
    case "ERROR":
      return errorHandlers;
    default:
      return handlers;
  }
}
```

## グローバル公開パターン

開発時やE2Eテストでハンドラーを動的に切り替える。

```typescript
// src/mocks/mock.ts

if (typeof window !== "undefined") {
  window.msw = {
    worker: setupWorker(...handlers),
    setHandlers: (type: string) => {
      const newHandlers = getHandlersByType(type);
      window.msw.worker.resetHandlers(...newHandlers);
    },
  };
}

// TypeScript型定義
declare global {
  interface Window {
    msw: {
      worker: ReturnType<typeof setupWorker>;
      setHandlers: (type: string) => void;
    };
  }
}
```

## テストでの使用例

```typescript
// スナップショットテスト
test("TODOリストが表示される", async ({ page }) => {
  // MSWハンドラーを設定
  await page.evaluate(() => window.msw.setHandlers("HAS_ALL"));

  await page.goto("/todos");
  await expect(page.getByTestId("todo-list")).toBeVisible();
});

test("空の状態が表示される", async ({ page }) => {
  await page.evaluate(() => window.msw.setHandlers("EMPTY"));

  await page.goto("/todos");
  await expect(page.getByText("TODOがありません")).toBeVisible();
});
```

## レスポンス命名規則

| パターン | 命名 | 例 |
|---------|------|-----|
| リスト | `{Entity}sResponseDummy` | `TodosResponseDummy` |
| 単体 | `{Entity}ResponseDummy` | `TodoResponseDummy` |
| 作成結果 | `Create{Entity}ResponseDummy` | `CreateTodoResponseDummy` |

## 関連ドキュメント

- `10-mock-overview.md`: テストデータ命名規則
- `../route/40-test-patterns.md`: ルートテスト（SS）
