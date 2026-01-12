# シナリオ設計パターン

## 核心原則

テストシナリオは**再現可能で独立した検証単位**として設計する。各パターンを組み合わせて網羅的なテストを構築する。

**根拠となる憲法**:
- `testing-principles.md`: 1テスト = 1検証

### ナビゲーションはUI経由で行う

E2Eテストでは**実際のユーザー導線**を検証する。`page.goto(url)`による直接遷移ではなく、UIを通じた遷移を行う。

| 状況 | 方法 |
|------|------|
| テスト開始時 | `goto()`で起点ページに遷移（許可） |
| テスト中の画面遷移 | UI操作（リンク、ボタン）で遷移（必須） |

#### ✅ Good

```typescript
// プロジェクト作成後、一覧から詳細へ遷移
await projectsPage.clickNewProject();
await projectsPage.fillProjectForm(name, description);
await projectsPage.submitForm();

// UI経由で詳細ページへ遷移
await projectsPage.clickProject(projectName);
await expect(projectDetailPage.heading).toBeVisible();
```

#### ❌ Bad

```typescript
// プロジェクト作成後、URLで直接遷移
await projectsPage.submitForm();
const response = await responsePromise;
createdProjectId = response.id;

// 直接遷移はユーザー導線を検証できない
await projectDetailPage.goto(createdProjectId);
```

**理由**: 直接遷移ではナビゲーション導線（リンクの存在、クリック可能性、遷移先の正しさ）を検証できない。

### 検証の完結原則

E2Eテストでは、**操作の結果がユーザーに見える形で正しく反映されているか**まで確認する。中間状態（トースト、URL変化、ローディング）だけで終わらせない。

```
操作実行 → 中間フィードバック確認 → 最終結果の検証（必須）
```

| 操作カテゴリ | 中間確認（不十分） | 最終確認（必須） |
|-------------|-------------------|-----------------|
| データ変更（CRUD） | トースト表示、URL遷移 | 変更後のデータが画面に反映 |
| フィルタリング・検索 | URL変化、ローディング | 絞り込まれた結果の内容 |
| ナビゲーション | URL遷移 | 遷移先の主要コンテンツ表示 |
| 状態変更 | ボタン状態変化 | 変更後の状態がUIに反映 |
| モーダル・ダイアログ | モーダル表示/非表示 | 操作結果が親画面に反映 |
| ファイル操作 | アップロード完了通知 | ファイル一覧に表示 |

### テストの独立性原則

各テストは**自分でテストデータを作成**し、他のテストや既存データに依存しない。

```typescript
// ✅ Good: ユニークなデータを作成
const uniqueId = Date.now();
const title = `テストデータ_${uniqueId}`;

// ❌ Bad: 既存データに依存
const firstItem = page.getByRole("listitem").first();
```

### テストデータのクリーンアップ

テストで作成したデータは**afterEach/afterAllでAPIを直接呼び出して削除**する。

```typescript
import { apiClient } from "../../fixtures/api-client";

test.describe("TODO作成", () => {
  let createdTodoId: string | undefined;

  test.afterEach(async () => {
    if (createdTodoId) {
      await apiClient.delete(`/todos/${createdTodoId}`);
      createdTodoId = undefined;
    }
  });

  test("新規TODOを作成できる", async ({ page }) => {
    // 1. waitForResponseはトリガーアクションより前に設定
    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/todos") &&
        !res.url().includes("/todos/") &&  // 詳細取得を除外
        res.request().method() === "POST"
    );

    // 2. フォーム入力・送信（トリガーアクション）
    await todosPage.goto();
    await todosPage.clickNewTodo();
    await todosPage.fillTodoForm(title, description);
    await todosPage.submitForm();

    // 3. レスポンスを待機してIDを取得
    const response = await responsePromise;
    const responseBody = await response.json();
    createdTodoId = responseBody.id;

    // 4. 検証...
  });
});
```

