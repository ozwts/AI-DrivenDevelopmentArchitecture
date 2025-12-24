# コロケーションパターン

## 概要

関連するコードを同一ディレクトリに配置し、データフローをディレクトリ内で完結させる。

**根拠となる憲法**:
- `module-cohesion-principles.md`: 原則1「ディレクトリ = 機能境界」
- `analyzability-principles.md`: 影響範囲の静的追跡

## ルート内のファイル構成

単一ルート（子ルートなし）の基本構成。子ルートがある場合は「実践パターン②: Outletによるネスト」を参照。

```
app/routes/({role})/{feature}/
├── route.tsx            # ルートコンポーネント（エントリーポイント）
├── route.ss.test.ts     # スナップショットテスト（route.tsxに対応）
├── _layout/             # 機能固有レイアウト（必要な場合のみ）
│   └── layout.tsx
├── components/          # ルート固有コンポーネント
│   ├── {Feature}List.tsx
│   ├── {Feature}List.ct.test.tsx  # コンポーネントテスト
│   └── {Feature}Item.tsx
└── hooks/               # ルート固有フック
    └── use{Feature}.ts
```

## 機能固有レイアウト（`{feature}/_layout/`）

### 配置の判断基準

| 条件 | `_layout/` を置く？ |
|------|-------------------|
| 親レイアウトと異なるシェルが必要 | ✅ Yes |
| 親レイアウトをそのまま使う | ❌ No |

### 典型例

**`_layout/` が必要なケース**: 認証ページ
```
(user)/
├── _layout/              # アプリ用（Header + Sidebar）
├── auth/
│   ├── _layout/          # 認証用（シンプルな中央配置）
│   ├── route.tsx         # /auth（ログイン）
│   └── signup/
└── todos/                # 親の _layout/ を使用
    └── route.tsx
```

認証ページはアプリのヘッダー・サイドバーが不要なため、専用の `_layout/` を持つ。

**`_layout/` が不要なケース**: 通常機能
```
(user)/
├── _layout/              # アプリ用（Header + Sidebar）
├── todos/                # 親の _layout/ を使用
│   ├── route.tsx
│   └── [todoId]/
└── projects/             # 親の _layout/ を使用
    └── route.tsx
```

通常機能は親の `_layout/` で十分なため、機能固有の `_layout/` は不要。

## コロケーションの判断基準

**ルート内に配置する**:
- そのルートでのみ使用するコンポーネント
- そのルートでのみ使用するフック
- そのルートでのみ使用するユーティリティ
- そのルートのテスト

**ルート外に配置する（後述の共通化パターン）**:
- 複数ルートで使用するコード（3回ルール適用）

---

## 実践パターン①: 作成（new）と編集（edit）の分離

たとえUIコンポーネント（フォーム）が同じでも、責務が異なるためルートは分割する。共通フォームは親の`_shared/`ディレクトリに配置し、各ルートから利用する。

**根拠となる憲法**:
- `module-cohesion-principles.md`: 原則3「責務が異なれば分離する」

### ディレクトリ構造

```
app/routes/({role})/{feature}/
├── _shared/
│   └── components/
│       ├── {Feature}Form.tsx        # ← 共通フォーム
│       └── {Feature}Form.ct.test.tsx
│
├── route.tsx                   # 一覧
├── route.ss.test.ts
├── new/
│   ├── route.tsx               # ← 新規作成
│   └── route.ss.test.ts
│
└── [param]/
    ├── route.tsx               # ← 親: データ取得 + Outlet
    ├── _index/
    │   ├── route.tsx           # ← 子: 詳細表示
    │   └── route.ss.test.ts
    └── edit/
        ├── route.tsx           # ← 子: 編集フォーム
        └── route.ss.test.ts
```

### 共通フォームコンポーネント

作成と編集で共通フォームを使用する場合、編集時は `dirtyFields` を `onSubmit` コールバックに渡す。

**参照**: `../api/20-request-normalization.md`（パターン詳細とコード例）

### Do / Don't

**Do**: 責務ごとにルートを分離、共通UIは`_shared/`に配置
```
{feature}/
├── _shared/components/{Feature}Form.tsx  # 共通UI
├── new/route.tsx                          # 作成の責務
└── [param]/edit/route.tsx                 # 編集の責務
```

**Don't**: 作成と編集を1つのルートで処理
```typescript
function {Feature}FormPage({ mode }: { mode: "new" | "edit" }) {
  // modeによる条件分岐が増殖...
}
```

---

## 実践パターン②: Outletによるネスト（親子データ共有）

親ルートで共通のデータを取得し、共通のレイアウト（ヘッダー、ナビゲーション等）を定義する。子ルートは自身の機能とデータ取得に集中できる。

**根拠となる憲法**:
- `module-cohesion-principles.md`: 原則1「ディレクトリ = 機能境界」、原則4「共通化は最も近い共通の親に配置」
- `analyzability-principles.md`: 影響範囲の静的追跡（型付きContextで依存を明示）

### いつ使うか（判断基準）

| 条件 | Outletパターンを使う？ |
|------|----------------------|
| 詳細・編集など複数の子ルートがある | ✅ Yes |
| 子ルート間で同じデータを参照する | ✅ Yes |
| 子ルート間で共通のレイアウトがある | ✅ Yes |
| 単一ルートで子ルートがない | ❌ No |

### 親ルートの3つの責務

