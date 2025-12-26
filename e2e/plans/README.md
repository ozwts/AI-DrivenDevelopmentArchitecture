# E2E Test Plans

E2Eテストプランを格納するディレクトリ。

## 使い方

1. `e2e-test-planner` エージェントでテストプランを作成
2. `e2e-test-generator` エージェントでテストコードを生成
3. `e2e-test-healer` エージェントで失敗テストを修復

## ファイル構成

- `*.plan.md` - テストプラン（Plannerが生成）
- シードファイル: `../seed.spec.ts`