| ポイント | 説明 |
|---------|------|
| waitForResponse配置 | **トリガーアクションより前**に設定（リスナー登録） |
| URL除外パターン | `/todos/`を除外して作成APIのみキャプチャ |
| APIクライアント | `fixtures/api-client.ts`で認証トークンを自動取得 |
| クリーンアップ | afterEachで作成したリソースを削除 |

## シナリオパターン

テストシナリオは以下のパターンで設計する。

| パターン | 説明 |
|---------|------|
| ハッピーパス | 主要な正常系フロー。ユーザーが期待通りに操作を完了できる |
| エッジケース | 境界条件や特殊な状態での動作 |
| エラーハンドリング | 異常系フロー。エラー発生時の適切な処理と表示 |

### パターンの適用判断

```
対象機能
    │
    ▼
E2E対象か？ ─No→ 他テスト層で検証
    │Yes
    ▼
ハッピーパス設計
    │
    ▼
エッジケース・エラーハンドリング設計
```

E2E対象かどうかは `10-e2e-overview.md` の判断基準を参照。

## フロント・サーバー境界テスト

フロントエンドとサーバー間のデータ受け渡しをテストする際は、**PATCH 3値セマンティクス**を考慮する。

| クライアント送信 | JSON表現 | 意味 |
|----------------|----------|------|
| フィールド省略 | `{}` | 変更しない |
| `null`送信 | `{"field": null}` | クリアする |
| 値を送信 | `{"field": "value"}` | 値を設定 |

nullable フィールド（日付、外部ID、説明文など）に対しては、3値すべての動作を検証する。

詳細は `contract/api/31-patch-semantics.md` を参照。

## 検証の完結パターン（具体例）

以下は「検証の完結原則」の具体的な適用パターン。

### CRUD操作の検証

CRUD操作後は必ず結果を検証する。操作完了のトースト確認だけでなく、**実際のデータが正しく反映されているか**まで確認する。

| 操作 | 検証内容 |
|------|----------|
| Create | 作成後にリストや詳細画面で入力した値が表示されることを確認 |
| Read | 表示された値が期待通りであることを確認 |
| Update | 更新後に変更した値が反映されていることを確認 |
| Delete | 削除後にリストから該当データが消えていることを確認 |

#### ✅ Good

```typescript
test("Todoを作成すると一覧に表示される", async ({ page }) => {
  const title = `Test Todo ${Date.now()}`;

  // 作成操作
  await todosPage.createTodo({ title });

  // トースト確認
  await expect(page.getByRole("status").filter({ hasText: "作成しました" })).toBeVisible();

  // 作成したデータが一覧に表示されることを確認
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
});
```

#### ❌ Bad

```typescript
test("Todoを作成する", async ({ page }) => {
  await todosPage.createTodo({ title: "Test Todo" });

  // トーストだけ確認して終わり - データが正しく保存されたか不明
  await expect(page.getByRole("status")).toBeVisible();
});
```

### フィルタリング・検索操作の検証

フィルタリングや検索操作後は、**結果が正しく絞り込まれているか**まで確認する。URLやUIの状態変化だけでなく、表示されるデータの内容を検証する。

| 操作 | 検証内容 |
|------|----------|
| フィルタリング | 条件に合致するデータが表示されることを確認 |
| 検索 | 検索キーワードに一致するデータが表示されることを確認 |
| ソート | データが期待通りの順序で表示されることを確認 |

#### ✅ Good

```typescript
test("プロジェクトでTODOをフィルタリングできる", async ({ page }) => {
  const uniqueId = Date.now();
  const projectName = `フィルタテストプロジェクト_${uniqueId}`;
  const todoTitle = `フィルタテストTODO_${uniqueId}`;

  // 1. テスト用プロジェクトを作成
  await projectsPage.createProject(projectName);

  // 2. そのプロジェクトにTODOを作成
  await todosPage.createTodo({ title: todoTitle, projectId: projectId });

  // 3. プロジェクトでフィルタリング
  await projectsPage.clickProject(projectName);

  // 4. フィルタリング結果に作成したTODOが表示されることを確認
  await expect(page.getByRole("heading", { name: todoTitle })).toBeVisible();
});
```

