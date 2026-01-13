# 環境ライフサイクル管理

開発環境の起動・停止・デプロイを完璧に制御するためのrunbook。

## 環境の種類

| 環境 | 用途 | 特徴 |
|-----|------|------|
| **ローカル開発** | 日常的な開発 | ホットリロード対応、即時反映 |
| **共有dev環境** | チーム共有の検証 | `sandbox-dev-*` |
| **ブランチ環境** | 機能別の隔離検証 | `sandbox-dev-{hash}-*`（ブランチ名から7文字ハッシュ生成） |

---

## ローカル開発環境

### 起動

```
mcp__guardrails__procedure_dev(action='start', mode='full')
```

**モード選択:**
- `full`: API + Web（バックエンド実装時）
- `mock`: モックAPI + Web（フロントエンドのみ開発時）

### 状態確認

```
mcp__guardrails__procedure_dev(action='status')
```

返却値:
- `running`: 起動状態
- `mode`: 実行モード
- `apiPort` / `webPort`: 使用ポート
- `uptime`: 起動時間

### ログ確認

```
mcp__guardrails__procedure_dev(action='logs', lines=100, filter='ERROR')
```

### 停止

```
mcp__guardrails__procedure_dev(action='stop')
```

---

## 再起動 vs デプロイ判断

### ローカル開発での判断

| 変更内容 | 対応 | 理由 |
|---------|------|------|
| アプリロジック（UseCase, Domain, Handler, Component） | 何もしない | ホットリロード自動反映 |
| ホットリロードが効かない | `restart` | プロセス再起動 |
| 依存関係の追加・更新 | `restart` | node_modules再読み込み |
| 環境変数の変更 | `restart` | プロセス再起動で反映 |

```
mcp__guardrails__procedure_dev(action='restart')
mcp__guardrails__procedure_dev(action='restart', mode='mock')  # モード変更時
```

### AWS環境での判断

| 変更内容 | 対応 | target |
|---------|------|--------|
| フロントエンドのみ | 部分デプロイ | `web` |
| Lambda/APIロジックのみ | 部分デプロイ | `api` |
| DBスキーマ、新規環境変数 | 完全デプロイ | `all` |
| Terraform設定変更 | 完全デプロイ | `all` |
| 新規環境構築 | 初期デプロイ | `initialDeploy=true` |

---

## ブランチ環境管理

### ブランチ環境の作成（初回）

**2段階デプロイが必須**（フロントエンドがAPIのURLをSSMから取得するため）:

```
mcp__guardrails__procedure_deploy_dev(
  action='deploy',
  useBranchEnv=true,
  initialDeploy=true
)
```

処理内容:
1. Stage 1: 全リソース作成（DB, Cognito, Lambda, API Gateway）
2. SSMにAPI URLが保存される
3. Stage 2: フロントエンド再ビルド（SSMからURL取得）
4. S3/CloudFrontにデプロイ

### 差分確認（Plan）

```
mcp__guardrails__procedure_deploy_dev(
  action='diff',
  useBranchEnv=true
)
```

### 部分デプロイ

**APIのみ:**
```
mcp__guardrails__procedure_deploy_dev(
  action='deploy',
  useBranchEnv=true,
  target='api'
)
```

**フロントエンドのみ:**
```
mcp__guardrails__procedure_deploy_dev(
  action='deploy',
  useBranchEnv=true,
  target='web'
)
```

### ブランチ環境の破棄

```
mcp__guardrails__procedure_deploy_dev(
  action='destroy',
  useBranchEnv=true
)
```

---

## 共有dev環境

チーム共有環境（慎重に操作）:

```
mcp__guardrails__procedure_deploy_dev(
  action='deploy',
  useBranchEnv=false
)
```

---

## E2E環境セットアップ

### Cognitoテストユーザー作成

```
mcp__guardrails__procedure_e2e_setup(
  action='user-setup',
  useBranchEnv=true
)
```

### テストユーザー削除

```
mcp__guardrails__procedure_e2e_setup(
  action='user-destroy',
  useBranchEnv=true
)
```

### ブラウザセットアップ

```
mcp__guardrails__procedure_e2e_setup(action='browser-setup')
```

---

## トラブルシューティング

### ポート競合

```
mcp__guardrails__procedure_dev(action='status')
```
→ 使用中ポートを確認し、競合プロセスを終了

### デプロイ失敗

1. 差分確認: `action='diff'`
2. ログ確認: AWSコンソールまたはCloudWatch
3. 手動修正後に再デプロイ

### ブランチ環境が残っている

```
mcp__guardrails__procedure_deploy_dev(
  action='destroy',
  useBranchEnv=true
)
```

---

## 環境ライフサイクルフロー

```
[開発開始]
    ↓
ローカル開発サーバー起動
    ↓ procedure_dev(start)
    ↓
実装・テスト繰り返し
    ↓ (ホットリロード / restart)
    ↓
ブランチ環境作成（必要な場合）
    ↓ procedure_deploy_dev(deploy, initialDeploy=true)
    ↓
E2Eテスト
    ↓ procedure_test(target='e2e')
    ↓
マージ後: ブランチ環境破棄
    ↓ procedure_deploy_dev(destroy)
    ↓
[完了]
```

