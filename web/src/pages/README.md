# Pages 実装方針・設計思想

## 核心原則

1. **ページ = ビジネスロジックの集約点**

   - データ取得、状態管理、エラーハンドリング、ユーザーインタラクションを一元管理

2. **Colocation（関連するものを近くに配置）**

   - ページ専用のコンポーネントは、そのページディレクトリ内に配置
   - 変更の影響範囲を局所化

3. **責務の明確な分離**

   - Pages: ビジネスロジック統合とオーケストレーション
   - Components: 汎用的なUI部品（ビジネスロジック不要）
   - Hooks: API通信と状態管理
   - API Client: HTTP通信の抽象化

4. **テスタビリティ最優先** ⭐

   - **全てのページ固有コンポーネントは独立してテスト可能でなければならない**
   - ページから積極的に機能を切り出す
   - 各ページ固有コンポーネントには必ずコンポーネントテスト（\*.ct.test.tsx）を作成

5. **セキュリティ最優先** 🔒
   - **ユーザー入力は必ずサニタイズ**
   - **dangerouslySetInnerHTML の使用禁止**
   - **認証トークン管理**: Cognito/Amplifyの制約によりlocalStorageを使用（やむを得ない）
   - XSS、インジェクション攻撃を常に意識

---

## ディレクトリ構造パターン

### 最小構成（シンプルなページ）

```
pages/{Feature}Page/
├── {Feature}Page.tsx         # ページコンポーネント（必須）
├── {Feature}Page.ss.test.ts  # スナップショットテスト（必須）
└── index.ts                  # 再エクスポート（必須）
```

### 標準構成（CRUD機能）

```
pages/{Feature}Page/
├── {Feature}Page.tsx
├── {Feature}Card.tsx         # 一覧表示
├── {Feature}Card.ct.test.tsx # Cardテスト（必須）
├── {Feature}Form.tsx         # 入力フォーム
├── {Feature}Form.ct.test.tsx # Formテスト（必須）
├── {Feature}Page.ss.test.ts
└── index.ts
```

### 拡張構成（複雑な機能）

```
pages/{Feature}Page/
├── {Feature}Page.tsx
├── {Feature}Card.tsx
├── {Feature}Card.ct.test.tsx
├── {Feature}Form.tsx
├── {Feature}Form.ct.test.tsx
├── {SubFeature}.tsx          # その他ページ固有コンポーネント
├── {SubFeature}.ct.test.tsx  # テスト（必須）
├── {Feature}Page.ss.test.ts
└── index.ts
```

### 命名規則

| ファイルタイプ       | 命名                        | 必須                          |
| -------------------- | --------------------------- | ----------------------------- |
| ページ               | `{Feature}Page.tsx`         | ✅                            |
| Card                 | `{Feature}Card.tsx`         | -                             |
| Card テスト          | `{Feature}Card.ct.test.tsx` | ✅ (Cardがある場合)           |
| Form                 | `{Feature}Form.tsx`         | -                             |
| Form テスト          | `{Feature}Form.ct.test.tsx` | ✅ (Formがある場合)           |
| その他コンポーネント | `{SubFeature}.tsx`          | -                             |
| その他テスト         | `{SubFeature}.ct.test.tsx`  | ✅ (コンポーネントがある場合) |
| スナップショット     | `{Feature}Page.ss.test.ts`  | ✅                            |
| エントリーポイント   | `index.ts`                  | ✅                            |

**ルール**: 全てのページ固有コンポーネント（Card、Form、その他）には、必ず対応するコンポーネントテストを作成

---

## 責務と役割分担

### 1. ページコンポーネント（`*Page.tsx`）

**役割**: オーケストレーター

**責務**:

- カスタムHooksでのデータ取得・更新
- UI状態管理（モーダル、フィルタ、選択状態）
- CRUD操作のイベントハンドリング
- エラーハンドリングとトースト通知
- ローディング・エラー状態の制御
- 子コンポーネントへのデータ・コールバック受け渡し

**構造**:

```typescript
export const {Feature}Page = () => {
  // 1. Hooks（データ取得）
  const { data, isLoading, error } = use{Feature}();
  // 2. Mutations（データ更新）
  const create = useCreate{Feature}();
  // 3. ローカル状態
  const [isModalOpen, setIsModalOpen] = useState(false);
  // 4. コンテキスト
  const toast = useToast();
  // 5. イベントハンドラ
  const handleCreate = async (data) => { /* CRUD + 通知 */ };
  // 6. ローディング・エラー処理
  if (isLoading) return <LoadingPage />;
  if (error) return <Alert variant="error">...</Alert>;
  // 7. UI構成
  return <div>{/* レイアウト、リスト、モーダル */}</div>;
};
```

