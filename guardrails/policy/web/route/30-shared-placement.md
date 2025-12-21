# 共通化の配置基準

## 概要

共通化は「いつ」「何を」「どこに」の基準に従い、意味的に同一のもののみ行う。

**根拠となる憲法**:
- `module-cohesion-principles.md`: 原則4「共通化の判断基準」
- `validation-principles.md`: Single Source of Truth

## 3回ルール

**いつ（WHEN）共通化するか**:

| 使用箇所 | 判断 |
|---------|------|
| 1箇所 | 共通化しない（そのルート内に配置） |
| 2箇所 | 共通化しない（各ルートで別々に持つ） |
| 3箇所以上 | 共通化を検討 |

**根拠**: 早すぎる抽象化は将来の変更を困難にする。DRY（Don't Repeat Yourself）よりもRight Abstraction（適切な抽象化）を優先する。

## 意味的同一性

**何を（WHAT）共通化するか**:

共通化してよいのは**意味的に同一**の場合のみ。

| 判断基準 | 共通化 |
|---------|--------|
| 同じAPI型を参照 | OK |
| 同じDBスキーマを参照 | OK |
| 同じビジネス概念 | OK |
| 見た目が似ている | NG |
| コードが似ている | NG |

### Do

```typescript
// 同じAPI型（ProductResponse）を表示するコンポーネント
// → 意味的に同一なので共通化OK
app/features/product/components/ProductCard.tsx
```

### Don't

```typescript
// 見た目が似ているだけのカード
// → 意味的に異なるので共通化NG
// app/routes/({role})/todos/components/TodoCard.tsx
// app/routes/({role})/projects/components/ProjectCard.tsx
// ↑ 各ルートで別々に持つ
```

## 配置階層

**どこに（WHERE）配置するか**:

```
使用箇所の関係
    ↓
同一ルート内 → app/routes/({role})/{feature}/components/
    ↓
親子ルート間 → app/routes/({role})/{feature}/_shared/components/
    ↓
複数機能横断（3+） → app/features/{feature}/
    ↓
全アプリ共通（純粋） → app/lib/
```

---

## `_shared/` ディレクトリの使い方

### 目的

`_shared/` は**親子ルート間で共有するコード**を配置する場所。機能（feature）ディレクトリ直下に置き、その機能内の複数ルートから参照される。

**注意**: レイアウト専用コンポーネントは `_layout/` ディレクトリに配置する（後述）。

### 命名規則

| 項目 | 規則 |
|------|------|
| プレフィックス | `_`（アンダースコア）で開始 |
| 名前 | `shared` 固定 |
| 意味 | 「このディレクトリはルートではない」ことを明示 |

**根拠**: React Router v7 のファイルベースルーティングでは `_` プレフィックスで非ルートを示す慣習がある。本プロジェクトでは `routes.ts` で明示的にルート定義するが、視覚的な識別のために採用。

### 配置基準

| 条件 | `_shared/` に配置？ |
|------|-------------------|
| 親ルート（`route.tsx`）と子ルート（`new/`, `[param]/`）で共有 | ✅ Yes |
| 機能内の親子ルート間で共有する純粋関数（utils） | ✅ Yes |
| レイアウト専用コンポーネント | ❌ No → `_layout/` |
| 同一ルート内の複数コンポーネントで共有 | ❌ No → `components/` |
| 異なるルート（`todos/` と `projects/`）で共有 | ❌ No → `features/` |

**重要な補足**:

- **純粋関数でも3箇所未満なら `lib/` に移動しない**。「純粋だから `lib/`」ではなく、「3+ルートで横断利用」が `lib/` への昇格条件

### ディレクトリ構造

