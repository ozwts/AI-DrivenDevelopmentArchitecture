# E2Eテスト概要

## 核心原則

E2Eテストは**他のテスト層でカバーできない領域**を検証する。テストピラミッドのMECE原則を基本としつつ、クリティカルなユーザーフローは必要に応じて検証する。

**根拠となる憲法**:
- `testing-principles.md`: テストピラミッド、責務のMECE
- `collaboration-principles.md`: AIと人間の協調

## ポリシー構成

| ファイル | 責務 | 性質 |
|----------|------|------|
| `10-e2e-overview.md` | 概要、判断基準 | 汎用 |
| `20-page-object-pattern.md` | Page Object | 汎用 |
| `30-test-patterns.md` | シナリオ設計パターン | 汎用 |
| `40-authentication.md` | 認証の扱い方 | 汎用 |

## E2E追加の判断基準

### 判断フロー

```
新機能追加
    │
    ▼
ローカルモック困難か？ ─Yes→ E2E追加
    │No
    ▼
クリティカルなユーザーフローか？ ─Yes→ E2E追加を検討
    │No
    ▼
E2E追加なし（Small/Medium/CT/SSで網羅）
```

### ローカルモック困難なサービス

| サービス | 理由 |
|---------|-----|
| 認証サービス | トークン発行・検証が実環境依存 |
| ベクトルDB | 類似検索の精度が実環境依存 |
| 外部API | サードパーティの状態を再現不可 |

**LocalStack/MSWなどでモック可能ならE2E対象外。**

### テスト層との関係

| 検証対象 | 推奨テスト層 |
|---------|-------------|
| ビジネスロジック | UseCase Small |
| ドメインルール | Domain Small |
| DB操作 | Repository Medium |
| API呼び出し | Medium（MSW） |
| 画面表示 | SS（Snapshot） |
| UI操作 | CT（Component） |

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
├── seed.spec.ts          # シードファイル
├── specs/                # テストプラン
├── tests/                # テストファイル
├── pages/                # Page Object
└── fixtures/             # テストデータ
```

## 命名規則

| 対象 | パターン | 例 |
|------|---------|-----|
| テストファイル | `{feature}.spec.ts` | `auth.spec.ts` |
| セットアップ | `{purpose}.setup.ts` | `auth.setup.ts` |
| Page Object | `{Feature}Page.ts` | `LoginPage.ts` |

## 関連ドキュメント

- `20-page-object-pattern.md`: Page Objectパターン
- `30-test-patterns.md`: シナリオ設計パターン
- `40-authentication.md`: 認証の扱い方
