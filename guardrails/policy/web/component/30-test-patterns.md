# コンポーネントテスト（*.ct.test.tsx）

## 核心原則

コンポーネント単体のテストで**機能・アクセシビリティ・ロジック**を検証する。1機能 = 1テスト。

**根拠となる憲法**:
- `testing-principles.md`: 決定論的テスト
- `module-cohesion-principles.md`: テストのコロケーション

## テスト粒度: 1機能 = 1テスト

### 分割基準

- **機能単位**: 入力、選択、削除、表示
- **バリデーション単位**: 必須、文字数、形式
- **境界値単位**: 最小値、最大値、範囲外
- **状態単位**: 新規、編集、読み取り専用、ローディング

### Do / Don't

```typescript
// ✅ Good: 機能ごとに分割
test("タイトルが編集可能", async ({ mount }) => { ... });
test("バリデーションエラー: 空のタイトル", async ({ mount }) => { ... });
test("バリデーションエラー: 201文字のタイトル", async ({ mount }) => { ... });
test("境界値: 200文字のタイトル", async ({ mount }) => { ... });

// ❌ Bad: 1テストに複数機能
test("フォームが動作する", async ({ mount }) => {
  // タイトル入力、バリデーション、送信... ← 失敗原因が特定しにくい
});
```

## テストパターン

### 1. 初期表示テスト

```typescript
test("新規作成モード: 初期値が正しく表示される", async ({ mount }) => {
  const component = await mount(<TodoForm onSubmit={() => {}} onCancel={() => {}} />);

  const titleInput = component.getByLabel("タイトル");
  await expect(titleInput).toHaveValue("");

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

  await expect(component.getByRole("alert")).toBeVisible({ timeout: 3000 });
});

test("フォーカスアウト時にバリデーションエラーが表示される（201文字のタイトル）", async ({ mount }) => {
  const component = await mount(<TodoForm onSubmit={() => {}} onCancel={() => {}} />);

  const titleInput = component.getByLabel("タイトル");
  const longTitle = "あ".repeat(201);
  await titleInput.fill(longTitle);
  await titleInput.blur();

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

  const cancelButton = component.getByTestId("cancel-button");
  await expect(cancelButton).toHaveRole("button");
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
    />
  );

  await component.getByRole("button", { name: "編集" }).click();
  expect(editedTodo).toEqual(mockTodo);
});
```

### 6. 状態ベーステスト

```typescript
test("ステータスが「未着手」の場合、「開始」ボタンが表示される", async ({ mount }) => {
  const component = await mount(
    <TodoCard todo={mockTodo} onEdit={() => {}} onDelete={() => {}} />
  );

  await expect(component.getByRole("button", { name: "開始" })).toBeVisible();
});

test("ステータスが「完了」の場合、ステータス変更ボタンが表示されない", async ({ mount }) => {
  const doneTodo = { ...mockTodo, status: "DONE" };
  const component = await mount(
    <TodoCard todo={doneTodo} onEdit={() => {}} onDelete={() => {}} />
  );

  await expect(component.getByRole("button", { name: "開始" })).not.toBeVisible();
});
```

### 7. ローディング状態テスト

```typescript
test("isLoading=trueの時、ボタンがローディング状態になる", async ({ mount }) => {
  const component = await mount(
    <ProfileEditForm user={mockUser} onSubmit={() => {}} onCancel={() => {}} isLoading={true} />
  );

  const submitButton = component.getByTestId("submit-button");
  await expect(submitButton).toBeDisabled();
  await expect(component.getByRole("status")).toBeVisible();
});
```

## バリデーションテストの網羅性

| 条件 | テスト内容 | 例 |
|------|-----------|-----|
| エラー条件 | 空、超過（201文字） | "バリデーションエラー: 空のタイトル" |
| 境界値（最小） | 1文字で通過 | "境界値: 1文字のタイトル" |
| 境界値（最大） | 200文字で通過 | "境界値: 200文字のタイトル" |
| 成功条件 | エラーが出ないことを確認 | "有効なデータでエラーが表示されない" |

## ファイル配置

```
app/routes/todos+/
├── components/
│   ├── todo-form.tsx
│   └── todo-form.ct.test.tsx    # Component Test
└── route.tsx
```

**命名規則**: `{component}.ct.test.tsx`

## 関連ドキュメント

- `10-component-overview.md`: コンポーネント設計概要
- `20-selector-strategy.md`: セレクタ戦略
- `../route/40-test-patterns.md`: ルートテスト（SS）
- `../mock/10-mock-overview.md`: テストデータ命名規則
