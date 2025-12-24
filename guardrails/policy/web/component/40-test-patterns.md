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

## セレクタ戦略

**`getByRole`/`getByLabel`を優先**し、`data-testid`は複数要素の区別が必要な場合のみ使用する。

詳細は `20-selector-strategy.md` を参照。

```typescript
// 推奨: getByRole（暗黙的a11y検証）
await component.getByRole("button", { name: "送信" }).click();

// 推奨: getByLabel（暗黙的a11y検証）
const titleInput = component.getByLabel("タイトル");

// 複数要素の区別が必要な場合のみ data-testid
const todoCard = component.getByTestId("todo-card-123");
await todoCard.getByRole("button", { name: "編集" }).click();
```

## テストパターン

### 1. 初期表示テスト

```typescript
test("新規作成モード: 初期値が正しく表示される", async ({ mount }) => {
  const component = await mount(<TodoForm onSubmit={() => {}} onCancel={() => {}} />);

  // getByLabel で入力要素を取得（暗黙的a11y検証）
  const titleInput = component.getByLabel("タイトル");
  await expect(titleInput).toHaveValue("");

  // getByRole でボタンを検証（暗黙的a11y検証）
  const submitButton = component.getByRole("button", { name: "作成" });
  await expect(submitButton).toBeVisible();
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

  // getByRole で操作（暗黙的a11y検証）
  await component.getByRole("button", { name: "キャンセル" }).click();
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

### 5-1. フォーム送信値テスト（必須）

**フォームコンポーネントでは、送信される値の検証が必須**。エラー表示だけでなく、実際に正しい値が渡されるか、エラー時に送信されないかを検証する。

```typescript
test("有効なデータでフォーム送信時、onSubmitに正しい値が渡される", async ({ mount }) => {
  let submittedData = null;
  const component = await mount(
    <TodoForm
      mode="create"
      onSubmit={(data) => { submittedData = data; }}
      onCancel={() => {}}
    />
  );

  // フォームに値を入力
  await component.getByLabel("タイトル").fill("新しいTODO");
  await component.getByLabel("説明").fill("詳細な説明");
  await component.getByLabel("優先度").selectOption("HIGH");

  // フォームを送信
  await component.getByRole("button", { name: "作成" }).click();

  // onSubmitに正しい値が渡されたことを検証
  expect(submittedData).toEqual({
    title: "新しいTODO",
    description: "詳細な説明",
    priority: "HIGH",
    // ...
  });
});

