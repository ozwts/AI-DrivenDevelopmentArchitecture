# シナリオ設計パターン

## 核心原則

テストシナリオは**再現可能で独立した検証単位**として設計する。各パターンを組み合わせて網羅的なテストを構築する。

**根拠となる憲法**:
- `testing-principles.md`: 1テスト = 1検証

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

## 関連ドキュメント

- `10-e2e-overview.md`: E2Eテスト概要
- `contract/api/31-patch-semantics.md`: PATCH 3値セマンティクス
