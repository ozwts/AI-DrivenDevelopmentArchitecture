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
