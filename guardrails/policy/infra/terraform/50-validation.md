# 検証戦略

## 核心原則

インフラコードは**デプロイ前に静的検証**され、terraform planでは検出できない問題も事前に捕捉する。

## 実施すること

1. **フォーマット統一**: `terraform fmt -check`
2. **静的解析**: TFLintでベストプラクティスを検査
3. **セキュリティスキャン**: Trivyで設定ミス・シークレットを検出
4. **環境エントリーポイントから検証**: モジュール単体ではなく環境全体を検証

## 実施しないこと

1. **モジュール単体のみ検証** → 環境エントリーポイントから検証
2. **検証なしデプロイ** → npm scriptsで検証を自動実行

## 検証パイプライン

```bash
npm run validate:{env}
# 1. terraform fmt -check
# 2. tflint
# 3. trivy config
```

## ツール設定

### TFLint

```hcl
config {
  call_module_type = "all"
}

plugin "terraform" {
  preset = "all"
}

plugin "aws" {
  deep_check = true
}
```

### Trivy

```yaml
scan:
  scanners: [misconfig, secret]
misconfiguration:
  policy-namespaces: [custom]
```

## Do / Don't

### Good: 環境エントリーポイントから検証

```bash
npm run validate:dev
npm run validate:prd
```

### Bad: モジュール単体のみ検証

```bash
tflint modules/
```

**理由**: 環境エントリーポイントから検証することで、パラメータの組み合わせも含めて検証できる。
