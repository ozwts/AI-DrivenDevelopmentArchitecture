# ルート設計概要

## 核心原則

ルートは**機能境界**である。関連するすべてのコード（コンポーネント、フック、ロジック、テスト）を同一ディレクトリに配置し、データフローをディレクトリ内で完結させる。

**根拠となる憲法**:
- `module-cohesion-principles.md`: 機能的凝集、コロケーション
- `architecture-principles.md`: モジュールの独立
- `analyzability-principles.md`: 影響範囲の静的追跡

## 技術スタック

- **React Router v7** (framework モード)
- **routes.ts**: 明示的なルート定義（ファイルベースルーティングは使用しない）

## 実施すること

1. **ルート単位のコロケーション**: ルート固有のコンポーネント・フック・ロジックはルートディレクトリ内に配置
2. **ロールによる構造的分離**: 同一ロールのルートは`({role})/`に物理グループ化
3. **責務による分離**: 作成・編集・参照など責務が異なれば別ルートに分割
4. **共通化の段階的昇格**: 3箇所以上で使用される場合のみ共通化
5. **ログ出力の実施**: ユーザー操作・状態変化をLoggerで記録（`../logger/10-logger-overview.md`）

## 実施しないこと

1. **カテゴリ別の横断配置** → ルート内にコロケーション
2. **条件分岐によるロール分離** → ディレクトリ構造で分離
3. **早すぎる共通化** → 3回ルールを適用

## ディレクトリ構造

```
app/
├── features/                    # 3+ルートで横断的に使用（固有概念あり）
│   └── auth/
│       ├── contexts/
│       │   └── AuthContext.tsx  # Context + Provider + useAuth
│       └── index.ts
│
├── routes/
│   ├── ({role})/                # ロールによる物理グループ化
│   │   ├── _layout/             # レイアウト + 専用コンポーネント
│   │   │   ├── index.tsx        # レイアウト本体
│   │   │   └── Header.tsx       # レイアウト専用コンポーネント
│   │   └── {feature}/
│   │       ├── _shared/         # 親子ルート間で共通
│   │       ├── route.tsx
│   │       ├── new/
│   │       └── [param]/
│   │
│   └── routes.ts                # 明示的なルート定義
│
└── lib/                         # 純粋ユーティリティ
    └── ui/
```

## 命名規則

| 種類 | 命名 | 例 | 説明 |
|------|------|-----|------|
| **ロール** | `({role})/` | `(guest)/`, `(user)/` | URLに現れない、Next.js Route Groups 風 |
| **機能** | `{feature}/` | `todos/`, `projects/` | シンプルな名前 |
| **動的セグメント** | `[param]/` | `[todoId]/` | Next.js 風、広く認知 |
| **共通（非ルート）** | `_shared/` | `_shared/components/` | `_` で非ルートを明示 |
| **レイアウト** | `_layout/index.tsx` | `(user)/_layout/index.tsx` | ディレクトリで専用コンポーネントをコロケーション |

## ロール設計

### ロールとは

ロールは**ユーザー種別**を表す。同じリソースでも、ロールごとに**責務が異なる**場合は別ルートに分離する。

| ロール | 説明 | 例 |
|--------|------|-----|
| `guest` | 未認証ユーザー | ログイン、サインアップ |
| `user` | 認証済みユーザー（デフォルト） | TODO管理、プロフィール |
| `seller` | 出品者（責務が異なる場合） | 商品管理、在庫設定 |

### ロール分離の判断基準

| 条件 | 分離する？ | 理由 |
|------|----------|------|
| 同じリソースだが責務が異なる | ○ | 機能的凝集を優先 |
| UIが似ているが操作が異なる | ○ | 条件分岐の増殖を防ぐ |
| 単に認証要否が異なるだけ | ○ | ロールとして分離 |

### ロール分離が不要な場合（単一ロールアプリ）

TODOアプリのように**ロールが実質1種類**の場合でも、`(guest)/` と `(user)/` で分離する。

```
routes/
├── (guest)/                    # 未認証
│   ├── _layout/
│   │   └── index.tsx
│   └── login/
│
└── (user)/                     # 認証済み
    ├── _layout/
    │   └── index.tsx
    ├── home/
    └── todos/
```

