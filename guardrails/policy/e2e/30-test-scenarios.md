# テストシナリオ設計

## 核心原則

E2Eテストは**ローカルモック困難なサービスの検証**に集中する。MECE原則により、他テスト層でカバー済みの内容は対象外。

**根拠となる憲法**:
- `testing-principles.md`: 責務のMECE、1テスト = 1検証

## 責務

### 実施すること

1. **認証フロー**: Cognito実環境でのトークン発行・検証
2. **セッション管理**: 期限切れ、再ログイン

### 実施しないこと

1. **画面表示の検証** → SS（Snapshot）
2. **CRUD操作** → UseCase Small + Handler
3. **UIインタラクション** → CT（Component）

## E2E対象シナリオ

### 認証フロー

| シナリオ | 検証内容 | なぜE2Eか |
|---------|---------|----------|
| ログイン成功 | 正しい認証情報でホーム遷移 | Cognitoトークン発行 |
| ログアウト | ログイン画面へ遷移 | トークン破棄 |
| セッション切れ | 401→ログイン画面→再ログイン | 複数層の連携 |

### 将来的な拡張候補

| サービス | シナリオ | 追加条件 |
|---------|---------|---------|
| ベクトルDB | 類似検索 | 導入時 |
| 外部API | サードパーティ連携 | 導入時 |

## E2E対象外（他テストでカバー）

| シナリオ | 代替テスト |
|---------|----------|
| TODO作成→一覧表示 | UseCase Small + SS |
| TODO編集→保存 | UseCase Small + SS |
| プロジェクト管理 | UseCase Small + SS |
| フォーム入力 | CT（Component） |

## Do / Don't

### ✅ Good

```typescript
// 認証フローに集中
test("ログイン成功でホーム画面に遷移する", async ({ page }) => {
  await loginPage.login(E2E_USER.email, E2E_USER.password);
  await expect(page).toHaveURL("/home");
});

test("ログアウトでログイン画面に遷移する", async ({ page }) => {
  await homePage.logout();
  await expect(page).toHaveURL("/login");
});
```

### ❌ Bad

```typescript
// 画面ごとのE2E（SSで十分）
test("TODOページが表示される", async ({ page }) => { ... });

// CRUDのE2E（UseCase Smallで十分）
test("TODOを作成できる", async ({ page }) => { ... });
test("TODOを編集できる", async ({ page }) => { ... });
test("TODOを削除できる", async ({ page }) => { ... });
```

## 関連ドキュメント

- `10-e2e-overview.md`: E2Eテスト概要
- `40-authentication.md`: 認証の扱い方
