# コンポーネント設計概要

## 核心原則

コンポーネントは**ルート内にコロケーション**し、そのルートの機能に特化した実装とする。

**根拠となる憲法**:
- `module-cohesion-principles.md`: 機能的凝集、コロケーション
- `analyzability-principles.md`: 影響範囲の静的追跡

## 配置先

```
app/routes/({role})/{feature}/
├── route.tsx
├── components/           # ルート固有コンポーネント
│   ├── TodoList.tsx
│   ├── TodoItem.tsx
│   └── TodoFilter.tsx
└── hooks/
    └── useTodoFilter.ts
```

## 実施すること

1. **ルート内配置**: コンポーネントはそのルートの`components/`に配置
2. **単一責務**: 1コンポーネント = 1つの明確な役割
3. **Props型の明示**: `readonly`修飾子で不変性を表現
4. **UIプリミティブの利用**: `app/lib/ui/`のButton, Input等を活用
5. **余白・配置の制御**: UIプリミティブの余白は呼び出し側で制御（詳細は`../lib/20-ui-primitives.md`）

## 実施しないこと

1. **横断的な`components/`配置** → ルート内にコロケーション
2. **早すぎる共通化** → 3回ルールを適用
3. **ビジネスロジックの埋め込み** → hooks/に分離

## Props設計

```typescript
// app/routes/(user)/todos/components/TodoItem.tsx
import type { TodoResponse } from "@/generated/zod-schemas";
import { Button } from "@/app/lib/ui";

type Props = {
  readonly todo: TodoResponse;
  readonly onComplete: (id: string) => void;
  readonly onDelete: (id: string) => void;
};

export function TodoItem({ todo, onComplete, onDelete }: Props) {
  return (
    <div>
      <span>{todo.title}</span>
      <Button onClick={() => onComplete(todo.id)}>完了</Button>
      <Button onClick={() => onDelete(todo.id)}>削除</Button>
    </div>
  );
}
```

**ポイント**:
- `readonly`で不変性を明示
- API型（`TodoResponse`）を直接参照
- コールバックは親から注入

## 共通化の判断

| 使用箇所 | 配置先 |
|---------|--------|
| 同一ルート内のみ | `routes/({role})/{feature}/components/` |
| 親子ルート間 | `routes/({role})/{feature}/_shared/components/` |
| 3+ルート横断 | `app/features/{feature}/components/` |

## 関連ドキュメント

- `20-selector-strategy.md`: セレクタ戦略
- `30-test-patterns.md`: コンポーネントテスト（CT）
- `../route/10-route-overview.md`: ルート設計概要
- `../lib/20-ui-primitives.md`: UIプリミティブ
