# Terraformポリシー概要

## 核心原則

**再現可能なインフラを宣言し、環境のライフサイクルを完全に制御する。**

## 技術スタック

- **Terraform**: 宣言的インフラ定義
- **TFLint**: 静的解析
- **Trivy**: セキュリティスキャン、カスタムポリシー

## 実施すること

1. **宣言的定義**: あるべき状態をコードで宣言し、Terraformが収束させる
2. **環境完全分離**: 独立したエントリーポイント・tfstateで環境を分離
3. **構造の統一**: 全環境で同一のモジュール構成、差異はパラメータのみ
4. **並行デプロイ対応**: ブランチ環境でリソースを分離し、複数AIの競合を回避
5. **ライフサイクル制御**: 開発環境は起動・停止・再作成を数分で完了できる状態を維持
6. **静的検証**: デプロイ前にformat・lint・securityで検証

## 実施しないこと

1. **モジュール内での環境判定** → 環境エントリーポイントでパラメータ化
2. **環境固有のモジュール追加** → 全環境で同一構成を維持
3. **trivyignoreへの無断追加** → CODEOWNERSによるレビュー必須

## ディレクトリ構造

```
terraform/
├── environments/
│   └── {env}/              # 環境エントリーポイント
│       ├── main.tf         # モジュール呼び出し
│       ├── variables.tf    # 環境パラメータ
│       ├── providers.tf    # バックエンド設定
│       └── .trivyignore    # 環境固有の例外
├── modules/
│   └── {provider}/{resource}/  # 再利用可能モジュール
└── policies/               # Trivyカスタムポリシー
```

## 環境とライフサイクル

| 環境 | ライフサイクル | AIの干渉 |
|------|---------------|---------|
| 開発 | スクラップアンドビルド | 自由 |
| 検証 | 安定運用 | 禁止 |
| 本番 | 安定運用 | 禁止 |

開発環境では`branch_suffix`によるリソース分離で、複数AIの並行デプロイを実現。

## Do / Don't

### Good: apply/destroyが常に成功する状態を維持

```bash
# いつでも成功する
terraform apply   # リソース作成・更新
terraform destroy # リソース削除

# ブランチ環境で積極的に検証
npm run deploy:branch:dev   # 作成
npm run destroy:branch:dev  # 削除 → 問題があれば早期発見
```

### Bad: 手動操作でインフラを変更

```bash
# コンソールで手動変更 → ドリフト発生
aws dynamodb update-table --table-name my-table ...
```

**理由**: 手動変更はコードと実態の乖離（ドリフト）を生み、再現性が失われる。

### Bad: apply/destroyの失敗を放置する

```bash
# destroyが失敗したまま放置
terraform destroy
# Error: error deleting Lambda Function: ResourceConflictException
```

**理由**: 依存関係の問題等でapply/destroyが失敗することはある。失敗したら原因を調査し、`depends_on`の追加やライフサイクル設定で修正する。失敗を放置するとライフサイクル制御が破綻する。

### Good: planで差分が出ない状態を維持

```bash
# 変更がなければNo changesになる
terraform plan
# No changes. Your infrastructure matches the configuration.
```

### Bad: 常に差分が発生する構成

```hcl
resource "aws_lambda_function" "main" {
  filename = data.archive_file.lambda.output_path
  # source_code_hashを指定しないと毎回差分が出る
}
```

**理由**: 常に差分があると、本当の変更を見落とし、意図しない変更を適用するリスクが生じる。

## 関連ドキュメント

- `20-environment.md`: 環境分離とブランチ環境
- `30-module.md`: モジュール設計
- `40-protection.md`: 保護戦略とカスタムポリシー
- `50-validation.md`: 検証パイプライン