## レイアウトの配置

### 考え方

**レイアウトはロールディレクトリ内の `_layout/` ディレクトリに配置**する。レイアウト本体（`index.tsx`）と専用コンポーネント（Header等）をコロケーションする。

| 配置場所 | 内容 | 理由 |
|----------|------|------|
| `routes/(guest)/_layout/index.tsx` | GuestLayout本体 | レイアウトと専用コンポーネントをコロケーション |
| `routes/(guest)/_layout/Header.tsx` | ゲスト用Header | レイアウトからのみ使用 |
| `routes/(user)/_layout/index.tsx` | UserLayout本体 | レイアウトと専用コンポーネントをコロケーション |
| `routes/(user)/_layout/Sidebar.tsx` | ユーザー用Sidebar | レイアウトからのみ使用 |

### routes.ts での定義

```typescript
import { type RouteConfig, route, index, layout } from "@react-router/dev/routes";

export default [
  // ゲストロール
  layout("routes/(guest)/_layout/index.tsx", [
    route("login", "routes/(guest)/login/route.tsx"),
    route("signup", "routes/(guest)/signup/route.tsx"),
  ]),

  // ユーザーロール
  layout("routes/(user)/_layout/index.tsx", [
    index("routes/(user)/home/route.tsx"),
    route("profile", "routes/(user)/profile/route.tsx"),
    route("todos", "routes/(user)/todos/route.tsx"),
    route("todos/new", "routes/(user)/todos/new/route.tsx"),
    route("todos/:todoId", "routes/(user)/todos/[todoId]/route.tsx"),
    route("todos/:todoId/edit", "routes/(user)/todos/[todoId]/edit/route.tsx"),
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
| 同一ルート内 | `routes/({role})/{feature}/components/` | ルート固有UI |
| 親子ルート間 | `routes/({role})/{feature}/_shared/` | 共通フォーム |
| レイアウト専用 | `routes/({role})/_layout/` | Header, Sidebar |
| 3+ルート横断（固有概念あり） | `app/features/` | useAuth |
| 全アプリ共通（固有概念なし） | `app/lib/` | Toast, Button, formatDate |

## Do / Don't

### Do

```
app/
├── features/
│   └── auth/
│       └── contexts/AuthContext.tsx  # Context + Provider + useAuth
│
├── routes/
│   ├── (guest)/
│   │   ├── _layout/
│   │   │   ├── index.tsx        # ゲスト用レイアウト
│   │   │   └── Header.tsx       # レイアウト専用
│   │   ├── login/
│   │   │   ├── route.tsx
│   │   │   └── LoginForm.tsx    # コロケーション
│   │   └── signup/
│   │       └── route.tsx
│   │
│   └── (user)/
│       ├── _layout/
│       │   ├── index.tsx        # ユーザー用レイアウト
│       │   └── Sidebar.tsx      # レイアウト専用
│       ├── home/
│       │   ├── route.tsx
│       │   └── components/
│       │       └── StatsGrid.tsx
│       └── todos/
│           ├── _shared/
│           │   └── components/
│           │       └── TodoForm.tsx
│           ├── route.tsx
│           ├── new/
│           │   └── route.tsx
│           └── [todoId]/
│               ├── route.tsx
│               └── edit/
│                   └── route.tsx
│
└── lib/
    └── ui/
        └── Button.tsx
```

### Don't

```
app/
├── features/
│   └── auth/
│       └── UserLayout.tsx       # ❌ レイアウトをfeaturesに置かない
│
├── routes/
│   ├── _authenticated/          # ❌ 技術的条件でグループ化しない
│   ├── (user)/
│   │   ├── _layout.tsx          # ❌ _layout/ ディレクトリを使う
│   │   └── _shared/             # ❌ ロールレベルの_shared/は使わない
│   │       └── Header.tsx
│   └── todos/
│       └── route.tsx
```

## 関連ドキュメント

- `20-colocation-patterns.md`: コロケーションの実装パターン
- `30-shared-placement.md`: 共通化の配置基準
- `40-test-patterns.md`: ルートテスト（SS）
- `../logger/10-logger-overview.md`: ログ出力基盤（ルートでのログ実装必須）
