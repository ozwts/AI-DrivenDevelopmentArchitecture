# Claude Code インストール手順

このドキュメントでは、AnthropicのClaude AIを使用したコーディング支援ツール「Claude Code」のインストール手順を説明します。

## 前提条件

- WSL2（Ubuntu）がインストールされていること
- asdfがインストールされていること

## 1. グローバルNode.jsのインストール

Claude CodeをNPM経由でインストールするため、まずグローバルNode.jsを設定します。

### 1.1 Node.jsプラグインの追加（未インストールの場合）

```bash
asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git
```

### 1.2 Node.js 22.11.0のインストール

```bash
# Node.js 22.11.0をインストール
asdf install nodejs 22.11.0

# グローバルのデフォルトバージョンとして設定
asdf global nodejs 22.11.0
```

### 1.3 バージョン確認

```bash
node -v
# 出力: v22.11.0

npm -v
# 出力: 10.9.0（またはそれ以降）
```

## 2. Claude Codeのインストール

### 2.1 グローバルインストール

```bash
npm install -g @anthropic-ai/claude-code
```

インストールには数分かかる場合があります。

**注意**: `sudo`は使用しないでください。セキュリティ上の問題が発生する可能性があります。

### 2.2 インストール確認

```bash
claude --version
```

バージョン番号が表示されれば、インストール成功です。

### 2.3 コマンドが見つからない場合

もし`command not found`エラーが出る場合は、以下を確認してください：

```bash
# asdfのnpmグローバルパスを確認
npm config get prefix
# 出力例: /home/username/.asdf/installs/nodejs/22.11.0

# パスが通っているか確認
echo $PATH | grep asdf
```

パスが通っていない場合は、ターミナルを再起動してください：

```bash
source ~/.bashrc
```

## 3. 認証設定

Claude Codeを使用するには、以下のいずれかの方法で認証を行います。

### 3.1 認証方法の選択

Claude Codeは以下の認証方法をサポートしています：

| 認証方法 | 料金モデル | 特徴 |
|---------|----------|------|
| Claude App | サブスクリプション | ProまたはMaxプラン必須<br>月額固定料金（Pro: $20/月、Max: $100-200/月）<br>Web/デスクトップ/モバイルアプリと統合 |
| Claude Console | 従量課金 | console.anthropic.comでアクティブな請求設定が必要<br>使用した分だけ支払い |

**このハンズオンでの推奨**: Claude App（Proプラン - $20/月）
- 月額固定料金で予算管理しやすい
- Web/デスクトップ/モバイルアプリも使える
- 使用量を気にせず、ある程度使ってみて機能を理解できる
- 従量課金は使用量が読めないため、初学者には不向き

### 3.2 初回起動と認証

プロジェクトディレクトリで`claude`コマンドを実行します：

```bash
cd /mnt/c/Users/<your-username>/Documents/workspace/hands-on
claude
```

初回起動時に、認証方法を選択する画面が表示されます。

#### Claude App（Proプラン）を使用する場合（推奨）

1. https://claude.ai/ にアクセス
2. アカウントを作成（まだお持ちでない場合）
3. Proプランに登録（$20/月）
4. `claude`コマンドを実行
5. 初回起動時に「Claude App」を選択
6. ブラウザが開き、claude.aiにログイン
7. サブスクリプションアカウントで認証

**料金について**:
- Pro: $20/月（約3,000円/月）
- 月額固定で使い放題
- CLI、Web、デスクトップ、モバイルアプリすべてで利用可能

#### Claude Console（従量課金）を使用する場合

すでに従量課金での利用を希望する場合：

1. 初回起動時に「Claude Console」を選択
2. ブラウザが開き、console.anthropic.comにログイン
3. 請求情報の設定（クレジットカード登録）
4. 認証を完了

**料金について**:
- Claude Sonnet 3.7: 入力 $3 / 100万トークン、出力 $15 / 100万トークン
- 詳細: https://www.anthropic.com/pricing

## 4. 動作確認

Claude Codeが起動したら、以下のコマンドを試してみてください：

```
> このプロジェクトの構成を教えてください
```

Claude Codeがプロジェクトの構造を分析して説明してくれます。

## 5. Claude Codeの基本的な使い方

### 5.1 コード生成

```
> TODOリポジトリのテストを書いてください
```

Claude Codeが該当するテストコードを生成します。

### 5.2 コードの説明

```
> server/src/domain/model/todo/todo.ts の内容を説明してください
```

指定したファイルの内容を解説してくれます。

### 5.3 リファクタリング

```
> server/src/handler/hono-handler/todo/list-todos-handler.ts をリファクタリングしてください
```

コードの改善提案とリファクタリング案を提示してくれます。

### 5.4 バグ修正

```
> エラーログを見て、問題を修正してください
[エラーログを貼り付け]
```

エラーの原因を分析し、修正方法を提案してくれます。

## 6. トラブルシューティング

### Claude Codeが起動しない

```bash
# エラー: command not found: claude
```

対処法：
```bash
# グローバルインストールを確認
npm list -g @anthropic-ai/claude-code

# パスを確認
which claude

# 再インストール
npm uninstall -g @anthropic-ai/claude-code
npm install -g @anthropic-ai/claude-code
```

### 認証エラー

```
Error: Authentication failed
```

対処法：
```bash
# ログアウトして再認証
claude --logout

# 再起動して認証し直す
claude
```

### レート制限エラー

```
Error: Rate limit exceeded
```

対処法：
- APIの使用頻度が高すぎる場合に発生
- 数分待ってから再試行
- Anthropicコンソールで使用状況を確認

### 接続エラー

```
Error: Network error
```

対処法：
- インターネット接続を確認
- プロキシ設定を確認
- ファイアウォール設定を確認

## 7. セキュリティのベストプラクティス

### 7.1 認証情報の管理

- 認証情報は自動的に安全に保存されます
- 共有PCでは使用後に`claude --logout`でログアウト
- チーム開発では個人アカウントを使用

### 7.2 .gitignoreの確認

プロジェクトの`.gitignore`に以下が含まれていることを確認：

```
.env
.env.local
*.key
*.pem
```

## 8. 便利なTips

### 8.1 エイリアスの設定

頻繁にClaude Codeを使う場合は、エイリアスを設定すると便利です：

```bash
# ~/.bashrcに追加
echo 'alias cc="claude"' >> ~/.bashrc
source ~/.bashrc
```

使用例：
```bash
cd /path/to/project
cc
```

### 8.2 インストールの確認

インストールタイプとバージョンを確認：

```bash
claude doctor
```

## 9. 次のステップ

Claude Codeのインストールが完了したら：

1. [開発環境構築.md](./開発環境構築.md) に戻って残りのセットアップを完了
2. プロジェクトのコードを読み込んでClaude Codeに質問してみる
3. 実際の開発タスクでClaude Codeを活用する

## 参考リンク

- [Claude Code 公式ドキュメント](https://code.claude.com/docs/en/setup)
- [Anthropic Console](https://console.anthropic.com/)
- [料金プラン](https://www.anthropic.com/pricing)
- [Claude App](https://claude.ai/)
