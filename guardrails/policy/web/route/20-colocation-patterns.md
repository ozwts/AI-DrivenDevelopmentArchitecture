# コロケーションパターン

## 概要

関連するコードを同一ディレクトリに配置し、データフローをディレクトリ内で完結させる。

**根拠となる憲法**:
- `module-cohesion-principles.md`: 原則1「ディレクトリ = 機能境界」
- `analyzability-principles.md`: 影響範囲の静的追跡

## ルート内のファイル構成

```
app/routes/({role})/{feature}/
├── route.tsx            # ルートコンポーネント（エントリーポイント）
├── route.ss.test.ts     # スナップショットテスト（route.tsxに対応）
├── components/          # ルート固有コンポーネント
│   ├── {Feature}List.tsx
│   ├── {Feature}List.ct.test.tsx  # コンポーネントテスト
│   └── {Feature}Item.tsx
└── hooks/               # ルート固有フック
    └── use{Feature}.ts
```

## コロケーションの判断基準

**ルート内に配置する**:
- そのルートでのみ使用するコンポーネント
- そのルートでのみ使用するフック
- そのルートでのみ使用するユーティリティ
- そのルートのテスト

**ルート外に配置する（後述の共通化パターン）**:
- 複数ルートで使用するコード（3回ルール適用）

---

## 実践パターン①: ロールによる分離

ロールディレクトリ（`({role})/`）でユーザー体験を完全に分離する。各ルート内にはそのロールに必要な機能だけを実装する。

**根拠となる憲法**:
- `module-cohesion-principles.md`: 原則2「ロール・コンテキストによる構造的分離」

### ディレクトリ構造

```
app/routes/
├── ({roleA})/              # ロールAのルート
│   ├── _layout/            # レイアウト + 専用コンポーネント
│   │   ├── index.tsx       # レイアウト本体
│   │   └── Header.tsx      # レイアウト専用コンポーネント
│   └── {feature}/
│       └── route.tsx       # ロールA向けのデータ取得・処理
│
└── ({roleB})/              # ロールBのルート
    ├── _layout/            # レイアウト + 専用コンポーネント
    │   ├── index.tsx       # レイアウト本体
    │   └── Sidebar.tsx     # レイアウト専用コンポーネント
    └── {feature}/
        └── route.tsx       # ロールB向けのデータ取得・処理
```

### ロール別の責務分離

各ロールに必要な機能（データ取得/更新処理）だけを実装する。

```typescript
// ({roleA})/{feature}/route.tsx
// ロールA: 参照のみ（データ取得のみ）
export function useRoleAFeature() {
  return useQuery({ /* ロールA向けのデータ取得 */ });
}

// ({roleB})/{feature}/route.tsx
// ロールB: 参照 + 更新（データ取得 + 更新処理）
export function useRoleBFeature() {
  return useQuery({ /* ロールB向けのデータ取得 */ });
}
export function useRoleBMutation() {
  return useMutation({ /* ロールB向けの更新処理 */ });
}
```

### Do / Don't

**Do**: ロールは物理グループ化、各ロールに必要な機能のみ実装
```
routes/
├── ({roleA})/{feature}/route.tsx  # ロールA向け機能のみ
└── ({roleB})/{feature}/route.tsx  # ロールB向け機能のみ
```

**Don't**: 技術的条件で物理グループ化
```
routes/
├── _authenticated/                 # ❌ 技術的条件はロールではない
│   └── {feature}/
```

---

## 実践パターン②: 作成（new）と編集（edit）の分離

たとえUIコンポーネント（フォーム）が同じでも、責務が異なるためルートは分割する。共通フォームは親の`_shared/`ディレクトリに配置し、各ルートから利用する。

**根拠となる憲法**:
- `module-cohesion-principles.md`: 原則3「責務が異なれば分離する」

### ディレクトリ構造

```
app/routes/({role})/{feature}/
├── _shared/
│   └── components/
│       └── {Feature}Form.tsx   # ← 共通フォーム
│
├── route.tsx                   # 一覧
├── new/
│   └── route.tsx               # ← 新規作成
│
└── [param]/
    ├── route.tsx               # ← 親: データ取得 + Outlet
    ├── _index/
    │   └── route.tsx           # ← 子: 詳細表示
    └── edit/
        └── route.tsx           # ← 子: 編集フォーム
```

### 共通フォームコンポーネント

```typescript
// app/routes/({role})/{feature}/_shared/components/{Feature}Form.tsx
type Props = {
  readonly defaultValues?: {Feature}Response;
  readonly onSubmit: (data: {Feature}FormData) => void;
  readonly onCancel: () => void;
  readonly isLoading?: boolean;
};

export function {Feature}Form({ defaultValues, onSubmit, onCancel, isLoading }: Props) {
  // フォームUIのみ（データ取得・更新は呼び出し元の責務）
}
```

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

## 実践パターン③: Outletによるネスト（親子データ共有）

親ルートで共通のデータを取得し、共通のレイアウト（ヘッダー、ナビゲーション等）を定義する。子ルートは自身の機能とデータ取得に集中できる。

**根拠となる憲法**:
- `module-cohesion-principles.md`: 原則1「ディレクトリ = 機能境界」

### ディレクトリ構造

```
app/routes/({role})/{feature}/[param]/
├── route.tsx              # 親ルート（共通データ取得 + 共通レイアウト + Outlet）
├── _index/
│   └── route.tsx          # 詳細表示（デフォルト）
├── {subFeatureA}/
│   └── route.tsx          # サブ機能A
└── edit/
    └── route.tsx          # 編集フォーム
```

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
export default function {Feature}DetailRoute() {
  const { {feature} } = useOutletContext<{Feature}OutletContext>();
  return <{Feature}Detail data={{feature}} />;
}
```

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
- `30-shared-placement.md`: 共通化の配置基準
- `../component/10-component-overview.md`: コンポーネント設計
