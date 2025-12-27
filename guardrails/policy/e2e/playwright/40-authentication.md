# 認証の扱い方

## 核心原則

認証状態は**テスト実行前にセットアップ**し、認証済み状態を再利用する。各テストでログイン処理を繰り返さない。

**根拠となる憲法**:
- `operations-principles.md`: 効率的な操作環境

## 責務

### 実施すること

1. **認証状態の保存**: `storageState`で認証済み状態を保存
2. **状態の再利用**: 各テストで保存済み状態を使用
3. **認証情報の一元管理**: fixturesで管理

### 実施しないこと

1. **各テストでログイン処理** → セットアップで一度だけ
2. **認証情報のハードコード** → fixtures/auth.tsで管理

## 認証セットアップ

### Playwrightのproject依存関係

```typescript
// playwright.config.ts
projects: [
  { name: "setup", testMatch: /.*\.setup\.ts/ },
  {
    name: "chromium",
    use: { storageState: "playwright/.auth/user.json" },
    dependencies: ["setup"],
  },
]
```

## E2Eユーザーのセットアップ

```bash
cd e2e
npm run user:setup
```

## Do / Don't

### ✅ Good

```typescript
// セットアップで認証状態を保存し再利用
{ dependencies: ["setup"] }

// 認証情報は fixtures で一元管理
import { E2E_USER } from "../fixtures/auth";
await loginPage.login(E2E_USER.email, E2E_USER.password);

// 未認証テストは明示的にstorageStateをクリア
test.use({ storageState: { cookies: [], origins: [] } });
```

### ❌ Bad

```typescript
// 各テストでログイン処理を繰り返す（NG）
test("アイテムを作成", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill("user@example.com");
  // ...
});

// 認証情報をテストにハードコード（NG）
const email = "e2e-test@example.com";
const password = "secret123";
```

## 関連ドキュメント

- `10-e2e-overview.md`: E2Eテスト概要
- `20-page-object-pattern.md`: Page Objectパターン
- `30-test-patterns.md`: シナリオ設計パターン
