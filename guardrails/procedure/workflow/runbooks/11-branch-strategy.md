# ブランチ戦略

## PRラベルによるフロー制御

### トリガー

| ラベル            | 付与者                    | 意味                      |
| ----------------- | ------------------------- | ------------------------- |
| `agent:request`   | 人間/AI(メインセッション) | Actionsに作業依頼         |
| `ci:fix-required` | CI                        | CI失敗、Actionsに修正依頼 |

### 進捗状態

| ラベル              | 付与者  | 意味                   |
| ------------------- | ------- | ---------------------- |
| `agent:in-progress` | Actions | 作業中                 |
| `agent:done`        | Actions | 作業完了、レビュー待ち |
| `agent:blocked`     | Actions | 人間の判断が必要       |

### 人間の判断

| ラベル           | 付与者 | 意味         |
| ---------------- | ------ | ------------ |
| `human:approved` | 人間   | レビュー完了 |

### フロー例

```
[通常フロー]
PR作成 + agent:request → agent:in-progress → agent:done → human:approved → マージ

[CI修正フロー]
PR作成 → CI失敗 + ci:fix-required → agent:in-progress → agent:done → CI成功 → マージ

[ブロック時]
agent:in-progress → agent:blocked（質問コメント）→ 人間回答 → agent:request → 再開
```

---

## ブランチ命名規則

| 作業者              | プレフィックス       | 例                                           |
| ------------------- | -------------------- | -------------------------------------------- |
| メインセッション    | `feature/`, `fix/`   | `feature/add-todo-filter`, `fix/login-error` |
| Claude Code Actions | `agent/{timestamp}-` | `agent/20251228-1430-server-todo-api`        |

タイムスタンプ形式: `YYYYMMDD-HHmm`

---

## メインセッション

```
main
  └── feature/xxx または fix/xxx
```

- 機能開発: `feature/{機能名}`
- バグ修正: `fix/{問題名}`
- メインセッションで作成・管理
- 完了後に main へマージ

---

## Actions移譲時

```
main
  └── feature/xxx（メインセッション）
        └── agent/xxx（Actions）
```

1. メインセッションで `feature/xxx` を作成
2. PRを作成し、Actionsに `agent/xxx` ブランチで作業させる
3. Actions完了後、`agent/xxx` を `feature/xxx` にマージ
4. メインセッションでE2E実行後、`feature/xxx` を main にマージ

---

## ブランチ環境との関係

`80-environment.md` 参照。

- ブランチ名から環境名のハッシュを生成
- `feature/xxx` → `sandbox-dev-{hash}-*`
- 各ブランチで独立した検証環境を構築可能

---

## コミット規約

### フェーズごとのコミット

各フェーズ完了時にコミット・プッシュを行う。フェーズの成果物を1コミットにまとめる。

### コミットメッセージ形式

```
{prefix}({scope}): {簡潔な説明}

{詳細（任意）}
```

### Prefix（フェーズ対応）

| Prefix | フェーズ | 用途 |
|--------|----------|------|
| `contract` | 契約 | ビジネス契約・API契約の追加・変更 |
| `policy` | ポリシー | ポリシーの追加・変更 |
| `feat` | Frontend/Server | 新機能の実装 |
| `fix` | Frontend/Server | バグ修正 |
| `refactor` | Frontend/Server | リファクタリング |
| `test` | E2E | テストの追加・修正 |
| `infra` | Infra | インフラ構成の変更 |
| `docs` | - | ドキュメントのみの変更 |
| `chore` | - | その他（依存更新、設定変更など） |

### Scope（対象領域）

| Scope | 対象 |
|-------|------|
| `business` | contracts/business/ |
| `api` | contracts/api/ |
| `web` | web/src/ |
| `server` | server/src/ |
| `infra` | infra/ |
| `e2e` | e2e/ |
| `policy` | guardrails/policy/ |

### 良いコミット例

```
contract(business): プロジェクトメンバー招待シナリオを追加

- invite-member.md を作成
- glossary.md にメンバーロールを追加
```

```
feat(server): InviteMemberUseCaseを実装

- ドメインモデル: ProjectMember, MemberRole
- ユースケース: InviteMemberUseCase
- リポジトリ: ProjectMemberRepository
```

```
feat(web): メンバー招待ダイアログを実装

- InviteMemberDialog コンポーネント
- useInviteMember フック
- CTテスト・SSテスト
```

### 悪いコミット例

```
update  ← 何を更新したか不明
```

```
fix     ← 何を修正したか不明
```

```
WIP     ← 中間状態をコミットしない
```

### コミットタイミング

| タイミング | 推奨 |
|-----------|------|
| フェーズ完了時 | ✅ 必須 |
| 大きな機能単位 | ✅ 推奨 |
| 作業途中（WIP） | ❌ 避ける |
| 動作しない状態 | ❌ 禁止 |