```
app/routes/
├── ({role})/                       # ロールディレクトリ
│   ├── _layout/                    # レイアウト + 専用コンポーネント
│   │   ├── layout.tsx              # レイアウト本体
│   │   └── Header.tsx              # レイアウト専用コンポーネント
│   │
│   └── {feature}/                  # 機能ディレクトリ
│       ├── _shared/                # ← 親子ルート間で共通
│       │   ├── components/
│       │   │   └── {Feature}Form.tsx
│       │   ├── hooks/
│       │   │   └── use{Feature}Mutation.ts
│       │   ├── utils/              # 機能内で共有する純粋関数
│       │   │   └── helper.ts
│       │   └── types.ts
│       │
│       ├── route.tsx               # 一覧ルート
│       ├── new/
│       │   └── route.tsx           # 新規作成（_shared/を参照）
│       └── [param]/
│           ├── route.tsx           # 詳細
│           └── edit/
│               └── route.tsx       # 編集（_shared/を参照）
```

### 典型的なユースケース

#### 1. 作成・編集で共通のフォーム

```typescript
// app/routes/({role})/todos/_shared/components/TodoForm.tsx
type Props = {
  readonly defaultValues?: TodoFormData;
  readonly onSubmit: (data: TodoFormData) => void;
  readonly isSubmitting?: boolean;
};

export function TodoForm({ defaultValues, onSubmit, isSubmitting }: Props) {
  // フォームUIのみ（データ取得・更新は呼び出し元の責務）
}
```

```typescript
// app/routes/({role})/todos/new/route.tsx
import { TodoForm } from "../_shared/components/TodoForm";

export default function NewTodoRoute() {
  const mutation = useCreateTodo();
  return <TodoForm onSubmit={mutation.mutate} isSubmitting={mutation.isPending} />;
}
```

```typescript
// app/routes/({role})/todos/[todoId]/edit/route.tsx
import { TodoForm } from "../../_shared/components/TodoForm";

export default function EditTodoRoute() {
  const { todo } = useOutletContext<TodoOutletContext>();
  const mutation = useUpdateTodo();
  return (
    <TodoForm
      defaultValues={todo}
      onSubmit={mutation.mutate}
      isSubmitting={mutation.isPending}
    />
  );
}
```

#### 2. 共通のミューテーションフック

```typescript
// app/routes/({role})/todos/_shared/hooks/useTodoMutations.ts
export function useCreateTodo() { ... }
export function useUpdateTodo() { ... }
export function useDeleteTodo() { ... }
```

### Do / Don't

#### Do

```
todos/
├── _shared/
│   └── components/
│       └── TodoForm.tsx        # ✅ new/ と edit/ で共通
├── new/
│   └── route.tsx
└── [todoId]/
    └── edit/
        └── route.tsx
```

#### Don't

```
todos/
├── _shared/
│   └── components/
│       └── Button.tsx          # ❌ 汎用UIは lib/ui/ へ
│       └── UserAvatar.tsx      # ❌ 他ルートでも使うなら features/ へ
```

### `_shared/` を使わないケース

| ケース | 理由 | 配置先 |
|--------|------|--------|
| 1つのルートでのみ使用 | 共有の必要がない | そのルートの `components/` |
| レイアウト専用コンポーネント | レイアウトとコロケーション | `_layout/` |
| 3+の異なるルートで使用 | ルート横断 | `app/features/` |
| ビジネスロジックを含まない純粋UI | 汎用 | `app/lib/ui/` |

---

## `_layout/` ディレクトリの使い方

### 目的

`_layout/` は**レイアウト本体と専用コンポーネント**をコロケーションする場所。ロールディレクトリ直下に配置する。

### 構造

```
({role})/
├── _layout/
│   ├── layout.tsx       # レイアウト本体（routes.ts で参照）
│   ├── Header.tsx       # レイアウト専用コンポーネント
│   └── Sidebar.tsx      # レイアウト専用コンポーネント
└── {feature}/
```

### routes.ts での定義

**routes.ts が正**: ディレクトリ階層ではなく routes.ts での定義が適用される。

