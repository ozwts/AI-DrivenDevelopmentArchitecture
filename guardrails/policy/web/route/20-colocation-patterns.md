# コロケーションパターン

## 概要

関連するコードを同一ディレクトリに配置し、データフローをディレクトリ内で完結させる。

**根拠となる憲法**:
- `module-cohesion-principles.md`: 原則1「ディレクトリ = 機能境界」
- `analyzability-principles.md`: 影響範囲の静的追跡

## ルート内のファイル構成

```
app/routes/{feature}+/
├── route.tsx            # ルートコンポーネント（エントリーポイント）
├── loader.ts            # データ取得（オプション）
├── action.ts            # データ更新（オプション）
├── components/          # ルート固有コンポーネント
│   ├── feature-list.tsx
│   └── feature-item.tsx
├── hooks/               # ルート固有フック
│   └── use-feature.ts
└── {feature}.test.tsx   # テスト
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

## 実践パターン①: ロールによる分割

レイアウトルート（`_buyer+`, `_seller+`, `_admin+`）でユーザー体験を完全に分離する。各ルート内にはそのロールに必要な機能だけを実装する。

**根拠となる憲法**:
- `module-cohesion-principles.md`: 原則2「ロール・コンテキストによる構造的分離」

### ディレクトリ構造

```
app/routes/
├── _buyer+/                   # 購入者向けレイアウト
│   └── products+/
│       └── $productId+/
│           └── route.tsx      # 購入者の機能のみ
│
├── _seller+/                  # 出品者向けレイアウト
│   └── products+/
│       └── $productId+/
│           └── route.tsx      # 出品者の機能のみ
│
└── _admin+/                   # 管理者向けレイアウト
    └── ...
```

### 購入者向けルート

```typescript
// app/routes/_buyer+/products+/$productId+/route.tsx
export async function loader({ params }: LoaderFunctionArgs) {
  // 購入者向けのデータ取得
  return { product: await getProductForBuyer(params.productId) };
}

// actionは存在しない（購入者は商品を編集できない）
```

### 出品者向けルート

```typescript
// app/routes/_seller+/products+/$productId+/route.tsx
export async function loader({ params }: LoaderFunctionArgs) {
  // 出品者向けのデータ取得（在庫情報等を含む）
  return { product: await getProductForSeller(params.productId) };
}

export async function action({ request }: ActionFunctionArgs) {
  // 在庫更新などの出品者向け処理
  const formData = await request.formData();
  await updateProductStock(formData);
  return redirect(".");
}
```

### Do / Don't

**Do**: ロールごとにディレクトリを分離
```
app/routes/
├── _buyer+/products+/     # 購入者の機能のみ
└── _seller+/products+/    # 出品者の機能のみ
```

**Don't**: 条件分岐によるロール分離（論理的凝集）
```typescript
function ProductPage({ role }: { role: "buyer" | "seller" }) {
  return (
    <>
      {role === "buyer" && <PurchaseButton />}
      {role === "seller" && <StockEditor />}
      {/* さらに条件分岐が増えていく... */}
    </>
  );
}
```

---

## 実践パターン②: 作成（new）と編集（edit）の分離

たとえUIコンポーネント（フォーム）が同じでも、責務が異なるためルートは分割する。共通フォームは親の`_shared/`ディレクトリに配置し、各ルートから利用する。

**根拠となる憲法**:
- `module-cohesion-principles.md`: 原則3「責務が異なれば分離する」

### ディレクトリ構造

```
app/routes/products+/
├── _shared/
│   └── components/
│       └── product-form.tsx   # ← 共通フォーム
│
├── new+/
│   └── route.tsx              # ← actionのみ（新規作成）
│
└── $productId+/
    └── edit+/
        └── route.tsx          # ← loader + action（編集）
```

### 共通フォームコンポーネント

```typescript
// app/routes/products+/_shared/components/product-form.tsx
import type { ProductResponse } from "@/generated/zod-schemas";

type Props = {
  readonly defaultValues?: ProductResponse;
};

