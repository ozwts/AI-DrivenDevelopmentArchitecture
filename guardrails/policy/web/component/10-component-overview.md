# コンポーネント設計概要

## 核心原則

コンポーネントは**routeまたはfeature内にコロケーション**し、使用スコープに特化した実装とする。

**根拠となる憲法**:
- `module-cohesion-principles.md`: 機能的凝集、コロケーション
- `analyzability-principles.md`: 影響範囲の静的追跡

## 配置先

### route内配置

```
app/routes/({role})/{feature}/
├── route.tsx
├── components/           # route固有コンポーネント
│   ├── TodoList.tsx
│   ├── TodoItem.tsx
│   └── TodoFilter.tsx
└── hooks/
    └── useTodoFilter.ts
```

### feature内配置（3+route横断）

```
app/features/{feature}/
├── components/           # 横断的コンポーネント
│   └── AuthInitializer.tsx
├── hooks/
└── index.ts              # Public API
```

## 実施すること

1. **スコープに応じた配置**: コンポーネントは使用スコープに応じて`routes/`または`features/`の`components/`に配置
2. **単一責務**: 1コンポーネント = 1つの明確な役割
3. **Props型の明示**: `readonly`修飾子で不変性を表現
4. **UIプリミティブの利用**: `app/lib/ui/`のButton, Input等を活用
5. **配置の制御**: UIプリミティブの配置は呼び出し側で制御（余白はUIプリミティブ内部で定義。詳細は`../ui/10-ui-overview.md`）

## 実施しないこと

1. **app/直下の横断的な`components/`配置** → route/feature内にコロケーション
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

## 更新フォームコンポーネント

更新用フォームでは `onSubmit` コールバックに `dirtyFields` を渡す。

**参照**: `../api/20-request-normalization.md`（パターン詳細とコード例）

## 共通化の判断

| 使用箇所 | 配置先 |
|---------|--------|
| 同一route内のみ | `routes/({role})/{feature}/components/` |
| 親子route間 | `routes/({role})/{feature}/_shared/components/` |
| 3+route横断（アプリ固有概念あり） | `app/features/{feature}/components/` |

**詳細**: 共通化の判断基準と依存方向は `../feature/10-feature-overview.md` を参照。

## UIプリミティブ化の判断

route内コンポーネントから`app/lib/ui/`への移行を検討する判断基準。

### 判断フロー

```
Q1: アプリケーション固有の概念（Todo, Project, User等）を知っているか？
│
├─ Yes → UIプリミティブではない（共通化は上記3回ルールで判断）
│
└─ No（汎用UI部品）
    │
    Q2: 下記の「兆候」に当てはまるか？
    │
    ├─ Yes → UIプリミティブ化を検討（../ui/10-ui-overview.md参照）
    │
    └─ No → 現状維持（div + Tailwindで十分）
```

### UIプリミティブ化を検討すべき兆候

- 同じTailwindクラスの組み合わせが3箇所以上で出現
- 「他のページと同じスタイルにして」という指摘を受けた
- デザイン変更時に「全部直さないと」となった
- arbitrary values（`bg-[#xxx]`）を書きたくなった
- 「このボタン、primaryかsecondaryか」と聞かれた

### UIプリミティブ化のメリット

| メリット | 説明 |
|---------|------|
| 一貫性の強制 | variant/sizeで選択肢を限定、デザイン崩れを防止 |
| 変更の一括適用 | UIプリミティブを1箇所修正 → 全箇所に反映 |
| 型安全 | CVAで「使えるスタイル」が型レベルで明確 |
| 認知負荷の削減 | 「どうスタイリングするか」を毎回考えなくていい |

### UIプリミティブ化しないリスク

| リスク | 説明 |
|-------|------|
| スタイルの不一致 | 同じ見た目のはずが微妙に違う（padding、色など） |
| 変更漏れ | デザイン修正時に「あ、ここも直さないと」が発生 |
| arbitrary values増加 | トークン外の値が増え、一貫性が崩れる |

## 関連ドキュメント

- `20-selector-strategy.md`: セレクタ戦略
- `30-form-overview.md`: フォーム設計概要
- `31-conditional-validation.md`: 条件分岐バリデーション
- `40-test-patterns.md`: コンポーネントテスト（CT）
- `../route/10-route-overview.md`: ルート設計概要
- `../feature/10-feature-overview.md`: Feature設計概要（共通化の判断基準）
- `../ui/10-ui-overview.md`: UIプリミティブ設計概要
- `../api/20-request-normalization.md`: PATCHリクエスト正規化（dirtyFields）
