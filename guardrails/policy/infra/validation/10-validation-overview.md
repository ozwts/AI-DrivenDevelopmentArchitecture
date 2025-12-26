# 検証戦略概要

## 核心原則

インフラコードは**デプロイ前に静的検証**され、**terraform plan では検出できない問題**も事前に捕捉する。

## 技術スタック

- **terraform fmt**: フォーマット統一
- **TFLint**: 静的解析、AWS固有ルール
- **Trivy**: セキュリティスキャン、カスタムポリシー

## ポリシー構成

| ファイル | 責務 |
|----------|------|
| `10-validation-overview.md` | 検証パイプライン、ツール設定 |

## 検証パイプライン

```
validate
    │
    ├── format-check   # terraform fmt -check
    ├── lint           # TFLint
    └── security       # Trivy
```

## ツール設定

### TFLint

| 設定 | 値 | 理由 |
|-----|---|------|
| `call_module_type` | `"all"` | ローカル+リモートモジュールを検査 |
| `preset` | `"all"` | 全ルール有効化 |
| `deep_check` | `true` | AWS実リソース値を検証 |

### Trivy

| 設定 | 値 | 理由 |
|-----|---|------|
| `scanners` | `misconfig, secret` | 設定ミス + シークレット検出 |
| `severity` | `CRITICAL〜LOW` | 全重要度を検出 |
| カスタムポリシー | Rego | プロジェクト固有ルール |

## Do / Don't

### ✅ Good: 環境エントリーポイントから検証

```bash
# 各環境から検証（参照モジュール含む）
validate:dev
validate:stg
validate:prd
```

### ❌ Bad: モジュール単体のみ検証

```bash
# 環境固有の設定ミスは検出できない
tflint modules/
```

**理由**: 環境エントリーポイントから検証することで、パラメータの組み合わせも含めて検証できる。

## 関連ドキュメント

- `../protection/10-protection-overview.md`: カスタムポリシー
- `../environment/10-environment-overview.md`: 環境別例外設定