### 2. ページ固有コンポーネント

#### Card（`*Card.tsx`）

**責務**: データ表示とユーザーインタラクション

- データの視覚的表現
- プレゼンテーションロジック（期限切れ判定、ステータス変換）
- イベントの親への委譲

**Props パターン**:

```typescript
interface {Feature}CardProps {
  item: {Feature}Response;      // 表示データ
  relatedData?: RelatedData;    // 関連データ
  onEdit: (item) => void;       // コールバック
  onDelete: (item) => void;
}
```

#### Form（`*Form.tsx`）

**責務**: データ入力とバリデーション

- フォーム状態管理（react-hook-form）
- バリデーション（Zodスキーマ）
- ファイル選択などのフォーム専用UI状態
- エラーメッセージ表示
- フォーム送信イベントの親への委譲

**Props パターン**:

```typescript
interface {Feature}FormProps {
  item?: {Feature}Response;     // 編集時の初期値
  onSubmit: (data) => void;     // 送信コールバック
  onCancel: () => void;
  isLoading?: boolean;
}
```

#### その他のページ固有コンポーネント

**責務**: 特定機能の完結したUI実装

- 独自のAPI通信（必要に応じてHooks使用）
- 複雑なロジックのカプセル化

---

## Components との関係

### 役割の違い

| 観点             | pages/               | components/          |
| ---------------- | -------------------- | -------------------- |
| 配置基準         | ページ固有           | 汎用的・再利用可能   |
| ビジネスロジック | 含む（ドメイン知識） | 含まない（純粋なUI） |
| データソース     | Hooks、API Client    | Props経由のみ        |
| 依存関係         | components/を使用    | 他への依存なし       |

### 判断基準

**pages/ に配置**:

- ✅ 特定ページでのみ使用
- ✅ ドメイン知識を含む
- ✅ APIデータの表示・操作
- ✅ ビジネスロジック（バリデーション、計算）

**components/ に配置**:

- ✅ 複数ページで再利用
- ✅ ドメイン知識を含まない
- ✅ Propsのみでデータ受け取り
- ✅ ビジネスロジックを持たない

---

## データフローとアーキテクチャ

```
┌─────────────────────────────────────┐
│ Pages (オーケストレーター)           │
│ - Hooksでデータ取得                  │
│ - ローカル状態管理                   │
│ - イベントハンドリング               │
│  ↓ Props     ↑ Callbacks            │
│ ┌─────────┐  ┌─────────┐           │
│ │Card表示 │  │Form入力 │           │
│ └─────────┘  └─────────┘           │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Components（汎用UI部品）             │
│ Button, Input, Card, Modal, Alert   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Hooks（API通信・状態管理）           │
│ - React Query キャッシュ管理        │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ API Client（HTTP通信）               │
│ - Fetch ラッパー + Zod型安全         │
└─────────────────────────────────────┘
```

**データフローの方向**:

1. Top-down: Props でデータを渡す
2. Bottom-up: Callbacks でイベントを通知
3. API通信: Hooks → API Client → サーバー

---

## 型安全性の確保

### スキーマ駆動開発フロー

```
OpenAPI仕様 (openapi.yaml)
    ↓ codegen
Zod スキーマ (generated/zod-schemas.ts)
    ↓ z.infer
TypeScript型
    ↓ zodResolver
react-hook-form バリデーション
```

### 1. OpenAPI → Zod スキーマ生成

OpenAPI仕様から自動生成されたZodスキーマを使用：

```typescript
// generated/zod-schemas.ts（自動生成）
export const schemas = {
  TodoResponse: z.object({
    id: z.string(),
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
    // ...
  }),
  RegisterTodoParams: z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    // ...
  }),
};
```

**重要**: スキーマは手動編集しない。OpenAPI仕様を修正してから再生成する。

### 2. 型生成（z.infer）

Zodスキーマから型を生成：

```typescript
import { z } from "zod";
import { schemas } from "../../generated/zod-schemas";

// レスポンス型
type {Feature}Response = z.infer<typeof schemas.{Feature}Response>;

// リクエストパラメータ型
type Register{Feature}Params = z.infer<typeof schemas.Register{Feature}Params>;
type Update{Feature}Params = z.infer<typeof schemas.Update{Feature}Params>;

// Props で使用
interface {Feature}CardProps {
  item: {Feature}Response;  // ← Zodスキーマから生成
  onEdit: (item: {Feature}Response) => void;
}
```

