# サーバー実装ワークフロー

リポジトリ実装、ユースケース、ハンドラ、DIコンテナを実装する。

## タスク計画ガイド

このフェーズで作成する成果物と、タスク分割の指針。

### 主要成果物

| 成果物 | 実装先 | 粒度 |
|--------|--------|------|
| リポジトリ実装 | `server/src/infrastructure/repository/{aggregate}/` | 集約ごとに1タスク |
| リポジトリレビュー | - | 全リポジトリをまとめて1タスク |
| ユースケース | `server/src/application/use-case/{domain}/{action}.ts` | アクションごとに1タスク |
| ユースケースレビュー | - | ドメインごとに1タスク |
| ハンドラ | `server/src/handler/hono-handler/{domain}/` | ドメインごとに1タスク |
| DI設定 | `server/src/di-container/` | 1タスク |
| ハンドラ・DIレビュー | - | 1タスク |
| ポート実装 | `server/src/infrastructure/{port}/` | ポートごとに1タスク（必要な場合） |
| テスト | `*.test.ts` | レイヤーごとに1タスク |
| 最終検証 | - | 1タスク |

### タスク分割ルール

1. **レイヤー順に実装**: Repository → UseCase → Handler → DI
2. **ユースケースはアクション単位**: create, update, delete は別タスク
3. **ハンドラはドメイン単位**: 同一ドメインのエンドポイントをまとめて実装
4. **テストはレイヤーごと**: Repository, UseCase それぞれでテスト
5. **必須の終了タスク**: 「計画見直し」「コミット・プッシュ・PR更新」を最後に追加

### タスク例（Project機能を実装する場合）

```
1. server/src/infrastructure/repository/project/ にリポジトリ実装
2. リポジトリ実装をレビュー
3. server/src/application/use-case/project/create-project.ts を実装
4. server/src/application/use-case/project/update-project.ts を実装
5. server/src/application/use-case/project/delete-project.ts を実装
6. Projectユースケースをレビュー
7. server/src/handler/hono-handler/project/ にハンドラを実装
8. server/src/di-container/ にDI設定を追加
9. ハンドラ・DI設定をレビュー
10. リポジトリのテストを実装・実行
11. ユースケースのテストを実装・実行
12. 最終検証（静的解析、未使用エクスポート、開発サーバー起動）
13. 後続フェーズの作業計画を見直す
14. Server/Implementフェーズの成果物をコミット・プッシュ・PR更新
```

---

## 対象スコープ

- `server/src/infrastructure/repository/` - リポジトリ実装
- `server/src/application/use-case/` - ユースケース
- `server/src/handler/` - ハンドラ
- `server/src/di-container/` - DIコンテナ

## 前提条件

Server/Coreフェーズが完了していること（ドメインモデルとポートが定義済み）

## 開発モード

```
mcp__guardrails__procedure_dev(action='start', mode='full')
```

---

## ステップ 0: 要件確認

**読むもの:**

- `server/src/domain/model/` - ドメインモデル（Server/Coreフェーズで実装済み）
- `server/src/application/port/` - ポートインターフェース
- `contracts/api/` - API契約

---

## ステップ 1: リポジトリの実装

**ポリシー:** `guardrails/policy/server/repository/`

**実装先:** `server/src/infrastructure/repository/`

**実装内容:**
- ドメインモデルで定義したリポジトリインターフェースの実装
- DynamoDB操作の実装
- ドメインモデルとDBフォーマット間の変換

**完了条件:** 静的解析パス、定性レビューパス、コミット

---

## ステップ 2: ユースケースの実装

**ポリシー:** `guardrails/policy/server/use-case/`

**実装先:** `server/src/application/use-case/`

**実装内容:**
- ビジネスロジックの実装
- Result型パターンの適用
- リポジトリとポートの呼び出し

**完了条件:** 静的解析パス、定性レビューパス、コミット

---

## ステップ 3: ハンドラとDIの実装

**ポリシー:**

- `guardrails/policy/server/handler/`
- `guardrails/policy/server/di-container/`

**実装先:**

- `server/src/handler/hono-handler/`
- `server/src/di-container/`

