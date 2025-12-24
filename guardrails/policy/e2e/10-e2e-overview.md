# E2Eテスト概要

## 核心原則

E2Eテストは**他のテスト層でカバーできない領域のみ**を検証する。テストピラミッドのMECE原則により、Small/Medium/CT/SSで検証済みの内容をE2Eで重複させない。

**根拠となる憲法**:
- `testing-principles.md`: テストピラミッド、責務のMECE
- `collaboration-principles.md`: AIと人間の協調

## ポリシー構成

| ファイル | 責務 | キーワード |
|----------|------|-----------|
| `10-e2e-overview.md` | 概要 | MECE、判断基準、AI駆動 |
| `20-page-object-pattern.md` | Page Object | セレクタ戦略、カプセル化 |
| `30-test-scenarios.md` | シナリオ設計 | ハッピーパス、エッジケース |
| `40-authentication.md` | 認証 | storageState、セットアップ |

## E2E追加の判断基準

### 判断フロー

```
新機能追加
    │
    ▼
ローカルモック困難か？ ─Yes→ E2E追加
    │No
    ▼
E2E追加なし（Small/Medium/CT/SSで網羅）
```

### ローカルモック困難なサービス

| サービス | 理由 |
|---------|-----|
| Cognito認証 | トークン発行・検証が実環境依存 |
| ベクトルDB | 類似検索の精度が実環境依存 |
| 外部API | サードパーティの状態を再現不可 |

**LocalStack/MSWなどでモック可能ならE2E対象外。**

### E2Eに追加しない（既存テストでカバー済み）

| 検証対象 | カバーするテスト | E2E対象 |
|---------|----------------|---------|
| ビジネスロジック | UseCase Small | × |
| ドメインルール | Domain Small | × |
| DB操作 | Repository Medium（LocalStack） | × |
| S3操作 | Medium（LocalStack） | × |
| API呼び出し | Medium（MSW） | × |
| 画面表示 | SS（Snapshot） | × |
| UI操作 | CT（Component） | × |

## 責務

### 実施すること

1. **ローカルモック困難なサービスの検証**: Cognito認証フロー
2. **クリティカルな認証フロー**: ログイン、ログアウト、セッション管理

### 実施しないこと

1. **画面ごとのテスト** → SS（Snapshot）で実施済み
2. **CRUDごとのテスト** → UseCase Small + Handler で実施済み
3. **UIインタラクション** → CT（Component）で実施済み
4. **ローカルモック可能なサービス** → Medium で実施済み

## このプロジェクトのE2E対象

| シナリオ | 理由 |
|---------|-----|
| ログイン → ホーム遷移 | Cognito実フロー |
| ログアウト → ログイン画面 | トークン破棄 |
| セッション切れ → 再ログイン | 401ハンドリング |

**上記以外はE2E対象外。**

## AI駆動テストの方針

| フェーズ | AIの役割 | 人間の役割 |
|---------|---------|-----------|
| テスト計画 | シナリオ案の生成 | 優先度判断、承認 |
| テスト実装 | コード生成 | レビュー、品質担保 |
| メンテナンス | 自己修復、差分検出 | 修復結果の確認 |
| 失敗分析 | 原因推定、修正案提示 | 最終判断 |

## ディレクトリ構造

```
e2e/
├── playwright.config.ts
├── package.json
├── tests/
│   ├── auth.setup.ts         # 認証セットアップ
│   └── auth.spec.ts          # 認証フローテスト
├── pages/
│   └── LoginPage.ts
└── fixtures/
    └── auth.ts
```

## 命名規則

| 対象 | パターン | 例 |
|------|---------|-----|
| テストファイル | `{feature}.spec.ts` | `auth.spec.ts` |
| セットアップ | `{purpose}.setup.ts` | `auth.setup.ts` |
| Page Object | `{Feature}Page.ts` | `LoginPage.ts` |

## Do / Don't

### ✅ Good

```typescript
// 認証フローのみE2Eでテスト
test("ログインするとホーム画面に遷移する", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(E2E_USER.email, E2E_USER.password);
  await expect(page).toHaveURL("/home");
});
```

### ❌ Bad

```typescript
// 画面ごとのE2E（SSで十分）
test("TODOページが表示される", async ({ page }) => {
  await page.goto("/todos");
  await expect(page.getByText("TODO一覧")).toBeVisible();
});

// CRUDごとのE2E（UseCase Smallで十分）
test("TODOを作成できる", async ({ page }) => {
  // ...
});
```

## 関連ドキュメント

- `20-page-object-pattern.md`: Page Objectパターン
- `30-test-scenarios.md`: テストシナリオ設計
- `40-authentication.md`: 認証の扱い方
- `../../constitution/co-evolution/testing-principles.md`: テストの原則
