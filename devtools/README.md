# DevTools

このディレクトリには、開発・運用に便利な開発ツールスクリプトが含まれています。

## get-aws-session-token.sh

AWS MFA（多要素認証）を使用してセッショントークンを取得し、環境変数として設定するスクリプトです。

### 使用方法

**重要: `source`コマンドで実行してください**

```bash
source devtools/get-aws-session-token.sh <プロファイル名> <MFAデバイスARN> <MFAコード>
```

または

```bash
. devtools/get-aws-session-token.sh <プロファイル名> <MFAデバイスARN> <MFAコード>
```

### パラメータ

- **プロファイル名**: `~/.aws/credentials`で設定したAWSプロファイル名
- **MFAデバイスARN**: IAMユーザーのMFAデバイスのARN
  - 形式: `arn:aws:iam::123456789012:mfa/username`
  - AWS Console > IAM > Users > [ユーザー名] > Security credentials > MFA devicesで確認可能
- **MFAコード**: MFAアプリ（Google Authenticator等）に表示される6桁のコード

### 例

```bash
source devtools/get-aws-session-token.sh my-profile arn:aws:iam::123456789012:mfa/username 123456
```

### 実行後

スクリプトが成功すると、以下の環境変数が**自動的に**現在のシェルセッションに設定されます：

```bash
AWS_ACCESS_KEY_ID=ASIA...
AWS_SECRET_ACCESS_KEY=...
AWS_SESSION_TOKEN=...
AWS_DEFAULT_REGION=ap-northeast-1
```

**注意**: `source`コマンド（または`.`コマンド）で実行しないと、環境変数は現在のシェルに設定されません。

### セッションの有効期限

- デフォルト: 12時間（43200秒）
- 有効期限内は、MFA認証なしでAWSリソースにアクセス可能

### 環境変数の確認

設定が正しく行われたか確認するには：

```bash
echo $AWS_ACCESS_KEY_ID
aws sts get-caller-identity
```

### トラブルシューティング

**エラー: セッショントークンを取得できませんでした**

- AWS CLIがインストールされているか確認
- プロファイルが正しく設定されているか確認（`aws configure --profile <プロファイル名>`）
- MFAデバイスARNが正しいか確認
- MFAコードが有効期限内（30秒）か確認

**環境変数が設定されない**

- `source`コマンドまたは`.`コマンドで実行しているか確認
- `sh`や`bash`で直接実行すると、環境変数は現在のシェルに設定されません

### 前提条件

- AWS CLI v2がインストールされていること
- `~/.aws/credentials`にプロファイルが設定されていること
- IAMユーザーにMFAデバイスが設定されていること