**実装内容:**
- HTTPリクエスト/レスポンス処理
- 入力バリデーション（OpenAPI生成型による型制約）
- 依存性の解決とComposition Root

**完了条件:** 静的解析パス、定性レビューパス（各ポリシーを並列実行）、コミット

---

## ステップ 4: ポート実装の追加（必要な場合）

**ポリシー:**

- `guardrails/policy/server/auth-client/`
- `guardrails/policy/server/storage-client/`
- `guardrails/policy/server/logger/`
- `guardrails/policy/server/fetch-now/`

**実装先:** `server/src/infrastructure/`

**実装内容:**
- ポートインターフェースの具象実装
- 外部サービスとの連携実装

**完了条件:** 静的解析パス、定性レビューパス、コミット

---

## ステップ 5: テストの実装

**ポリシー:**

- `guardrails/policy/server/repository/40-test-patterns.md`
- `guardrails/policy/server/use-case/30-testing-overview.md`

**実装先:** `server/src/` 配下の `*.test.ts` ファイル

**テスト実行:**

```
mcp__guardrails__procedure_test(target='server')
```

**完了条件:** 静的解析パス、定性レビューパス、テスト成功、コミット

---

## ステップ 6: 最終検証

```
mcp__guardrails__review_static_analysis(workspace='server', targetDirectories=['server/src/'])
mcp__guardrails__review_unused_exports(workspace='server')
mcp__guardrails__procedure_fix(workspace='server')
mcp__guardrails__procedure_dev(action='start', mode='full')
```

今回実装した箇所に関わる全ての観点で定性レビューを実施する（並列実行可能）。

**完了条件:** 全レビューパス、開発サーバー起動確認

---

## 契約変更が必要な場合

1. `contracts/api/` のOpenAPI仕様を修正
2. `contracts/business/` のビジネスルールを修正（必要な場合）
3. `mcp__guardrails__procedure_codegen(workspace='server')`
4. 影響箇所を修正して実装を継続

**フロントエンド実装済みの場合:**
契約変更はフロントエンドにも影響するため、**メインセッションに差し戻す**こと。

差し戻し時の手順:
1. 以下の引き継ぎ情報を報告:
   - 契約変更が必要な理由
   - 必要な変更内容（エンドポイント、スキーマなど）
   - 実装済み部分の概要（活用できる設計判断など）
2. メインセッションがブランチを破棄
3. メインセッションで契約修正とフロントエンド対応を調整後、再度サーバー実装を開始

---

## ステップ 7: フェーズ完了チェックポイント

このフェーズで得られた知見を踏まえ、後続タスクの計画を見直す。

**確認すること:**

1. インフラ変更の必要性（テーブル追加、GSI追加、環境変数など）
2. E2Eテストへの影響
3. 追加で必要になったタスク
4. 不要になったタスク

**見直しが必要な場合:**

```
mcp__guardrails__procedure_workflow(action='list')  // 現在の状態を確認
mcp__guardrails__procedure_workflow(action='set', tasks=[
  // 完了済みタスクはdone: trueで保持
  { what: "完了済みタスク", ..., done: true },
  // 新しい計画
  { what: "新タスク", ... }
])
```

**見直し不要の場合:** そのまま次フェーズへ進む

---

## ステップ 8: コミット＆PR更新

### 1. リモート同期

```bash
git fetch origin && git rebase origin/{current-branch}
```

### 2. コミット＆プッシュ

```bash
git add -A
git commit -m "feat(server): implement use cases, repositories, and handlers"
git push origin {current-branch}
```

### 3. PR更新

GitHub MCPサーバーでPRボディを更新（`.github/PULL_REQUEST_TEMPLATE.md` に従う）：

- 完了タスクにチェックを入れる
- 見直し結果を反映（タスクの追加・削除・修正）
- 特記事項を追記（必要な場合）

**完了条件:** コミット成功、プッシュ成功、PR更新完了

---

## 完了条件

- リポジトリ実装完了
- ユースケース実装完了
- ハンドラ実装完了
- DI設定完了
- テスト成功
- 静的解析通過
- ポリシーレビュー通過
- 開発サーバー起動確認