test("バリデーションエラー時、onSubmitが呼ばれない", async ({ mount }) => {
  let submitCalled = false;
  const component = await mount(
    <TodoForm
      mode="create"
      onSubmit={() => { submitCalled = true; }}
      onCancel={() => {}}
    />
  );

  // 無効なデータ（タイトル空）のまま送信
  await component.getByRole("button", { name: "作成" }).click();

  // onSubmitが呼ばれないことを検証
  expect(submitCalled).toBe(false);

  // エラーが表示されることを検証
  await expect(component.getByRole("alert")).toBeVisible();
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

**注意**: Buttonコンポーネントは`isLoading=true`の時、アクセシブル名が「処理中...」に変わる。
そのため、ローディング状態のボタンを取得する際は正規表現マッチを使用する。

```typescript
test("isLoading=trueの時、ボタンがローディング状態になる", async ({ mount }) => {
  const component = await mount(
    <ProfileEditForm user={mockUser} onSubmit={() => {}} onCancel={() => {}} isLoading={true} />
  );

  // ❌ Bad: isLoading=trueではボタンテキストが「処理中...」に変わるため失敗
  // const submitButton = component.getByRole("button", { name: "保存" });

  // ✅ Good: 正規表現で「処理中」を含むボタンを取得
  const submitButton = component.getByRole("button", { name: /処理中/ });
  await expect(submitButton).toBeDisabled();
});
```

### 8. 複数要素がある場合（data-testid使用）

```typescript
test("特定のTODOカードの編集ボタンをクリックする", async ({ mount }) => {
  let editedTodo = null;
  const component = await mount(
    <TodoList
      todos={[mockTodo1, mockTodo2, mockTodo3]}
      onEdit={(todo) => { editedTodo = todo; }}
      onDelete={() => {}}
    />
  );

  // 複数カードがあるため data-testid でスコープ限定
  const targetCard = component.getByTestId(`todo-card-${mockTodo2.id}`);
  await targetCard.getByRole("button", { name: "編集" }).click();

  expect(editedTodo).toEqual(mockTodo2);
});
```

## セレクタのstrict mode対策

Playwrightはstrict modeがデフォルトで有効であり、複数の要素にマッチするセレクタはエラーになる。

### 対策パターン

```typescript
// ✅ Good: exactオプションで完全一致
await expect(component.getByRole("link", { name: "TODO", exact: true })).toBeVisible();

// ✅ Good: data-testidでスコープ限定してからgetByRole
const card = component.getByTestId("todo-card-123");
await card.getByRole("button", { name: "編集" }).click();

// ✅ Good: getByRoleでheadingを指定して一意に
await expect(component.getByRole("heading", { name: "タイトル" })).toBeVisible();

// ❌ Bad: 複数要素にマッチする可能性
await expect(component.getByText("TODO")).toBeVisible(); // "TODO App"にもマッチ
```

## フォームテストの網羅性

### バリデーション検証

| 条件           | テスト内容               | 例                                   |
| -------------- | ------------------------ | ------------------------------------ |
| エラー条件     | 空、超過（201文字）      | "バリデーションエラー: 空のタイトル" |
| 境界値（最小） | 1文字で通過              | "境界値: 1文字のタイトル"            |
| 境界値（最大） | 200文字で通過            | "境界値: 200文字のタイトル"          |
| 成功条件       | エラーが出ないことを確認 | "有効なデータでエラーが表示されない" |

### 送信値検証（必須）

フォームの送信値テストでは、**等価分割**に基づき2つのテストで網羅する。

| テスト | 必須フィールド | オプショナル | 目的 |
|-------|--------------|-------------|-----|
| **全フィールド入力** | 有効な値 | 有効な値 | 全値が正しく渡される |
| **最小入力** | 有効な値 | 空 | 空でも送信可能、空値が渡される |
| **送信阻止** | 無効な値 | - | エラー時にonSubmitが呼ばれない |

```typescript
// テスト1: 全フィールド入力（オプショナルに値あり）
test("全フィールド入力でフォーム送信時、onSubmitに正しい値が渡される", async ({ mount }) => {
  let submittedData: unknown = null;
  const component = await mount(
    <TodoForm mode="create" onSubmit={(data) => { submittedData = data; }} onCancel={() => {}} />
  );

  await component.getByLabel("タイトル").fill("新しいTODO");
  await component.getByLabel("説明").fill("詳細な説明");
  await component.getByLabel("期限日").fill("2025-12-31");
  await component.getByRole("button", { name: "作成" }).click();

  expect(submittedData).toEqual({
    title: "新しいTODO",
    description: "詳細な説明",  // オプショナル: 値あり
    dueDate: "2025-12-31",       // オプショナル: 値あり
    // ...
  });
});

// テスト2: 最小入力（オプショナルは空）
test("最小入力でフォーム送信時、オプショナルフィールドが空で渡される", async ({ mount }) => {
  let submittedData: unknown = null;
  const component = await mount(
    <TodoForm mode="create" onSubmit={(data) => { submittedData = data; }} onCancel={() => {}} />
  );

  // 必須フィールドのみ入力
  await component.getByLabel("タイトル").fill("最小TODO");
  await component.getByRole("button", { name: "作成" }).click();

  expect(submittedData).toEqual({
    title: "最小TODO",
    description: "",   // オプショナル: 空
    dueDate: "",       // オプショナル: 空
    // ...
  });
});

// テスト3: 送信阻止
test("バリデーションエラー時、onSubmitが呼ばれない", async ({ mount }) => {
  let submitCalled = false;
  const component = await mount(
    <TodoForm mode="create" onSubmit={() => { submitCalled = true; }} onCancel={() => {}} />
  );

  await component.getByRole("button", { name: "作成" }).click();
  expect(submitCalled).toBe(false);
  await expect(component.getByRole("alert")).toBeVisible();
});
```

## ファイル配置

```
app/routes/(user)/todos/
├── components/
│   ├── TodoForm.tsx
│   └── TodoForm.ct.test.tsx    # Component Test
└── route.tsx
```

**命名規則**: `{Component}.ct.test.tsx`

## 外部サービス依存コンポーネントのテスト戦略

外部サービス（AWS Cognito、Firebase Auth等）に依存するコンポーネントは、以下の優先順位でテスト方法を選択する。

### 優先順位

1. **Context/Providerのモック化（推奨）**
2. **SSテスト + eslint-disable（最終手段）**

### 1. Context/Providerのモック化（推奨）

`playwright/index.tsx`でContextをモック化し、CTテストを実行する。

```typescript
// playwright/index.tsx
import { AuthContext, AuthContextType } from "@/app/features/auth";

const mockAuthContext: AuthContextType = {
  user: { username: "test-user", userId: "test-id" },
  isAuthenticated: true,
  isLoading: false,
  error: null,
  login: async () => {},
  logout: async () => {},
  // ...
};

beforeMount(async ({ App }) => {
  return (
    <AuthContext.Provider value={mockAuthContext}>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </AuthContext.Provider>
  );
});
```

**適用可能なケース:**
- `useAuth`のみを使用するコンポーネント（Header、ナビゲーション等）
- Context経由でデータを受け取るだけのコンポーネント

### 2. SSテストでカバー（最終手段）

以下の条件を**すべて**満たす場合のみ、CTテストを作成せずSSテスト（ルートテスト）でカバーする：

1. コンポーネントが外部サービスへのAPI呼び出しを直接行う
2. 複雑な非同期初期化処理がある
3. Contextモックだけでは再現できない副作用がある

**例:** AuthInitializer（認証状態に応じてAPIを呼び出し、ユーザー登録処理を行う）

### 例外適用時の対応

1. **コンポーネントファイル先頭で`eslint-disable`コメントを追加**

```typescript
// ComponentName.tsx
/* eslint-disable local-rules/component/require-component-test -- 外部サービス依存（useAuth + apiClient）のため、SSテストでカバー */
```

2. **SSテスト（*.ss.test.ts）で暗黙的にカバー**
   - ルートテストでページ全体をレンダリングする際に、該当コンポーネントも含めてテストされる

## 関連ドキュメント

- `10-component-overview.md`: コンポーネント設計概要
- `20-selector-strategy.md`: セレクタ戦略
- `../route/40-test-patterns.md`: ルートテスト（SS）
- `../mock/10-mock-overview.md`: テストデータ命名規則