```typescript
export default [
  // 認証ページ（公開）- auth/_layout を使用
  layout("routes/(buyer)/auth/_layout/layout.tsx", [
    route("login", "routes/(buyer)/auth/login/route.tsx"),
    route("signup", "routes/(buyer)/auth/signup/route.tsx"),
  ]),

  // アプリページ（認証必要）- _layout を使用
  layout("routes/(buyer)/_layout/layout.tsx", [
    index("routes/(buyer)/home/route.tsx"),
    route("products", "routes/(buyer)/products/route.tsx"),
  ]),
]
```

### レイアウトの適用ルール

1. **機能ごとにレイアウト**: `auth/_layout` と `_layout` は独立
2. **親の _layout は自動適用されない**: 明示的に layout() でラップしたルートのみに適用

### インポート

```typescript
// _layout/layout.tsx から
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
```

### `_layout/` vs `_shared/`

| 項目 | `_layout/` | `_shared/` |
|------|-----------|-----------|
| 配置場所 | ロールディレクトリ直下 | 機能ディレクトリ直下 |
| 用途 | レイアウト専用 | 親子ルート間共有 |
| 含むもの | レイアウト本体 + 専用コンポーネント | 共通コンポーネント、フック、utils |

---

### インポートパス

```typescript
// 相対パスで参照（機能内に閉じていることを明示）
import { TodoForm } from "../_shared/components/TodoForm";
import { TodoForm } from "../../_shared/components/TodoForm";

// ❌ エイリアスは使わない（機能境界を曖昧にする）
import { TodoForm } from "@/routes/({role})/todos/_shared/components/TodoForm";
```

### 配置の具体例

```
app/
├── routes/
│   └── (buyer)/
│       ├── _layout/                        # レイアウト + 専用コンポーネント
│       │   ├── layout.tsx                  # レイアウト本体
│       │   └── Header.tsx                  # レイアウト専用
│       │
│       ├── products/
│       │   ├── _shared/                    # (親子) 親子ルート間で共通
│       │   │   └── components/
│       │   │       └── ProductForm.tsx
│       │   ├── [productId]/
│       │   │   ├── route.tsx
│       │   │   └── components/             # (同一) ルート内で共通
│       │   │       └── ProductDetail.tsx
│       │   └── new/
│       │       └── route.tsx
│       └── cart/
│           └── ...
│
├── features/                               # (3+) 複数機能横断で共通
│   └── user/
│       └── components/
│           └── UserAvatar.tsx
│
└── lib/                                    # 純粋ユーティリティ
    ├── ui/
    │   └── Button.tsx
    └── utils/
        └── formatDate.ts
```

## 依存の方向

```
app/routes/ → app/features/ → app/lib/
```

**一方向のみ許可**。逆方向のインポートは禁止。

**根拠となる憲法**:
- `architecture-principles.md`: 依存の制御

### Do

```typescript
// app/routes/({role})/todos/route.tsx
import { UserAvatar } from "@/app/features/user";
import { formatDate } from "@/app/lib/utils";
import { Button } from "@/app/lib/ui";
```

### Don't

```typescript
// app/features/user/components/UserAvatar.tsx
import { TodoList } from "@/routes/({role})/todos/components/TodoList"; // NG: 逆方向
```

## 共通化の昇格フロー

```
1. 最初はルート内に配置
   app/routes/({role})/todos/components/StatusBadge.tsx

2. 2箇所目で使いたくなっても、まだ共通化しない
   app/routes/({role})/projects/components/StatusBadge.tsx（別で作る）

3. 3箇所目で共通化を検討
   → 意味的に同一か確認（同じAPI型を使っている？）
   → 最も近い共通の親に配置
   app/features/todo/components/StatusBadge.tsx
```

**根拠となる憲法**:
- `implementation-minimization-principles.md`: 必要性が明確になった時点で実装

## 関連ドキュメント

- `10-route-overview.md`: ルート設計概要
- `15-role-design.md`: ロール設計（WHO）
- `20-colocation-patterns.md`: コロケーション（HOW）
- `../feature/10-feature-overview.md`: Feature設計概要