### 3. zodResolver（react-hook-form統合）

Formコンポーネントでバリデーションに使用：

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { schemas } from "../../generated/zod-schemas";

export const {Feature}Form = ({ item, onSubmit }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    // Zodスキーマでバリデーション
    resolver: zodResolver(schemas.Register{Feature}Params),
    defaultValues: item || {
      title: "",
      description: "",
      // ...
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        {...register("title")}
        error={errors.title?.message}  // ← Zodエラーメッセージ
      />
      <Button type="submit">送信</Button>
    </form>
  );
};
```

**zodResolverの役割**:

- フォーム送信時にZodスキーマでバリデーション
- バリデーションエラーをreact-hook-formのエラー形式に変換
- OpenAPI仕様と完全に一致したバリデーションを保証

### メリット

1. **単一の真実の源（OpenAPI仕様）**

   - バックエンドとフロントエンドで同じスキーマ定義
   - 型の不一致を防止

2. **自動バリデーション**

   - zodResolverがランタイムバリデーションを自動実行
   - 手動でバリデーションロジックを書く必要なし

3. **型安全性**
   - コンパイル時に型チェック
   - エディタの補完とエラー検出

---

## セキュリティ原則

フロントエンドセキュリティの基本を遵守。以下の原則は**必須**。

### 1. 入力検証（必須）

**Zodスキーマで全て検証**:

```typescript
// ✅ フォーム入力
const schema = z.object({
  title: z.string().min(1).max(200),
  email: z.string().email(),
});

// ✅ URLパラメータ
const id = z.string().uuid().parse(searchParams.get("id"));

// ✅ ファイルアップロード
const file = z.object({
  size: z.number().max(10 * 1024 * 1024), // 10MB
  type: z.enum(["image/png", "image/jpeg", "application/pdf"]),
});
```

### 2. XSS対策（必須）

```typescript
// ✅ Reactの自動エスケープに依存
<div>{userInput}</div>  // 安全

// ❌ 絶対禁止
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ マークダウン表示時のみDOMPurify使用
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(markdown) }} />

// ✅ 外部リンクにはrel属性を設定（tabnabbing防止）
<a href={externalUrl} target="_blank" rel="noopener noreferrer">
  リンク
</a>
```

### 3. 認証トークン管理

**現在のアーキテクチャ**:

- **認証方式**: Cognito（JWT）
- **トークン送信**: `Authorization: Bearer {token}` ヘッダー
- **保存場所**: localStorage（Amplify仕様、やむを得ない）
- **CSRF対策**: 不要（JWTはAuthorizationヘッダー、cookieではない）

**その他の機密情報**:

```typescript
// ❌ localStorageに保存禁止
localStorage.setItem("apiKey", secret);

// ✅ メモリ内管理、またはサーバー側で管理
```

**エラーメッセージ**:

```typescript
// ❌ 機密情報を含む
throw new Error(
  `User ${userId} does not have permission to access resource ${resourceId}`,
);

// ✅ 汎用的なメッセージ
throw new Error("アクセス権限がありません");
```

---

## アクセシビリティ原則

すべての操作をキーボードのみで完結可能にし、スクリーンリーダーに対応する。

### 1. キーボード操作とセマンティックHTML（必須）

```typescript
// ✅ ネイティブ要素を活用（自動でキーボード対応）
<button onClick={handleClick}>送信</button>
<a href="/path">リンク</a>

// ❌ div/spanでの擬似ボタン（キーボード操作不可）
<div onClick={handleClick}>送信</div>

// ✅ セマンティックHTML優先（role属性不要）
<button type="submit">送信</button>
<nav>...</nav>
<main>...</main>

// ✅ 明示的なrole属性
<div role="alert">エラーが発生しました</div>    // 即座に通知
<div role="status">保存しました</div>            // 穏やかな通知
```

**ARIA属性**:

```typescript
// aria-label: 視覚的ラベルがない場合
<button aria-label="削除"><TrashIcon /></button>

// aria-labelledby: 既存要素を参照
<div role="dialog" aria-labelledby="modal-title">
  <h2 id="modal-title">編集</h2>
</div>

// aria-describedby: 補足説明
<input aria-describedby="help" />
<p id="help">8文字以上</p>

