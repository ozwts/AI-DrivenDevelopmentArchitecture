# セレクタ戦略

## 核心原則

**操作には`data-testid`、検証には`getByRole`/`getByLabel`**を使用する。

**根拠となる憲法**:
- `testing-principles.md`: 決定論的テスト
- `accessibility-principles.md`: アクセシビリティ保証

## セレクタの使い分け

| 用途 | セレクタ | 理由 |
|------|---------|------|
| 操作 | `data-testid` | 安定性・国際化対応 |
| 検証 | `getByRole`, `getByLabel` | アクセシビリティ保証 |
| 動的コンテンツ | `getByText` | 必ずコメント付き |

## data-testid命名規則

```
data-testid="{action}-button"     // create-button, submit-button, cancel-button
data-testid="input-{name}"        // input-title, input-email
data-testid="{type}-{id}"         // todo-card-123, todo-detail-button
data-testid="{name}-section"      // file-upload-section
```

## 実装例

### 操作: data-testid（安定性）

```typescript
// コンポーネント実装
<button data-testid="submit-button" type="submit">送信</button>

// テスト
const submitButton = component.getByTestId("submit-button");
await submitButton.click();
```

### 検証: getByRole（アクセシビリティ）

```typescript
// ボタンの検証
await expect(submitButton).toHaveRole("button");
await expect(submitButton).toHaveAttribute("type", "submit");

// 入力の検証
const titleInput = component.getByLabel("タイトル");
await expect(titleInput).toHaveValue("新しいTODO");
```

### コールバック検証: getByRole with name

```typescript
// 編集ボタンのクリック
await component.getByRole("button", { name: "編集" }).click();
expect(editedTodo).toEqual(mockTodo);
```

### 動的コンテンツ: getByText（コメント必須）

```typescript
// ファイル名は動的コンテンツのためgetByTextを使用
await expect(component.getByText("test.txt")).toBeVisible();
```

### エラーメッセージ: role="alert"

```typescript
// エラーメッセージのスコープ限定
const errorAlert = component.getByRole("alert");
await expect(errorAlert).toBeVisible();
await expect(errorAlert).toContainText(/200.*文字/i);
```

## UIプリミティブのtestId Props

`app/lib/ui/`のUIプリミティブには`testId`プロパティを用意し、使用側で指定できるようにする。

### Button

```typescript
// app/lib/ui/button.tsx
type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  readonly variant?: "primary" | "secondary" | "danger" | "ghost";
  readonly testId?: string;  // テスト用ID
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", testId, ...props }, ref) => {
    return (
      <button
        ref={ref}
        data-testid={testId}
        {...props}
      />
    );
  }
);
```

### Input

```typescript
// app/lib/ui/input.tsx
type InputProps = ComponentPropsWithoutRef<"input"> & {
  readonly error?: boolean;
  readonly testId?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, testId, ...props }, ref) => {
    return (
      <input
        ref={ref}
        data-testid={testId}
        aria-invalid={error}
        {...props}
      />
    );
  }
);
```

### 使用例

```typescript
// app/routes/todos+/components/todo-form.tsx
import { Button, Input } from "@/lib/ui";

export function TodoForm() {
  return (
    <form>
      <Input testId="input-title" {...register("title")} />
      <Button testId="submit-button" type="submit">作成</Button>
      <Button testId="cancel-button" type="button" variant="secondary">キャンセル</Button>
    </form>
  );
}
```

## Do / Don't

### Do

```typescript
// data-testid + a11y検証
<button data-testid="submit-button" onClick={handleSubmit}>送信</button>
await component.getByTestId('submit-button').click();

// エラーメッセージ: role="alert" でスコープ限定
const errorAlert = component.getByRole("alert");
await expect(errorAlert).toBeVisible();

// 動的コンテンツ: コメント付きでgetByText
// ファイル名は動的コンテンツのためgetByTextを使用
await expect(component.getByText("test.txt")).toBeVisible();
```

### Don't

```typescript
// テキストセレクタ（国際化で壊れる）
await page.click('button:has-text("送信")');

// CSSセレクタ（リファクタリングで壊れる）
await page.click(".btn-primary");

// グローバルにテキスト検索（スコープ限定なし）
await expect(component.getByText(/200.*文字/)).toBeVisible();
```

## 関連ドキュメント

- `10-component-overview.md`: コンポーネント設計概要
- `30-test-patterns.md`: コンポーネントテスト（CT）
- `../lib/20-ui-primitives.md`: UIプリミティブ
