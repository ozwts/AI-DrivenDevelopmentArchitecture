# E2E Tests

Playwright を使用したE2Eテスト。

## セットアップ

### 前提条件

- Node.js
- AWS CLI（認証済み）
- 開発サーバーが起動していること

### 初期セットアップ

```bash
# 依存関係インストール
cd e2e && npm install

# ブラウザインストール
npm run setup:browser

# E2Eユーザー作成（Cognito + SSM）
npm run user:setup

# ブランチ環境の場合
npm run user:setup:branch
```

### E2Eユーザー管理

E2Eテスト用ユーザーはCognitoに作成され、認証情報はSSM Parameter Storeに保存される。

| スクリプト            | 説明                          |
| --------------------- | ----------------------------- |
| `user:setup`          | 共有dev環境にE2Eユーザー作成  |
| `user:setup:branch`   | ブランチ環境にE2Eユーザー作成 |
| `user:destroy`        | 共有dev環境のE2Eユーザー削除  |
| `user:destroy:branch` | ブランチ環境のE2Eユーザー削除 |
| `user:check`          | E2Eユーザーの存在確認         |

## テスト実行

```bash
# 全テスト実行（共有dev環境）
npm test

# ブランチ環境
npm run test:branch

# UIモード
npm run test:ui

# ヘッドありモード
npm run test:headed

# デバッグモード
npm run test:debug

# レポート表示
npm run report
```

### 環境変数

| 変数             | デフォルト              | 説明                        |
| ---------------- | ----------------------- | --------------------------- |
| `E2E_BASE_URL`   | `http://localhost:5173` | フロントエンドURL           |
| `API_BASE_URL`   | `http://localhost:3000` | APIサーバーURL              |
| `SSM_E2E_PREFIX` | `/sandbox-dev/e2e`      | SSMパラメータプレフィックス |

## ディレクトリ構造

```
e2e/
├── playwright.config.ts          # Playwright設定
├── seed.spec.ts                  # Test Agent用シードファイル
├── tests/                        # テストファイル
│   ├── auth.setup.ts             # 認証セットアップ
│   └── {route}/                  # ルート別ディレクトリ
│       └── {action}-{target}.spec.ts
├── pages/                        # Page Object
│   └── {route}/
│       └── {Feature}Page.ts
├── fixtures/                     # 共通ユーティリティ
│   ├── auth.ts                   # SSMから認証情報取得
│   └── api-client.ts             # クリーンアップ用APIクライアント
└── plans/                        # テスト計画（Markdown）
```

## 認証の仕組み

### 認証フロー

```
1. auth.setup.ts が最初に実行される（projects.setup）
2. SSMから認証情報を取得（fixtures/auth.ts）
3. ログイン実行
4. 認証状態を playwright/.auth/user.json に保存
5. 各テストはこの認証状態を再利用
```

### 未認証テスト

認証状態を使わないテストは `storageState` をオーバーライドする：

```typescript
test.use({ storageState: { cookies: [], origins: [] } });
```

## Page Object

### 設計原則

- セレクタ優先順位: `getByRole` > `getByLabel` > `getByTestId`
- 各ページに対応するクラスを作成
- テストファイルで直接Locatorを操作しない

### 例

```typescript
// pages/auth/LoginPage.ts
export class LoginPage {
  readonly emailInput: Locator;

  constructor(page: Page) {
    this.emailInput = page.getByLabel("メールアドレス");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    // ...
  }
}

// tests/auth/login.spec.ts
test("ログイン成功", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.login(email, password);
});
```

## Test Agent

[Playwright Test Agents](https://playwright.dev/docs/test-agents)（v1.56+）が提供するサブエージェント（planner, generator, healer）をベースに、本プロジェクトのポリシーに則って動作するようカスタマイズしたもの。必要なツールを[mcp-filter](https://github.com/kingston/mcp-filter) でフィルタリングし、Playwright MCPと重複する機能は除外。プロンプトで `guardrails/policy/e2e/` の読み込みを必須化。

| エージェント         | 役割             | 定義                                   |
| -------------------- | ---------------- | -------------------------------------- |
| `e2e-test-planner`   | テスト計画作成   | `.claude/agents/e2e-test-planner.md`   |
| `e2e-test-generator` | テストコード生成 | `.claude/agents/e2e-test-generator.md` |
| `e2e-test-healer`    | テスト修復       | `.claude/agents/e2e-test-healer.md`    |

### seed.spec.ts

Test Agentがテスト生成時にページの初期状態をセットアップするために使用。

## 関連ドキュメント

- `guardrails/policy/e2e/` - E2Eテストポリシー