// aria-live: 動的コンテンツの通知
<div role="status" aria-live="polite">{statusMessage}</div>
```

### 2. フォーカス管理（必須）

**モーダル・ダイアログ**:

```typescript
useEffect(() => {
  if (!isOpen) return;
  // 1. 最初の要素にフォーカス
  modalRef.current?.querySelector("button, input")?.focus();
  // 2. Escapeで閉じる
  const handleEscape = (e) => e.key === "Escape" && onClose();
  document.addEventListener("keydown", handleEscape);
  return () => document.removeEventListener("keydown", handleEscape);
  // 3. フォーカストラップ: focus-trap-react 推奨
}, [isOpen]);
```

**動的コンテンツ**:

```typescript
// 追加後にフォーカス移動
const handleAdd = async () => {
  const newItem = await createItem();
  document.getElementById(`item-${newItem.id}`)?.focus();
};

// 削除後に次の要素へフォーカス
const handleDelete = async (index) => {
  await deleteItem();
  const next = items[index + 1] || items[0];
  document.getElementById(`item-${next?.id}`)?.focus();
};
```

### 3. スクリーンリーダー対応

```typescript
// ✅ アイコンボタンにaria-label
<button aria-label="削除">
  <TrashIcon aria-hidden="true" />
</button>

// ✅ 装飾的なアイコンは非表示
<div>
  <CheckIcon aria-hidden="true" />
  <span>完了</span>
</div>

// ✅ 画像の代替テキスト
<img src={avatar} alt={`${user.name}のアバター`} />
<img src={decoration} alt="" />  {/* 装飾: alt="" */}

// ✅ フォームヒント
<label htmlFor="title">
  タイトル <span aria-label="必須">*</span>
</label>
<input id="title" aria-describedby="help" aria-required="true" />
<span id="help">200文字以内</span>
```

**テストでの検証**:

```typescript
// role属性 + キーボード操作
await expect(component.getByRole("button", { name: "送信" })).toBeVisible();
await component.getByRole("button").press("Enter");
await component.keyboard.press("Escape");
```

---

## テスト戦略

### 切り出しの判断基準

以下の場合は、**必ず**ページから切り出す：

- ✅ フォーム（入力、バリデーション）
- ✅ カード（データ表示、インタラクション）
- ✅ 複雑なロジックを持つUI（添付ファイル、コメント機能）
- ✅ 繰り返し表示される要素（リスト項目）
- ✅ 10行以上のJSX

### テスト必須ルール ⭐

**全てのページ固有コンポーネントには、必ずコンポーネントテスト（\*.ct.test.tsx）を作成**

| テストタイプ           | 対象                       | 目的           | 粒度              |
| ---------------------- | -------------------------- | -------------- | ----------------- |
| コンポーネントテスト   | 全ページ固有コンポーネント | 機能・a11y検証 | 1機能=1テスト     |
| スナップショットテスト | ページ全体                 | 視覚的回帰検出 | 1画面状態=1テスト |

### セレクタ戦略

**基本方針**:

- **操作**: `data-testid` （安定性・国際化対応）
- **検証**: `getByRole`, `getByLabel` （a11y保証）

**命名規則**:

```
data-testid="{action}-button"     // create-button, submit-button
data-testid="input-{name}"        // input-title, input-email
data-testid="{type}-{id}"         // todo-card-123
data-testid="{name}-section"      // file-upload-section
```

### コンポーネントテスト（\*.ct.test.tsx）

**粒度**: 1テストケース = 1機能

```typescript
// ✅ 機能ごとに分割
test("タイトルが編集可能", async ({ mount }) => { ... });
test("バリデーションエラー: 空のタイトル", async ({ mount }) => { ... });
test("バリデーションエラー: 201文字のタイトル", async ({ mount }) => { ... });
test("境界値: 200文字のタイトル", async ({ mount }) => { ... });

// ❌ 1テストに複数機能を詰め込まない
test("フォームが動作する", async ({ mount }) => {
  // タイトル入力、バリデーション、送信... ← 失敗原因が特定しにくい
});
```

**分割基準**:

- 機能単位（入力、選択、削除）
- バリデーション単位（必須、文字数、形式）
- 境界値単位（最小値、最大値、範囲外）
- 状態単位（新規、編集、読み取り専用）

**テンプレート**:

```typescript
test('機能名', async ({ mount }) => {
  const component = await mount(<Component {...props} />);

  // 1. 要素取得（data-testid）
  const element = component.getByTestId('element-name');

  // 2. アクセシビリティ検証
  await expect(element).toHaveRole('button');
  await expect(element).toHaveAttribute('type', 'submit');

  // 3. 操作
  await element.click();

  // 4. 結果確認
  await expect(component.getByTestId('result')).toBeVisible();
});
```

**エラーメッセージの検証**:

```typescript
// ✅ Good: role="alert" でスコープ限定
const errorAlert = component.getByRole("alert");
await expect(errorAlert).toBeVisible();
await expect(errorAlert).toContainText(/200.*文字/);