1. **共通データ取得**: 子ルート間で共有するデータを一度だけ取得
2. **共通レイアウト**: 戻るボタン、コンテナ等の共通UIを提供
3. **子ルートへの委譲**: `<Outlet context={...} />` で子にデータを渡す

### ディレクトリ構造

```
app/routes/({role})/{feature}/[param]/
├── route.tsx              # 親ルート（共通データ取得 + 共通レイアウト + Outlet）
├── _index/
│   ├── route.tsx          # 詳細表示（デフォルト）
│   └── route.ss.test.ts   # 詳細ページのスナップショットテスト
├── {subFeatureA}/
│   ├── route.tsx          # サブ機能A
│   └── route.ss.test.ts   # サブ機能Aのスナップショットテスト
└── edit/
    ├── route.tsx          # 編集フォーム
    └── route.ss.test.ts   # 編集ページのスナップショットテスト
```

**テスト配置の原則**: 各`route.tsx`のテストは同一ディレクトリに配置する。親ルート（`[param]/route.tsx`）は共通レイアウトとOutletのみのため、通常テスト不要。

### 親ルート（共通レイアウト + Outlet）

親ルートで共通のヘッダーやナビゲーションを定義し、子ルートコンポーネントが`<Outlet />`にレンダリングされる。

```typescript
// app/routes/({role})/{feature}/[param]/route.tsx
export type {Feature}OutletContext = {
  {feature}: {Feature}Response;
};

export default function {Feature}Layout() {
  const { {param} } = useParams();
  const { data, isLoading, error } = use{Feature}({param}!);

  if (isLoading) return <LoadingPage />;
  if (error || !data) return <Alert variant="error">データが見つかりません</Alert>;

  return (
    <>
      <{Feature}Header data={data} />
      <NavigationTabs />
      <Outlet context={{ {feature}: data } satisfies {Feature}OutletContext} />
    </>
  );
}
```

### 子ルート

子ルートは`useOutletContext`で親のデータを受け取り、自身の機能に集中する。

```typescript
// app/routes/({role})/{feature}/[param]/_index/route.tsx
import type { {Feature}OutletContext } from "../route";

export default function {Feature}DetailRoute() {
  const { {feature} } = useOutletContext<{Feature}OutletContext>();
  return <{Feature}Detail data={{feature}} />;
}
```

### OutletContext型のパターン

親ルートで型をexportし、子ルートでimportして使用する。

```typescript
// 親ルート: 型をexportする
export type {Feature}OutletContext = {
  {feature}: {Feature}Response;
  // 必要に応じてヘルパー関数も含める
  getRelatedById: (id?: string) => Related | undefined;
};

// 子ルート: 型をimportして使用
import type { {Feature}OutletContext } from "../route";
const { {feature} } = useOutletContext<{Feature}OutletContext>();
```

**型定義の効果**:
- 子ルートがどのデータに依存しているか静的に追跡可能
- データ構造変更時に影響範囲がコンパイルエラーで明示

### Do / Don't

**Do**: 親で共通レイアウト + データ取得、子はOutlet contextで受け取る
```typescript
// 親: 共通レイアウト
<{Feature}Header />
<NavigationTabs />
<Outlet context={{ {feature} }} />

// 子: 自身の機能に集中
const { {feature} } = useOutletContext<{Feature}OutletContext>();
```

**Don't**: 親子で同じデータを重複取得
```typescript
// 親ルート
const { data } = use{Feature}({param});

// 子ルート
const { data } = use{Feature}({param}); // 重複！
```

---

## データフローの閉塞

ルート内でデータフローが完結するように設計する。

```
route.tsx（データ取得）
    ↓ Outlet context
_index/route.tsx（詳細表示）
edit/route.tsx（編集フォーム）
    ↓ mutation
route.tsx（データ再取得 → 自動更新）
```

**効果**:
- 影響範囲がディレクトリ構造から明確
- AIが機能を理解するために必要なコンテキストが局所化
- 並行開発時のコンフリクトを構造的に回避

---

## 例外対応: ルートで分割できない場合の機能的凝集

単一リスト内で多様な要素を出し分けるケースでは、ルート分割ができない。このような場合は`ts-pattern`を用いて、各ケースの処理を`.with()`ブロック内に閉じ込める。

**根拠となる憲法**:
- `module-cohesion-principles.md`: 原則5「分割できない場合の機能的凝集」

### パターンマッチによる分離

```typescript
import { match } from "ts-pattern";

export function {Feature}Item({ item }: Props) {
  return match(item)
    .with({ type: "{typeA}" }, (data) => <{TypeA}Component data={data} />)
    .with({ type: "{typeB}" }, (data) => <{TypeB}Component data={data} />)
    .with({ type: "{typeC}" }, (data) => <{TypeC}Component data={data} />)
    .exhaustive();  // コンパイル時の網羅性チェック
}
```

**効果**:
- 各タイプの処理が`.with()`ブロック内に閉じる
- `.exhaustive()`によるコンパイル時の網羅性チェック
- 新しいタイプ追加時に対応漏れを防止

## 関連ドキュメント

- `10-route-overview.md`: ルート設計概要
- `15-role-design.md`: ロール設計（WHO）
- `30-shared-placement.md`: 配置基準（WHERE）
- `../component/10-component-overview.md`: コンポーネント設計
- `../hooks/10-hooks-overview.md`: カスタムフック設計
- `../api/20-request-normalization.md`: PATCHリクエスト正規化（dirtyFields）
- `../form/10-form-overview.md`: フォーム設計概要