export function ProductForm({ defaultValues }: Props) {
  return (
    <Form method="post">
      <input
        name="title"
        defaultValue={defaultValues?.title}
        required
      />
      <textarea
        name="description"
        defaultValue={defaultValues?.description}
      />
      <button type="submit">
        {defaultValues ? "更新" : "作成"}
      </button>
    </Form>
  );
}
```

### 新規作成ルート（actionのみ）

```typescript
// app/routes/products+/new+/route.tsx
import { ProductForm } from "../_shared/components/product-form";

// loaderは不要（初期値がない）

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const product = await createProduct(formData);
  return redirect(`/products/${product.id}`);
}

export default function NewProductPage() {
  return (
    <div>
      <h1>商品を作成</h1>
      <ProductForm />
    </div>
  );
}
```

### 編集ルート（loader + action）

```typescript
// app/routes/products+/$productId+/edit+/route.tsx
import { ProductForm } from "../../_shared/components/product-form";

export async function loader({ params }: LoaderFunctionArgs) {
  const product = await getProduct(params.productId);
  if (!product) throw new Response("Not Found", { status: 404 });
  return { product };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  await updateProduct(params.productId, formData);
  return redirect(`/products/${params.productId}`);
}

export default function EditProductPage() {
  const { product } = useLoaderData<typeof loader>();
  return (
    <div>
      <h1>商品を編集</h1>
      <ProductForm defaultValues={product} />
    </div>
  );
}
```

### Do / Don't

**Do**: 責務ごとにルートを分離、共通UIは`_shared/`に配置
```
products+/
├── _shared/components/product-form.tsx  # 共通UI
├── new+/route.tsx                        # 作成の責務
└── $productId+/edit+/route.tsx          # 編集の責務
```

**Don't**: 作成と編集を1つのルートで処理
```typescript
function ProductFormPage({ mode }: { mode: "new" | "edit" }) {
  // modeによる条件分岐が増殖...
  const product = mode === "edit" ? await getProduct(id) : null;
  // ...
}
```

---

## 実践パターン③: Outletによるネスト

親ルートで共通のデータ（例：商品情報）を取得し、共通のレイアウトを定義する。子ルート（詳細、レビュー、編集フォーム）は自身の機能とデータ取得に集中できる。

### ディレクトリ構造

```
app/routes/products+/$productId+/
├── route.tsx              # 親ルート（レイアウト）
├── _index/
│   └── route.tsx          # 詳細タブ（デフォルト）
├── reviews+/
│   └── route.tsx          # レビュータブ
└── edit+/
    └── route.tsx          # 編集タブ
```

### 親ルート（レイアウト）

```typescript
// app/routes/products+/$productId+/route.tsx
import { Outlet, NavLink } from "react-router";

export async function loader({ params }: LoaderFunctionArgs) {
  // 共通データを取得
  const product = await getProduct(params.productId);
  if (!product) throw new Response("Not Found", { status: 404 });
  return { product };
}

export default function ProductLayout() {
  const { product } = useLoaderData<typeof loader>();

  return (
    <>
      {/* 共通ヘッダー */}
      <ProductHeader product={product} />

      {/* ナビゲーションタブ */}
      <nav>
        <NavLink to="." end>詳細</NavLink>
        <NavLink to="reviews">レビュー</NavLink>
        <NavLink to="edit">編集</NavLink>
      </nav>

      {/* 子ルートがここにレンダリングされる */}
      <Outlet />
    </>
  );
}
```

### 子ルート（詳細タブ）

```typescript
// app/routes/products+/$productId+/_index/route.tsx
import { useRouteLoaderData } from "react-router";

export default function ProductDetailPage() {
  // 親ルートのデータを参照
  const { product } = useRouteLoaderData("routes/products+/$productId+/route");

  return (
    <div>
      <p>{product.description}</p>
      <p>価格: {product.price}円</p>
    </div>
  );
}
```

### 子ルート（レビュータブ）

```typescript
// app/routes/products+/$productId+/reviews+/route.tsx

export async function loader({ params }: LoaderFunctionArgs) {
  // このタブ固有のデータを取得
  const reviews = await getProductReviews(params.productId);
  return { reviews };
}

