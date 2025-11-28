# ドメインモデル - 全体概要

## 目的

ビジネスロジックとドメインルールを表現する純粋なTypeScriptコードを設計・実装するためのガイドライン。

## 設計原則

### 1. Always Valid Domain Model

ドメインオブジェクト（Entity、Value Object）は**常に正しい状態（Valid State）**でなければならない。

- Value Objectが不変条件を内包（自己検証）
- EntityはValue Objectを保持し、メソッドはシンプルなデータ変換のみ
- throwは使わない（全層でResult型パターンを徹底）

### 2. Value Object徹底活用

ドメインロジックはValue Objectに集約し、Entityは薄く保つ。

- **Tier 1（必須）**: 不変条件を持つフィールドはValue Object化
- **Tier 2（推奨）**: OpenAPIで表現不可能なドメインルールはValue Object化
- **Tier 3（不要）**: OpenAPIで表現可能な制約はプリミティブでOK

### 3. 外部依存ゼロ

**許可**: TypeScript標準ライブラリ、同じドメイン層内のEntity/Value Object、util層のResult型

**禁止**: AWS SDK、外部ライブラリ（Hono, Zod等）、インフラ・ユースケース・ハンドラ層のコード

### 4. 不変性（Immutability）

すべてのプロパティは`readonly`。更新メソッドは新しいインスタンスを返す。

### 5. Result型による明示的エラーハンドリング

例外を使わず、`Result<T, E>`で成功/失敗を明示的に返す。

### 6. Propsパターン

メソッド引数はオブジェクト形式（将来の拡張性のため）。

### 7. 技術的詳細の漏洩防止

ドメインモデルにAWS、S3、DynamoDB、Cognito等の技術要素を含めない。

## ディレクトリ構成

```
domain/
├── model/
│   ├── value-object.ts                   # Value Object基底型
│   └── {entity}/                         # エンティティごとにディレクトリ
│       ├── {entity}.ts                   # Entity定義
│       ├── {entity}.small.test.ts        # Entityテスト
│       ├── {entity}.dummy.ts             # Entityダミー
│       ├── {value-object}.ts             # Value Object定義
│       ├── {value-object}.small.test.ts  # Value Objectテスト
│       ├── {entity}-repository.ts        # リポジトリインターフェース
│       └── {entity}-repository.dummy.ts  # リポジトリモック
│
└── support/                              # サポートインターフェース
    └── .../                             # logger, fetch-now, auth-client等
```

## レビュー対象ファイル

**対象**:

- `server/src/domain/model/**/*.ts` - Entity、Value Object、リポジトリインターフェース

**除外**:

- `*.small.test.ts` - テストファイル
- `*.dummy.ts` - ダミーファクトリ

## 詳細ポリシー

| ポリシー                       | 内容                                           |
| ------------------------------ | ---------------------------------------------- |
| **20-entity-design.md**        | Entity設計の基本、3-Tier分類、不変性           |
| **25-value-object-design.md**  | Value Object設計                               |
| **26-validation-strategy.md**  | MECE原則、Always Valid原則、バリデーション階層 |
| **30-repository-interface.md** | リポジトリインターフェース設計                 |
| **40-aggregate-pattern.md**    | 集約パターンの適用                             |
| **50-test-strategy.md**        | Small Testテスト戦略                           |
