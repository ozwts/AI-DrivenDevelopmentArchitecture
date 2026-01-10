# 機能開発ワークフロー

分散協調による機能開発の標準ワークフロー。
憲法の「共進化主義」に基づき、契約を先に定義し、MCPツールを活用して自律的に実装を進める。

## 原則（憲法より）

> 契約を先に定義し、ポリシーの修正要否を確認した上で、実装を並行して進める。
> — collaboration-principles.md

**ポリシーなき実装は禁止。** ポリシーが存在しない新概念を実装する場合は、先にポリシーを起草し人間のレビューを受けること。

---

## 開発モードの選択

開発サーバーには2つのモードがある。作業内容に応じて適切なモードを選択する。

### `full` モード（API + Web）

**使い所**: サーバーサイド実装時、フロントエンドとサーバーの結合確認時

```
mcp__guardrails__procedure_dev(action='start', mode='full')
```

- 実際のAPIサーバーが起動
- データベース操作が実行される
- サーバーサイドのコード変更がホットリロード

### `mock` モード（モックAPI + Web）

**使い所**: フロントエンドのみ実装時、UIデザイン作業時、サーバー未実装の新機能開発時

```
mcp__guardrails__procedure_dev(action='start', mode='mock')
```

- MSW（Mock Service Worker）によるモックAPI
- サーバーサイドのコードは不要
- `web/src/mocks/` のモックデータを使用
- フロントエンド開発を高速に回せる

---

## フェーズ概要

```
[Phase 1: Contract]     契約定義（ビジネス + API）
        ↓               → 20-contract.md
[Phase 2: Policy]       立法（ポリシー修正・新設の要否確認）
        ↓               → 30-policy.md
[Phase 3: Frontend]     フロントエンド実装（先行・mockモード）
        ↓               → 40-frontend.md
[Phase 4: Server]       サーバーサイド実装（fullモード）
        ↓               → 50-server.md
[Phase 5: Infra]        インフラ変更（必要な場合）
        ↓               → 60-infra.md
[Phase 6: E2E]          E2Eテスト・統合検証
                        → 70-e2e.md
```

**並列処理**: 各Phase内での機能単位での並列実行を推奨。ベースラインの成熟度に応じて、粒度を調整する（API単位で並列、ドメインモデル単位で並列など）

**環境管理**: `80-environment.md` を参照

---

## 分散協調パターン

### パターン1: 順次実行

```
Contract → Policy → Frontend(mock) → Server(full) → Infra → E2E
```

メインセッションで一貫して実行。

### パターン2: Actions移譲

```
[メインセッション]
Contract → Policy → Frontend(mock) → PR作成 ─────────────────→ E2E → 完了
                                        ↓                       ↑
[Claude Code Actions]              Server(full), Infra ─────────┘
```

- 軽量なServer・Infra作業をPR経由でActionsに移譲。なるべく並列度を上げることを推奨。
- メインセッションでは移譲が難しい重たい作業を実施しつつ、Actionsの実行状況を定期的に監視する。
- 実装が完了した機能からE2Eの追加/修正/テストを進める。

---

## レビューと修正

各フェーズの「レビュー」ステップでは、以下の順序で品質を確認する:

1. **静的解析**（最速フィードバック）
2. **定性レビュー**（ポリシー準拠チェック）
3. **修正**: 違反があれば修正し、1に戻る

**並列実行**: レビューと修正はサブエージェント（`guardrails-reviewer`, `violation-fixer`）を使って並列実行を推奨。

---

## 引き継ぎ

憲法より:

> 意図、依存、次ステップを記録させる。任意の時点で、別のAIまたは人間が継続できるようにする。

各フェーズ完了時にワークフロータスクを更新:

```
mcp__guardrails__procedure_workflow(action='done', index=1)
```

---

## MCPツール一覧

### レビュー（司法）

| ツール                         | 用途                   |
| ------------------------------ | ---------------------- |
| `review_qualitative`           | ポリシー準拠チェック   |
| `review_static_analysis`       | TypeScript + ESLint    |
| `review_unused_exports`        | 未使用エクスポート検出 |
| `review_infra_static_analysis` | Terraform解析          |

### プロシージャ（行政）

| ツール                 | 用途                          |
| ---------------------- | ----------------------------- |
| `procedure_dev`        | 開発サーバー管理（full/mock） |
| `procedure_test`       | テスト実行                    |
| `procedure_fix`        | 自動修正                      |
| `procedure_codegen`    | コード生成                    |
| `procedure_deploy_dev` | デプロイ管理                  |
| `procedure_e2e_setup`  | E2E環境セットアップ           |
| `procedure_workflow`   | タスク管理                    |
