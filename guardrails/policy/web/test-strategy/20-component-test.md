# コンポーネントテスト（\*.ct.test.tsx）

## テスト粒度: 1機能 = 1テスト

### 分割基準

- **機能単位**: 入力、選択、削除、表示
- **バリデーション単位**: 必須、文字数、形式
- **境界値単位**: 最小値、最大値、範囲外
- **状態単位**: 新規、編集、読み取り専用、ローディング
- **モード単位**: 通常、編集、削除確認

### Good vs Bad

```typescript
// ✅ Good: 機能ごとに分割
test("タイトルが編集可能", async ({ mount }) => { ... });
test("バリデーションエラー: 空のタイトル", async ({ mount }) => { ... });
test("バリデーションエラー: 201文字のタイトル", async ({ mount }) => { ... });
test("境界値: 200文字のタイトル", async ({ mount }) => { ... });

// ❌ Bad: 1テストに複数機能を詰め込む
test("フォームが動作する", async ({ mount }) => {
  // タイトル入力、バリデーション、送信... ← 失敗原因が特定しにくい
});
```

## テストパターン

### 1. 初期表示テスト

```typescript
test("新規作成モード: 初期値が正しく表示される", async ({ mount }) => {
  const component = await mount(<TodoForm onSubmit={() => {}} onCancel={() => {}} />);

  // getByLabel: アクセシビリティ検証
  const titleInput = component.getByLabel("タイトル");
  await expect(titleInput).toHaveValue("");

  // data-testid + アクセシビリティ検証
  const submitButton = component.getByTestId("submit-button");
  await expect(submitButton).toBeVisible();
  await expect(submitButton).toHaveRole("button");
  await expect(submitButton).toHaveAttribute("type", "submit");
});
```

### 2. 入力テスト

```typescript
test("タイトルが編集可能", async ({ mount }) => {
  const component = await mount(<TodoForm onSubmit={() => {}} onCancel={() => {}} />);

  const titleInput = component.getByLabel("タイトル");
  await titleInput.fill("新しいTODO");
  await expect(titleInput).toHaveValue("新しいTODO");
});
```

### 3. バリデーションエラーテスト

```typescript
test("フォーカスアウト時にバリデーションエラーが表示される（空のタイトル）", async ({ mount }) => {
  const component = await mount(<TodoForm onSubmit={() => {}} onCancel={() => {}} />);

  const titleInput = component.getByLabel("タイトル");
  await titleInput.fill("");
  await titleInput.blur(); // フォーカスアウトでバリデーション発火

  // getByRole("alert"): エラーメッセージのスコープ限定
  await expect(component.getByRole("alert")).toBeVisible({ timeout: 3000 });
});

test("フォーカスアウト時にバリデーションエラーが表示される（201文字のタイトル）", async ({ mount }) => {
  const component = await mount(<TodoForm onSubmit={() => {}} onCancel={() => {}} />);

  const titleInput = component.getByLabel("タイトル");
  const longTitle = "あ".repeat(201);
  await titleInput.fill(longTitle);
  await titleInput.blur();

  // エラーメッセージの内容も検証
  const errorAlert = component.getByRole("alert");
  await expect(errorAlert).toBeVisible({ timeout: 3000 });
  await expect(errorAlert).toContainText(/200.*文字/i);
});
```

### 4. 境界値テスト

```typescript
test("境界値テスト: 1文字のタイトルでバリデーションを通過する", async ({ mount }) => {
  const component = await mount(<TodoForm onSubmit={() => {}} onCancel={() => {}} />);

  const titleInput = component.getByLabel("タイトル");
  await titleInput.fill("A");
  await titleInput.blur();

  // エラーメッセージが表示されないことを確認
  await expect(component.getByRole("alert")).not.toBeVisible();
});

test("境界値テスト: 200文字のタイトルでバリデーションを通過する", async ({ mount }) => {
  const component = await mount(<TodoForm onSubmit={() => {}} onCancel={() => {}} />);

  const titleInput = component.getByLabel("タイトル");
  const validTitle = "あ".repeat(200);
  await titleInput.fill(validTitle);
  await titleInput.blur();

  await expect(component.getByRole("alert")).not.toBeVisible();
});
```

### 5. コールバックテスト

```typescript
test("キャンセルボタンをクリックするとonCancelが呼ばれる", async ({ mount }) => {
  let cancelCalled = false;
  const component = await mount(
    <TodoForm
      onSubmit={() => {}}
      onCancel={() => { cancelCalled = true; }}
    />
  );

  // data-testid + アクセシビリティ検証
  const cancelButton = component.getByTestId("cancel-button");
  await expect(cancelButton).toHaveRole("button");
  await expect(cancelButton).toHaveAttribute("type", "button");

  await cancelButton.click();
  expect(cancelCalled).toBe(true);
});

test("編集ボタンをクリックするとonEditが呼ばれる", async ({ mount }) => {
  let editedTodo = null;
  const component = await mount(
    <TodoCard
      todo={mockTodo}
      onEdit={(todo) => { editedTodo = todo; }}
      onDelete={() => {}}
      onStatusChange={() => {}}
    />
  );

  // getByRole with name: コールバック検証
  await component.getByRole("button", { name: "編集" }).click();
  expect(editedTodo).toEqual(mockTodo);
});
```

