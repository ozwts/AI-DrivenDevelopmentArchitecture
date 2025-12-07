# ルート設計概要

## 核心原則

ルートは**機能境界**である。関連するすべてのコード（コンポーネント、フック、ロジック、テスト）を同一ディレクトリに配置し、データフローをディレクトリ内で完結させる。

**根拠となる憲法**:
- `module-cohesion-principles.md`: 機能的凝集、コロケーション
- `architecture-principles.md`: モジュールの独立
- `analyzability-principles.md`: 影響範囲の静的追跡

## 実施すること

1. **ルート単位のコロケーション**: ルート固有のコンポーネント・フック・ロジックはルートディレクトリ内に配置
2. **ロールによる構造的分離**: 同一ロールのルートは`_{role}+/`に物理グループ化
3. **責務による分離**: 作成・編集・参照など責務が異なれば別ルートに分割
4. **共通化の段階的昇格**: 3箇所以上で使用される場合のみ共通化

## 実施しないこと

1. **カテゴリ別の横断配置** → ルート内にコロケーション
2. **条件分岐によるロール分離** → ディレクトリ構造で分離
3. **早すぎる共通化** → 3回ルールを適用
4. **技術的条件による物理グループ化** → `layout()`で技術的に適用

## ディレクトリ構造

```
app/
├── features/
│   └── {feature}/
│       ├── {Feature}Layout.tsx  # 3+ルートで共通のレイアウト
│       └── components/
│           └── {Component}.tsx
│
└── routes/
    ├── _{role}+/                # ロールによる物理グループ化
    │   └── {route}+/
    │
    └── {feature}+/              # 独立した機能
        ├── _shared/             # 親子ルート間で共通
        ├── new+/
        └── ${param}+/
```

## レイアウトの適用

### 考え方

| 分類 | 適用方法 | 根拠 |
|------|----------|------|
| **ロール**（ユーザー種別） | `_{role}+/`で物理グループ化 | ロールは機能的な境界 |
| **技術的条件**（認証要否など） | `layout()`で技術的に適用 | 技術的条件はロールではない |

**routes配下にlayoutファイルを置かない**。レイアウトは`features/`に配置し、`routes.ts`の`layout()`で適用する。

### routes.ts での定義

```typescript
import { type RouteConfig, route, index, layout } from "@react-router/dev/routes";

export default [
  // ロールA専用（物理グループ化 + layout適用）
  layout("features/{feature}/{RoleA}Layout.tsx", [
    route("{path}", "routes/_{roleA}+/{route}+/route.tsx"),
  ]),

  // ロールB専用（技術的適用のみ）
  layout("features/{feature}/{RoleB}Layout.tsx", [
    index("routes/{feature}+/route.tsx"),
    route("{path}", "routes/{feature}+/{route}+/route.tsx"),
  ]),
] satisfies RouteConfig;
```

## 依存の方向

```
app/routes/ → app/features/ → app/lib/
```

**一方向のみ許可**。逆方向のインポートは禁止。

## 共通化の配置基準

| 使用スコープ | 配置先 | 例 |
|-------------|--------|-----|
| 同一ルート内 | `routes/{route}+/components/` | ルート固有UI |
| 親子ルート間 | `routes/{parent}+/_shared/` | 共通フォーム |
| 3+ルート横断 | `app/features/` | Layout, Toast |
| 全アプリ共通（純粋） | `app/lib/` | formatDate, Button |

## ディレクトリ命名規則

| 接頭辞/接尾辞 | 意味 | 例 |
|-------------|------|-----|
| `_` (アンダースコア) | ロールによるグループ（URLに影響しない） | `_{role}+/` |
| `+` (プラス) | コロケーション用フォルダ | `{feature}+/` |
| `$` (ドル) | 動的セグメント | `${param}+/` |

## Do / Don't

### Do

```
app/
├── features/{feature}/
│   └── {Feature}Layout.tsx      # 3+ルートで共通
│
└── routes/
    ├── _{role}+/                # ロール（ユーザー種別）で物理グループ化
    │   └── {route}+/route.tsx
    │
    └── {feature}+/              # 独立した機能（フラット）
        ├── _shared/components/{Form}.tsx
        └── ${param}+/
            ├── route.tsx        # 親: データ取得 + Outlet
            ├── _index/route.tsx
            └── edit+/route.tsx
```

### Don't

```
app/routes/
├── _{technicalCondition}/       # 技術的条件による物理グループ化
│   ├── layout.tsx               # layoutはfeatures/に置くべき
│   └── {feature}/
```

## 関連ドキュメント

- `20-colocation-patterns.md`: コロケーションの実装パターン
- `30-shared-placement.md`: 共通化の配置基準
- `40-test-patterns.md`: ルートテスト（スナップショット）
