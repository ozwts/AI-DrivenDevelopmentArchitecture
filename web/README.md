# Web - フロントエンド

React Router v7 + TanStack Query + TailwindCSSを使用したモダンなフロントエンドアプリケーション。

## 技術スタック

| カテゴリ | 技術 | バージョン |
|---------|------|-----------|
| Framework | React | 18.x |
| Router | React Router | 7.x |
| Build Tool | Vite | 6.x |
| Styling | TailwindCSS | 3.x |
| State | TanStack Query | 4.x |
| Form | React Hook Form + Zod | 7.x / 3.x |
| Auth | AWS Amplify | 6.x |
| Testing | Playwright CT/SS | 1.57.x |
| Mock | MSW | 2.x |
| Icons | Heroicons | 2.x |

## ディレクトリ構成

```
web/
├── src/
│   ├── app/
│   │   ├── routes/          # ルート（機能境界）
│   │   │   └── (user)/      # 認証済みルート
│   │   │       ├── todos/   # TODO機能
│   │   │       ├── projects/ # プロジェクト機能
│   │   │       ├── profile/ # プロフィール機能
│   │   │       └── auth/    # 認証機能
│   │   │
│   │   ├── features/        # 3+ルートで共有する機能
│   │   │   ├── auth/        # 認証（Provider, hooks, API）
│   │   │   ├── todo/        # TODO共有機能
│   │   │   ├── project/     # プロジェクト共有機能
│   │   │   └── user/        # ユーザー共有機能
│   │   │
│   │   ├── lib/             # 技術基盤
│   │   │   ├── api/         # APIクライアント
│   │   │   ├── ui/          # UIプリミティブ
│   │   │   ├── hooks/       # 汎用hooks
│   │   │   ├── contexts/    # 汎用Context
│   │   │   ├── logger/      # ロギング基盤
│   │   │   └── error/       # エラーハンドリング
│   │   │
│   │   ├── routes.ts        # ルート定義
│   │   ├── root.tsx         # ルートレイアウト
│   │   └── entry.client.tsx # クライアントエントリ
│   │
│   ├── config/              # 環境別設定
│   ├── mocks/               # MSWモックハンドラ
│   └── generated/           # OpenAPI自動生成
│
├── playwright-ct.config.ts  # コンポーネントテスト設定
├── playwright-ss.config.ts  # スナップショットテスト設定
└── package.json
```

## 設計思想・実装ガイドライン

設計思想、実装パターン、テスト戦略については **Guardrails ポリシー** を参照：

| レイヤー | ポリシー | 概要 |
|---------|---------|------|
| ルート設計 | `guardrails/policy/web/route/` | 機能境界, コロケーション |
| Feature設計 | `guardrails/policy/web/feature/` | 3+ルート共有, Provider |
| コンポーネント | `guardrails/policy/web/component/` | ルート/Feature固有 |
| UIプリミティブ | `guardrails/policy/web/ui/` | Leaf/Composite, CVA |
| デザイン原則 | `guardrails/policy/web/design/` | 整列, 近接, コントラスト, 反復 |
| Hooks | `guardrails/policy/web/hooks/` | TanStack Query パターン |
| API通信 | `guardrails/policy/web/api/` | 型安全クライアント |
| Lib層 | `guardrails/policy/web/lib/` | 技術基盤, Context |
| Logger | `guardrails/policy/web/logger/` | Observabilityロギング |
| Mock | `guardrails/policy/web/mock/` | MSWハンドラ, テストデータ |

## コマンド

以下のコマンドは`web/`ディレクトリ内で実行する。

```bash
cd web
```

### 開発

```bash
# MSWモックモード（AWS不要）
npm run dev:mock

# ローカルサーバー + ブランチ環境
npm run dev:local

# ブランチ環境API直接接続
npm run dev
```

### テスト

```bash
# 全テスト（コンポーネント + スナップショット）
npm test

# コンポーネントテストのみ
npm run test:ct

# スナップショットテストのみ
npm run test:ss

# テストUI
npm run test:ct:ui
npm run test:ss:ui

# スナップショット更新
npm run test:ss:update

# スナップショットリフレッシュ（全削除→再生成）
npm run test:ss:refresh
```

### バリデーション

```bash
# TypeScript + ESLint
npm run validate

# TypeScriptのみ
npm run validate:tsc

# ESLintのみ
npm run validate:lint
```

### ビルド

```bash
# プロダクションビルド
npm run build

# ブランチ環境用ビルド
npm run build:branch

# コード生成（OpenAPI → Zod）
npm run codegen
```

### フォーマット

```bash
# すべて修正
npm run fix

# Prettier修正
npm run fix:format

# ESLint修正
npm run fix:lint
```

## 開発モード

| モード | コマンド | API接続先 | 用途 |
|--------|---------|----------|------|
| モック | `dev:mock` | MSW (ブラウザ内) | UI開発, AWS不要 |
| ローカル | `dev:local` | localhost:3000 | サーバー統合テスト |
| リモート | `dev` | ブランチ環境API | デプロイ後確認 |

## テスト戦略

| テスト種別 | 拡張子 | 対象 |
|-----------|--------|------|
| コンポーネント | `*.ct.test.tsx` | UIプリミティブ, フォーム |
| スナップショット | `*.ss.test.ts` | ページ全体のレイアウト |

```
src/app/lib/ui/Button.ct.test.tsx      # コンポーネントテスト
src/app/routes/.../route.ss.test.ts    # スナップショットテスト
```

## トラブルシューティング

### MSWが動作しない

```bash
# Service Workerを再生成
npx msw init public/ --save

# ブラウザのキャッシュをクリア
```

### テストが失敗する

```bash
# テストキャッシュをクリア
rm -rf test-results playwright-report

# ブラウザを再インストール
npm run setup:browser

# 再実行
npm test
```

### ビルドエラー

```bash
# 依存関係を再インストール
rm -rf node_modules
npm ci

# 型生成
npm run typegen

# TypeScript検証
npm run validate:tsc
```

## 参考資料

- [React](https://react.dev/)
- [React Router](https://reactrouter.com/)
- [Vite](https://vitejs.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
- [MSW](https://mswjs.io/)
- [Playwright](https://playwright.dev/)
- [AWS Amplify](https://docs.amplify.aws/)