export default function ProductReviewsPage() {
  const { reviews } = useLoaderData<typeof loader>();

  return (
    <ul>
      {reviews.map((review) => (
        <li key={review.id}>{review.comment}</li>
      ))}
    </ul>
  );
}
```

### Outletの効果

```
┌─────────────────────────────────────────┐
│ Product Header                          │  ← 親ルートで定義
├─────────────────────────────────────────┤
│ [詳細] [レビュー] [編集]                │  ← 親ルートで定義
├─────────────────────────────────────────┤
│                                         │
│           <Outlet />                    │  ← 子ルートがレンダリング
│                                         │
└─────────────────────────────────────────┘
```

**効果**:
- 親ルートで共通データを1回だけ取得
- 子ルートは自身の機能に集中できる
- タブ切り替え時に共通部分は再レンダリングされない

---

## データフローの閉塞

ルート内でデータフローが完結するように設計する。

```
route.tsx（loader）
    ↓ データ取得
components/feature-list.tsx
    ↓ ユーザー操作
route.tsx（action）
    ↓ データ更新
```

**効果**:
- 影響範囲がディレクトリ構造から明確
- AIが機能を理解するために必要なコンテキストが局所化
- 並行開発時のコンフリクトを構造的に回避

**根拠となる憲法**:
- `distributed-collaboration-principles.md`: 独立性の確保

---

## 例外対応: ルートで分割できない場合の機能的凝集

単一リスト内で多様な要素を出し分けるケース（通知一覧など）では、ルート分割ができない。このような場合は`ts-pattern`を用いて、各ケースの処理を分離する。

**根拠となる憲法**:
- `module-cohesion-principles.md`: 原則5「分割できない場合の機能的凝集」

### パターンマッチによる分離

```typescript
// app/routes/notifications+/components/notification-item.tsx
import { match } from "ts-pattern";
import type { Notification } from "@/generated/zod-schemas";

type Props = {
  readonly notification: Notification;
};

export function NotificationItem({ notification }: Props) {
  return match(notification)
    .with({ type: "order_completed" }, (n) => <OrderNotification data={n} />)
    .with({ type: "review_posted" }, (n) => <ReviewNotification data={n} />)
    .with({ type: "stock_alert" }, (n) => <StockNotification data={n} />)
    .exhaustive();
}
```

### 効果

- **処理の局所化**: 各通知タイプの処理が`.with()`ブロック内に閉じる
- **網羅性の保証**: `.exhaustive()`によるコンパイル時の網羅性チェック
- **型安全**: 新しい通知タイプが追加されると、コンパイルエラーで検出

### 各タイプのコンポーネント

```typescript
// app/routes/notifications+/components/order-notification.tsx
type Props = {
  readonly data: OrderCompletedNotification;
};

export function OrderNotification({ data }: Props) {
  return (
    <div>
      <span>注文完了</span>
      <p>注文番号: {data.orderId}</p>
    </div>
  );
}
```

### ディレクトリ構造

```
app/routes/notifications+/
├── route.tsx
└── components/
    ├── notification-item.tsx       # パターンマッチで振り分け
    ├── order-notification.tsx      # 注文完了
    ├── review-notification.tsx     # レビュー投稿
    └── stock-notification.tsx      # 在庫アラート
```

### Do / Don't

**Do**: パターンマッチで各ケースを分離
```typescript
match(notification)
  .with({ type: "order_completed" }, (n) => <OrderNotification data={n} />)
  .with({ type: "review_posted" }, (n) => <ReviewNotification data={n} />)
  .exhaustive();
```

**Don't**: if/elseの連鎖
```typescript
function NotificationItem({ notification }) {
  if (notification.type === "order_completed") {
    return <div>...</div>;
  } else if (notification.type === "review_posted") {
    return <div>...</div>;
  }
  // 新しいタイプを追加し忘れても気づかない
}
```

## 関連ドキュメント

- `10-route-overview.md`: ルート設計概要
- `30-shared-placement.md`: 共通化の配置基準
- `../component/10-component-overview.md`: コンポーネント設計
