# セレクタ戦略

## 核心原則

**`getByRole`/`getByLabel`を優先**し、ユーザーがアプリを使う方法でテストする。`data-testid`は最後の手段。

**根拠となる憲法**:
- `testing-principles.md`: 決定論的テスト
- `accessibility-principles.md`: アクセシビリティ保証

## セレクタの優先順位

Testing Library公式の推奨に従う:

| 優先度 | セレクタ | 用途 |
|--------|---------|------|
| 1 | `getByRole` | ボタン、リンク、見出し等（最推奨） |
| 2 | `getByLabelText` | フォーム入力 |
| 3 | `getByPlaceholderText` | ラベルがない入力 |
| 4 | `getByText` | 動的コンテンツ |
| 5 | `getByTestId` | 複数要素の区別が必要な場合（最後の手段） |

## なぜ getByRole 優先なのか

```typescript
// getByRole で操作 = 暗黙的にアクセシビリティを検証
await component.getByRole("button", { name: "送信" }).click();
// ↑ このテストが通る = role="button" かつ accessible name が正しい

// data-testid で操作 = アクセシビリティは別途検証が必要
const button = component.getByTestId("submit-button");
await button.click();
await expect(button).toHaveRole("button"); // ← 忘れると問題を見逃す
```

**Testing Libraryの哲学**:
> "The more your tests resemble the way your software is used, the more confidence they can give you."

## 実装パターン

### 1. ボタン操作: getByRole（推奨）

```typescript
// 推奨: getByRole（暗黙的a11y検証）
await component.getByRole("button", { name: "送信" }).click();
await component.getByRole("button", { name: "キャンセル" }).click();
await component.getByRole("button", { name: "編集" }).click();
```

### 2. フォーム入力: getByLabel（推奨）

```typescript
// 推奨: getByLabel（暗黙的a11y検証）
const titleInput = component.getByLabel("タイトル");
await titleInput.fill("新しいTODO");
await expect(titleInput).toHaveValue("新しいTODO");
```

### 3. 複数要素の区別: data-testid（最後の手段）

```typescript
// 複数のカードがある場合、data-testid でスコープを限定
const todoCard = component.getByTestId("todo-card-123");
await todoCard.getByRole("button", { name: "編集" }).click();

// リスト内の特定アイテム
const firstItem = component.getByTestId("todo-item-1");
await firstItem.getByRole("checkbox").click();
```

### 4. エラーメッセージ: getByRole("alert")

```typescript
// エラーメッセージは role="alert" で取得
const errorAlert = component.getByRole("alert");
await expect(errorAlert).toBeVisible();
await expect(errorAlert).toContainText(/200.*文字/i);
```

### 5. 動的コンテンツ: getByText（コメント必須）

```typescript
// ファイル名は動的コンテンツのためgetByTextを使用
await expect(component.getByText("test.txt")).toBeVisible();
```

## data-testid の使用基準

### 使ってよい場合

| ケース | 例 |
|--------|-----|
| 複数の同種要素を区別 | `todo-card-123`, `todo-item-1` |
| リスト内の特定アイテム | `project-row-456` |
| セクションのスコープ限定 | `file-upload-section` |

### 使うべきでない場合

| ケース | 代替手段 |
|--------|---------|
| 一意のボタン | `getByRole("button", { name: "送信" })` |
| フォーム入力 | `getByLabel("タイトル")` |
| 見出し | `getByRole("heading", { name: "設定" })` |
| リンク | `getByRole("link", { name: "ホーム" })` |

## data-testid命名規則

複数要素の区別に使う場合の命名規則:

```
data-testid="{type}-{id}"         // todo-card-123, project-row-456
data-testid="{name}-section"      // file-upload-section, filter-section
data-testid="{type}-item-{index}" // todo-item-0, todo-item-1
```

## strict mode対策

Playwrightはstrict modeがデフォルトで有効。複数要素にマッチするとエラーになる。

```typescript
// ✅ Good: exactオプションで完全一致
await component.getByRole("link", { name: "TODO", exact: true }).click();

// ✅ Good: data-testidでスコープ限定してからgetByRole
const card = component.getByTestId("todo-card-123");
await card.getByRole("button", { name: "編集" }).click();

// ❌ Bad: 複数要素にマッチする可能性
await component.getByText("TODO").click(); // "TODO App"にもマッチ
```

## Do / Don't

### Do

```typescript
// getByRole で操作（暗黙的a11y検証）
await component.getByRole("button", { name: "送信" }).click();

// getByLabel で入力（暗黙的a11y検証）
await component.getByLabel("タイトル").fill("新しいTODO");

// 複数要素の区別は data-testid + getByRole
const card = component.getByTestId("todo-card-123");
await card.getByRole("button", { name: "削除" }).click();

// エラーメッセージは role="alert"
await expect(component.getByRole("alert")).toContainText("エラー");
```

### Don't

```typescript
// ❌ 一意の要素に data-testid を使う
await component.getByTestId("submit-button").click();

// ❌ テキストセレクタ（国際化で壊れる）
await page.click('button:has-text("送信")');

// ❌ CSSセレクタ（リファクタリングで壊れる）
await page.click(".btn-primary");

// ❌ グローバルにテキスト検索（スコープ限定なし）
await expect(component.getByText(/200.*文字/)).toBeVisible();
```

## UIプリミティブでのdata-testid

`app/lib/ui/`のUIプリミティブは、複数要素の区別が必要な場合のみ`data-testid`を渡す。

```typescript
// 通常は data-testid 不要
<Button type="submit">送信</Button>
<Button type="button" variant="secondary">キャンセル</Button>

// 複数の同種ボタンを区別する場合のみ
{todos.map((todo) => (
  <Button data-testid={`complete-button-${todo.id}`} onClick={() => complete(todo.id)}>
    完了
  </Button>
))}
```

## 関連ドキュメント

- `10-component-overview.md`: コンポーネント設計概要
- `30-test-patterns.md`: コンポーネントテスト（CT）
- `../lib/20-ui-primitives.md`: UIプリミティブ
