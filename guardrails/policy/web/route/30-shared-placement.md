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
app/features/product/components/product-card.tsx
```

### Don't

```typescript
// 見た目が似ているだけのカード
// → 意味的に異なるので共通化NG
// app/routes/todos+/components/todo-card.tsx
// app/routes/projects+/components/project-card.tsx
// ↑ 各ルートで別々に持つ
```

## 配置階層

**どこに（WHERE）配置するか**:

```
使用箇所の関係
    ↓
同一ルート内 → app/routes/{route}+/components/
    ↓
親子ルート間 → app/routes/{parent}+/_shared/components/
    ↓
複数機能横断（3+） → app/features/{feature}/
    ↓
全アプリ共通（純粋） → app/lib/
```

### 配置の具体例

```
app/
├── routes/
│   ├── products+/
│   │   ├── _shared/                    # (親子) 親子ルート間で共通
│   │   │   └── components/
│   │   │       └── product-form.tsx
│   │   ├── $productId+/
│   │   │   ├── route.tsx
│   │   │   └── components/             # (同一) ルート内で共通
│   │   │       └── product-detail.tsx
│   │   └── new+/
│   │       └── route.tsx
│   └── _shared/                        # 全ルート共通
│       └── components/
│           └── layout.tsx
├── features/                           # (3+) 複数機能横断で共通
│   └── user/
│       └── components/
│           └── user-avatar.tsx
└── lib/                                # 純粋ユーティリティ
    ├── ui/
    │   └── button.tsx
    └── utils/
        └── format-date.ts
```

## 依存の方向

```
app/routes/ → app/routes/_shared/ → app/features/ → app/lib/
```

**一方向のみ許可**。逆方向のインポートは禁止。

**根拠となる憲法**:
- `architecture-principles.md`: 依存の制御

### Do

```typescript
// app/routes/todos+/route.tsx
import { UserAvatar } from "@/features/user";
import { formatDate } from "@/lib/utils";
import { Button } from "@/lib/ui";
```

### Don't

```typescript
// app/features/user/components/user-avatar.tsx
import { TodoList } from "@/routes/todos+/components/todo-list"; // NG: 逆方向
```

## 共通化の昇格フロー

```
1. 最初はルート内に配置
   app/routes/todos+/components/status-badge.tsx

2. 2箇所目で使いたくなっても、まだ共通化しない
   app/routes/projects+/components/status-badge.tsx（別で作る）

3. 3箇所目で共通化を検討
   → 意味的に同一か確認（同じAPI型を使っている？）
   → 最も近い共通の親に配置
   app/features/todo/components/status-badge.tsx
```

**根拠となる憲法**:
- `implementation-minimization-principles.md`: 必要性が明確になった時点で実装

## 関連ドキュメント

- `10-route-overview.md`: ルート設計概要
- `20-colocation-patterns.md`: コロケーションパターン
- `../feature/10-feature-overview.md`: Feature設計概要