#### ❌ Bad

```typescript
test("プロジェクトでTODOをフィルタリングできる", async ({ page }) => {
  // 既存プロジェクトに依存
  await projectHeading.click();

  // URLだけ確認して終わり - 実際にフィルタリングされたか不明
  await expect(page).toHaveURL(/projectId=/);
});
```

## シナリオ構造

各シナリオには以下を含める：

| 要素 | 説明 |
|------|------|
| タイトル | 何を検証するか明確に |
| 前提条件 | 開始状態（認証済み、特定画面など） |
| ステップ | 操作手順 |
| 期待結果 | 検証内容 |

## Do / Don't

### ✅ Good

```typescript
// 1テスト = 1検証
test("ログイン成功でホーム画面に遷移する", async ({ page }) => {
  await loginPage.login(E2E_USER.email, E2E_USER.password);
  await expect(page).toHaveURL("/home");
});

// エラーハンドリングパターン
test("不正な認証情報でエラーメッセージが表示される", async ({ page }) => {
  await loginPage.login("invalid@example.com", "wrongpassword");
  await expect(page.getByRole("alert")).toBeVisible();
});
```

### ❌ Bad

```typescript
// 複数の検証を1テストに詰め込む
test("ログインフロー全体", async ({ page }) => {
  // ログイン成功を検証
  await loginPage.login(validUser);
  await expect(page).toHaveURL("/home");

  // ログアウトも検証（別テストにすべき）
  await homePage.logout();
  await expect(page).toHaveURL("/login");
});
```

## 堅牢なテストコードの原則

テストコードは以下の原則に従って実装する。

| 原則 | 説明 |
|------|------|
| テストの独立性 | 各テストは他のテストやゴミデータに依存せず、自己完結する |
| ユニークなテストデータ | `Date.now()` やUUIDを使用し、テスト間の干渉を防ぐ |
| 明示的な待機 | 適切なLocatorの待機メソッドを使用し、タイミング問題を回避 |
| セマンティックなセレクタ | `getByRole` > `getByLabel` > `getByTestId` の優先順位で要素を特定 |
| Page Object経由の操作 | UI操作はPage Objectにカプセル化し、変更に強い構造を維持 |
| トースト等の一時要素 | `filter({ hasText: })` で特定のメッセージを持つ要素を選択 |
| XPath/CSSセレクタ禁止 | セマンティックなセレクタのみを使用する |

### ✅ Good

```typescript
// ユニークなテストデータを使用
const uniqueId = Date.now();
const todoTitle = `テストTODO_${uniqueId}`;

// セマンティックなセレクタ
await page.getByRole("button", { name: "作成" }).click();

// 特定のメッセージを持つトーストを選択
await expect(page.getByRole("status").filter({ hasText: "作成しました" })).toBeVisible();

// Page Object経由の操作
await todosPage.clickNewTodo();
await todosPage.fillTodoForm(title, description);
```

### ❌ Bad

```typescript
// 固定のテストデータは他のテストと干渉する可能性
const todoTitle = "テストTODO";

// XPath/CSSセレクタは禁止
await page.locator("//button[@class='submit']").click();
await page.locator(".toast-success").waitFor();

// テストファイルで直接Locator操作（Page Objectを使うべき）
await page.getByLabel("タイトル").fill(title);
```

## 関連ドキュメント

- `10-e2e-overview.md`: E2Eテスト概要
- `20-page-object-pattern.md`: Page Objectパターン
- `contract/api/31-patch-semantics.md`: PATCH 3値セマンティクス
