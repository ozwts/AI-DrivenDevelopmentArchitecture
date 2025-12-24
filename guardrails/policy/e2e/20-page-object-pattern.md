# Page Objectパターン

## 核心原則

Page Objectは**ページのUI構造とテストロジックを分離**し、UI変更時の修正を1箇所に集約する。

**根拠となる憲法**:
- `cohesion-principles.md`: 変更を1箇所に集約

## 責務

### 実施すること

1. **Locatorの提供**: セレクタをカプセル化
2. **操作のカプセル化**: 意味のあるアクション（`login()`, `logout()`）
3. **待機処理**: ページ遷移・ローディング完了の待機

### 実施しないこと

1. **アサーション** → テストファイルで実施
2. **テストデータ生成** → fixturesで管理
3. **複数ページを跨ぐフロー** → テストファイルで組み合わせ

## セレクタ戦略

**優先順位**: `getByRole` > `getByLabel` > `getByTestId`

| 優先度 | セレクタ | 用途 |
|-------|---------|-----|
| 1 | `getByRole` | ボタン、リンク、見出し |
| 2 | `getByLabel` | フォーム入力 |
| 3 | `getByTestId` | 複数要素の区別 |

### getByTestIdの使用条件

- セマンティックなセレクタで特定できない場合のみ

## Do / Don't

### ✅ Good

```typescript
// セマンティックLocator
this.loginButton = page.getByRole("button", { name: "ログイン" });
this.emailInput = page.getByLabel("メールアドレス");
this.passwordInput = page.getByLabel("パスワード");

// Page Object経由で操作
await loginPage.login(E2E_USER.email, E2E_USER.password);
await homePage.logout();
```

### ❌ Bad

```typescript
// CSSセレクタ（NG）
this.loginButton = page.locator("button.btn-primary");

// XPath（NG）
this.emailInput = page.locator("//input[@name='email']");

// テストで直接Locator操作（NG）
await page.getByLabel("メールアドレス").fill("user@example.com");

// 固定待機（NG）
await page.waitForTimeout(2000);
```

## 関連ドキュメント

- `10-e2e-overview.md`: E2Eテスト概要
- `30-test-scenarios.md`: テストシナリオ設計
