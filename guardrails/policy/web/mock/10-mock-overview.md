# テストデータ命名規則

## 核心原則

テストデータは**用途に応じた命名規則**で分類する。命名規則により、データの特性と用途が一目でわかる。

**根拠となる憲法**:
- `testing-principles.md`: 決定論的テスト
- `analyzability-principles.md`: 影響範囲の静的追跡

## 配置先

```
src/mocks/
├── mock-data.ts      # テストデータ定義
└── mock.ts           # MSWハンドラー
```

**インポート**: `@/mocks/*` でアクセス可能（例: `import { mockUser } from "@/mocks/mock-data"`）

## 命名規則

| 用途 | プレフィックス/サフィックス | 例 |
|------|---------------------------|-----|
| CT用（固定値） | `mock*` | `mockUser`, `mockTodo` |
| SS/MSW用（相対日時） | `*Dummy*` | `UserDummy1`, `TodoDummy1` |
| MSWレスポンス | `*ResponseDummy` | `TodosResponseDummy` |

## 2種類のテストデータ

### 1. Component Test用（`mock*`プレフィックス）

**固定値**を使用し、コンポーネント単体テストに使用。

```typescript
// mocks/mock-data.ts
import type { UserResponse, TodoResponse } from "@/generated/zod-schemas";

export const mockUser: UserResponse = {
  id: "user-1",
  email: "test@example.com",
  name: "テストユーザー",
  createdAt: "2024-01-01T00:00:00Z",  // 固定日時
};

export const mockTodo: TodoResponse = {
  id: "todo-1",
  title: "テストタスク",
  status: "TODO",
  priority: "HIGH",
  createdAt: "2024-01-01T00:00:00Z",  // 固定日時
  createdBy: mockUser,
};
```

**特徴**:
- 固定のISO日時（`"2024-01-01T00:00:00Z"`）
- 最小限の必須フィールド
- スナップショット比較に適した決定論的データ

### 2. Snapshot/MSW用（`*Dummy*`サフィックス）

**相対日時**を使用し、よりリアルなデータでスナップショットテストやMSWハンドラーに使用。

```typescript
// mocks/mock-data.ts
export const UserDummy1: UserResponse = {
  id: "user-dummy-1",
  email: "tanaka@example.com",
  name: "田中太郎",
  createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),  // 90日前
};

export const TodoDummy1: TodoResponse = {
  id: "todo-dummy-1",
  title: "週次レポート作成",
  status: "IN_PROGRESS",
  priority: "HIGH",
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),  // 7日前
  createdBy: UserDummy1,
};
```

**特徴**:
- 相対日時（`Date.now() - N日`）
- 完全なリレーション（attachments, assignee等）
- MSWハンドラーで使用

## Do / Don't

### Do

```typescript
// CT用: 固定値 + mockプレフィックス
export const mockUser: UserResponse = {
  id: "user-1",
  createdAt: "2024-01-01T00:00:00Z",  // 固定
};

// SS/MSW用: 相対日時 + Dummyサフィックス
export const UserDummy1: UserResponse = {
  id: "user-dummy-1",
  createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
};
```

### Don't

```typescript
// NG: 命名と特性が不一致
export const mockUser: UserResponse = {
  createdAt: new Date().toISOString(),  // mockなのに動的日時
};

// NG: 命名規則に従っていない
export const testUser: UserResponse = { ... };  // mock*でもDummy*でもない
export const sampleTodo: TodoResponse = { ... };
```

## 関連ドキュメント

- `20-msw-patterns.md`: MSWハンドラーパターン
- `../route/40-test-patterns.md`: ルートテスト（SS）
- `../component/30-test-patterns.md`: コンポーネントテスト（CT）
