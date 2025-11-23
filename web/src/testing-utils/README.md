# Testing Utilities

テストおよび開発時に使用するモックデータとユーティリティを提供します。

## 📋 目次

1. [Playwrightテスト戦略](#playwrightテスト戦略) ⭐ 重要
2. [モックデータ](#モックデータ-mock-datats)
3. [MSWモックサーバー](#mswモックサーバー-mockts)
4. [テストコマンド](#テストコマンド)

---

## Playwrightテスト戦略

### テストタイプと役割分担

| テストタイプ | ファイル | 目的 | 粒度 | 検証方法 |
|------------|---------|------|------|---------|
| **コンポーネントテスト** | `*.ct.test.tsx` | 機能・アクセシビリティ | **細分化**（1機能=1テスト） | `expect()` |
| **スナップショットテスト** | `*.ss.test.ts` | 視覚的回帰 | **粗分化**（1画面状態=1テスト） | `toHaveScreenshot()` |

### セレクタ戦略

**基本方針:**
- **操作**: `data-testid` （安定性・国際化対応）
- **検証**: `getByRole`, `getByLabel` （アクセシビリティ保証）

| 用途 | コンポーネントテスト | スナップショットテスト |
|------|-------------------|---------------------|
| 要素取得 | `getByTestId()` | `getByTestId()` |
| a11y検証 | `getByRole()`, `getByLabel()` | **不要** |
| 結果検証 | `expect().toBeVisible()` | `toHaveScreenshot()` |

**命名規則:**
```typescript
// ボタン
data-testid="create-button" | "submit-button" | "cancel-button"

// 入力フィールド
data-testid="input-{name}"  // input-title, input-email

// 動的要素
data-testid="{type}-{id}"   // todo-card-123, user-item-456

// セクション
data-testid="{name}-section" // file-upload-section, error-section
```

### ✅ Do / ❌ Don't

<details>
<summary><b>✅ Good: data-testid + アクセシビリティ検証</b></summary>

```typescript
// コンポーネント
<button data-testid="submit-button" onClick={handleSubmit}>送信</button>

// コンポーネントテスト
test('送信ボタン', async ({ mount }) => {
  const component = await mount(<Form {...props} />);
  const btn = component.getByTestId('submit-button');

  // a11y検証
  await expect(btn).toHaveRole('button');
  await expect(btn).toHaveAttribute('type', 'submit');

  // 操作
  await btn.click();
});

// スナップショットテスト
test('[SS]フォーム表示', async ({ page }) => {
  await page.goto('/form');
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot({ fullPage: true });
  // ↑ ボタンの表示はスクリーンショットで確認
});
```
</details>

<details>
<summary><b>❌ Bad: テキストセレクタ・過剰な検証</b></summary>

```typescript
// ❌ テキストセレクタ（国際化で壊れる）
await page.click('button:has-text("送信")');
await component.getByText("ファイル添付").click();

// ❌ CSSセレクタ（リファクタリングで壊れる）
await page.click('.btn-primary');

// ❌ スナップショットテストで過剰な検証
test('[SS]フォーム表示', async ({ page }) => {
  await page.goto('/form');
  await expect(page.getByRole('button')).toBeVisible(); // ← 不要
  await expect(page).toHaveScreenshot(); // ← これで十分
});
```
</details>

### コンポーネントテスト（*.ct.test.tsx）

**粒度: 1テストケース = 1機能**

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

**分割基準:**
- 機能単位（入力、選択、削除）
- バリデーション単位（必須、文字数、形式）
- 境界値単位（最小値、最大値、範囲外）
- 状態単位（新規、編集、読み取り専用）

**テンプレート:**

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

**エラーメッセージの検証:**

```typescript
// ✅ Good: role="alert" でスコープ限定
const errorAlert = component.getByRole('alert');
await expect(errorAlert).toBeVisible();
await expect(errorAlert).toContainText(/200.*文字/);

// ❌ Bad: グローバルにテキスト検索
await expect(component.getByText(/200.*文字/)).toBeVisible();
```

**動的コンテンツ:**

```typescript
// ✅ 許容（コメント推奨）
// ファイル名は動的コンテンツのためgetByTextを使用
await expect(component.getByText('test.txt')).toBeVisible();
```

### スナップショットテスト（*.ss.test.ts）

**粒度: 1テストケース = 1画面状態**

```typescript
// ✅ 画面状態ごとに分割
test("[SS]TODOページ", async ({ page }) => { ... });
test("[SS]TODOページ（空）", async ({ page }) => { ... });
test("[SS]TODOページ（モーダル表示）", async ({ page }) => { ... });

// ❌ 細かすぎる分割
test("[SS]ボタン表示", async ({ page }) => { ... }); // ← 通常状態に含まれる
test("[SS]リスト表示", async ({ page }) => { ... }); // ← 通常状態に含まれる
```

**分割基準:**
- ページ状態（通常、空、ローディング、エラー）
- モーダル・ダイアログ（作成、編集、削除確認）
- フィルター・検索結果
- データ有無（添付ファイルあり/なし）

**テンプレート:**

```typescript
test('[SS]画面名（状態）', async ({ page }) => {
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
  await page.goto('/path');
  await page.waitForLoadState("networkidle");

  // 4. 操作（必要な場合のみ）
  await page.getByTestId('action-button').click();
  await page.waitForLoadState("networkidle");

  // 5. スクリーンショット（検証はこれのみ）
  await expect(page).toHaveScreenshot({ fullPage: true });
});
```

**重要な原則:**
- スクリーンショット = 表示の証明
- `expect().toBeVisible()` は不要（冗長）
- アクセシビリティ検証は不要（コンポーネントテストで実施）

---

## モックデータ (mock-data.ts)

| 種類 | 命名規則 | 用途 | 特徴 |
|------|---------|------|------|
| コンポーネントテスト用 | `mock*` | `*.ct.test.tsx` | 固定日付、最小限の構造 |
| スナップショット/MSW用 | `*Dummy*` | `*.ss.test.ts`, 開発環境 | 相対日付、リアルなデータ |

**時間の固定（重要）:**

```typescript
// スナップショットテストでは必ず時間を固定
await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });
```

---

## MSWモックサーバー (mock.ts)

Mock Service Worker (MSW) で開発環境のAPIをモック。`main.tsx`で自動起動。

**モード:**
- `HAS_ALL`: サンプルデータあり（デフォルト）
- `EMPTY`: データなし

**開発環境:** `src/config.local.ts` の `mockType` で設定

**テストでのモード指定:**

```typescript
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
```

---

## テストコマンド

```bash
# コンポーネントテスト
npm run test:ct              # 実行
npm run test:ct:ui           # UIモード

# スナップショットテスト
npm run test:ss              # 実行
npm run test:ss:update       # スクリーンショット更新
npm run test:ss:refresh      # スクリーンショット再生成
npm run test:ss:ui           # UIモード

# すべてのテスト
npm run test
```

---

## トラブルシューティング

| 問題 | 原因 | 解決策 |
|------|------|--------|
| スナップショット差分 | 時間依存の表示 | `page.clock.install()` で時間固定 |
| スナップショット差分 | ランダム値 | `Math.random()` のモック |
| スナップショット差分 | 非同期未完了 | `waitForLoadState("networkidle")` 追加 |
| MSW動作しない | Service Worker未インストール | `npx msw init public/ --save` |

---

## 参考資料

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Testing Library](https://playwright.dev/docs/best-practices)
- [Mock Service Worker (MSW)](https://mswjs.io/)
- [Web Accessibility (a11y)](https://www.w3.org/WAI/WCAG21/quickref/)