// ❌ Bad: グローバルにテキスト検索
await expect(component.getByText(/200.*文字/)).toBeVisible();
```

**動的コンテンツ**:

```typescript
// ✅ 許容（コメント推奨）
// ファイル名は動的コンテンツのためgetByTextを使用
await expect(component.getByText("test.txt")).toBeVisible();
```

### スナップショットテスト（\*.ss.test.ts）

**粒度**: 1テストケース = 1画面状態

```typescript
// ✅ 画面状態ごとに分割
test("[SS]TODOページ", async ({ page }) => { ... });
test("[SS]TODOページ（空）", async ({ page }) => { ... });
test("[SS]TODOページ（モーダル表示）", async ({ page }) => { ... });

// ❌ 細かすぎる分割
test("[SS]ボタン表示", async ({ page }) => { ... }); // ← 通常状態に含まれる
test("[SS]リスト表示", async ({ page }) => { ... }); // ← 通常状態に含まれる
```

**分割基準**:

- ページ状態（通常、空、ローディング、エラー）
- モーダル・ダイアログ（作成、編集、削除確認）
- フィルター・検索結果
- データ有無（添付ファイルあり/なし）

**テンプレート**:

```typescript
test("[SS]画面名（状態）", async ({ page }) => {
  // 1. 時間固定
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  // 2. MSW設定
  await page.addInitScript(() => {
    const checkMswAndSetHandlers = () => {
      const msw = (window as any).msw;
      if (!msw) {
        setTimeout(checkMswAndSetHandlers, 50);
        return;
      }
      msw.setHandlers("HAS_ALL"); // or "EMPTY"
    };
    checkMswAndSetHandlers();
  });

  // 3. ページ遷移
  await page.goto("/path");
  await page.waitForLoadState("networkidle");

  // 4. 操作（必要な場合のみ）
  await page.getByTestId("action-button").click();
  await page.waitForLoadState("networkidle");

  // 5. スクリーンショット（検証はこれのみ）
  await expect(page).toHaveScreenshot({ fullPage: true });
});
```

**重要な原則**:

- スクリーンショット = 表示の証明
- `expect().toBeVisible()` は不要（冗長）
- アクセシビリティ検証は不要（コンポーネントテストで実施）

### Do / Don't

**✅ Good**:

```typescript
// data-testid + a11y検証
<button data-testid="submit-button" onClick={handleSubmit}>送信</button>
await component.getByTestId('submit-button').click();

// バリデーションのみをテスト（API呼び出しを避ける）
await nameInput.fill("有効な値");
await nameInput.blur(); // バリデーション実行
await expect(component.locator('[role="alert"]')).toHaveCount(0);
```

**❌ Bad**:

```typescript
// テキストセレクタ（国際化で壊れる）
await page.click('button:has-text("送信")');
// CSSセレクタ（リファクタリングで壊れる）
await page.click(".btn-primary");

// submitボタンクリック後にAPI失敗エラーが出る
await component.getByTestId("submit-button").click(); // ← APIがモックされていないと失敗Alert表示
await expect(component.getByRole("alert")).not.toBeVisible(); // ← 失敗
```

---

## テストコマンド

```bash
npm run test:ct              # コンポーネントテスト実行
npm run test:ct:ui           # UIモード
npm run test:ss              # スナップショットテスト実行
npm run test:ss:update       # スクリーンショット更新
npm run test:ss:ui           # UIモード
npm run test                 # すべてのテスト
```

---

## トラブルシューティング

| 問題                 | 原因                         | 解決策                                 |
| -------------------- | ---------------------------- | -------------------------------------- |
| スナップショット差分 | 時間依存の表示               | `page.clock.install()` で時間固定      |
| スナップショット差分 | ランダム値                   | `Math.random()` のモック               |
| スナップショット差分 | 非同期未完了                 | `waitForLoadState("networkidle")` 追加 |
| MSW動作しない        | Service Worker未インストール | `npx msw init public/ --save`          |

---

## 参考資料

- [Playwright](https://playwright.dev/) | [React Hook Form](https://react-hook-form.com/) | [Zod](https://zod.dev/) | [TanStack Query](https://tanstack.com/query/latest) | [WCAG](https://www.w3.org/WAI/WCAG21/quickref/)