### 6. 状態ベーステスト

```typescript
test("ステータスが「未着手」の場合、「開始」ボタンが表示される", async ({ mount }) => {
  const component = await mount(
    <TodoCard
      todo={mockTodo}
      onEdit={() => {}}
      onDelete={() => {}}
      onStatusChange={() => {}}
    />
  );

  await expect(component.getByRole("button", { name: "開始" })).toBeVisible();
});

test("ステータスが「完了」の場合、ステータス変更ボタンが表示されない", async ({ mount }) => {
  const doneTodo = { ...mockTodo, status: "DONE" };
  const component = await mount(
    <TodoCard
      todo={doneTodo}
      onEdit={() => {}}
      onDelete={() => {}}
      onStatusChange={() => {}}
    />
  );

  await expect(component.getByRole("button", { name: "開始" })).not.toBeVisible();
  await expect(component.getByRole("button", { name: "完了" })).not.toBeVisible();
});
```

### 7. イベント伝播テスト

```typescript
test("編集ボタンをクリックしてもカードのonClickは呼ばれない（stopPropagation）", async ({ mount }) => {
  let cardClicked = false;
  let editClicked = false;

  const component = await mount(
    <ProjectCard
      project={mockProject}
      todoCount={5}
      onEdit={() => { editClicked = true; }}
      onDelete={() => {}}
      onClick={() => { cardClicked = true; }}
    />
  );

  const editButtons = component.getByRole("button");
  const editButton = editButtons.nth(0);
  await editButton.click();

  expect(editClicked).toBe(true);
  expect(cardClicked).toBe(false); // stopPropagation検証
});
```

### 8. ローディング状態テスト

```typescript
test("isLoading=trueの時、ボタンがローディング状態になる", async ({ mount }) => {
  const component = await mount(
    <ProfileEditForm
      user={mockUser}
      onSubmit={() => {}}
      onCancel={() => {}}
      isLoading={true}
    />
  );

  const cancelButton = component.getByTestId("cancel-button");
  await expect(cancelButton).toBeDisabled();

  const submitButton = component.getByTestId("submit-button");
  await expect(submitButton).toBeDisabled();

  // ローディングスピナー検証
  await expect(component.getByRole("status")).toBeVisible();
});
```

## バリデーションテストの網羅性

全てのバリデーションに対して、以下を必ず検証：

| 条件           | テスト内容                                   | 例                                   |
| -------------- | -------------------------------------------- | ------------------------------------ |
| エラー条件     | 空、超過（201文字、5001文字、101文字）       | "バリデーションエラー: 空のタイトル" |
| 境界値（最小） | 最小値（1文字）でバリデーションを通過        | "境界値: 1文字のタイトル"            |
| 境界値（最大） | 最大値（200文字、5000文字、100文字）で通過   | "境界値: 200文字のタイトル"          |
| 成功条件       | 有効なデータでエラーが出ないことを確認       | "有効なデータでエラーが表示されない" |
| オプション     | 未入力でもエラーが出ないことを確認（該当時） | "期限日は空でも有効"                 |

## Do / Don't

### ✅ Good

```typescript
// data-testid + a11y検証
<button data-testid="submit-button" onClick={handleSubmit}>送信</button>
await component.getByTestId('submit-button').click();

// バリデーションのみをテスト（API呼び出しを避ける）
await nameInput.fill("有効な値");
await nameInput.blur(); // バリデーション実行
await expect(component.locator('[role="alert"]')).toHaveCount(0);

// エラーメッセージ: role="alert" でスコープ限定
const errorAlert = component.getByRole("alert");
await expect(errorAlert).toBeVisible();
await expect(errorAlert).toContainText(/200.*文字/);

// 動的コンテンツ: コメント付きでgetByText
// ファイル名は動的コンテンツのためgetByTextを使用
await expect(component.getByText("test.txt")).toBeVisible();
```

### ❌ Bad

```typescript
// テキストセレクタ（国際化で壊れる）
await page.click('button:has-text("送信")');

// CSSセレクタ（リファクタリングで壊れる）
await page.click(".btn-primary");

// submitボタンクリック後にAPI失敗エラーが出る
await component.getByTestId("submit-button").click(); // ← APIがモックされていないと失敗Alert表示
await expect(component.getByRole("alert")).not.toBeVisible(); // ← 失敗

// グローバルにテキスト検索（スコープ限定なし）
await expect(component.getByText(/200.*文字/)).toBeVisible();
```
