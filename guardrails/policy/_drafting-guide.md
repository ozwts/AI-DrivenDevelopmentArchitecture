# ポリシー作成ガイドライン

## このドキュメントについて

このガイドラインは、ポリシーファイルの作成方法を定義する。すべてのポリシーは憲法（`../constitution/`）に準拠し、その原則を具体化したものでなければならない。

---

## ファイル構造

### 概要ファイル: X0-{topic}-overview.md

各領域の入口となるファイル。以下のセクションを含める。

**必須セクション**:

1. **核心原則**: この領域の最も重要な原則を1-2文で
2. **責務**: 「実施すること/実施しないこと」をMECEに
3. **Do/Don't**: 具体的なコード例

**例**:

```markdown
## 実施すること

1. **データ永続化**: DBへの読み書き、トランザクション管理
2. **データ変換**: ドメインモデル ⇔ DB形式の変換

## 実施しないこと

1. **ビジネスルール** → UseCase層で実施
2. **バリデーション** → Domain層で実施

## Do / Don't

### ✅ Good

（具体的なコード例）

### ❌ Bad

（具体的なコード例と理由）
```

### 詳細ファイル: X1-X9-{topic}-{detail}.md

概要の補足情報。概要、関連ドキュメント、実装パターン、Do/Don't を含める。

### 番号体系

```
10番台: 領域全体の概要と横断的ガイドライン
  - 10: 領域全体の概要
  - 11-19: 横断的詳細

20番台以降: トピック別（10番台刻み）
  - X0: トピック概要
  - X1-X9: トピック詳細
```

### 命名規則

- 概要: `X0-{topic}-overview.md`（必ず `-overview` サフィックス）
- 詳細: `X1-{topic}-{detail}.md`（具体的な内容名）

---

## 内容の書き方

### 核心原則は1-2文で

AIエージェントが本質を即座に把握できるようにする。

### 責務は「実施/非実施」で明確に

非実施には必ず代替実施場所を明記する。責務のMECE分離は憲法の要求事項。

### Do/Don'tは必ずコード例を含める

抽象的な説明よりも、具体的なコード例が理解を促進する。

---

## ポリシー間のMECE

### 重複禁止

同じ内容を複数のポリシーファイルに記載しない。

### 責務外の内容は参照のみ

各ポリシーファイルは自身の責務のみを詳述し、責務外の内容は参照リンクにとどめる。

```markdown
// ✅ Good: 責務外は参照のみ

## バリデーション

**参照**: `11-domain-validation-strategy.md`

// ❌ Bad: 責務外の詳細を記載

## バリデーション

### 型レベルバリデーション

OpenAPIで定義した制約（minLength、maxLength...）
（詳細が続く）
```

**理由**:
- 情報の唯一の情報源を維持
- 変更時に1箇所のみ修正
- 複数箇所での記載は不整合のもと

---

## 禁止事項

### チェックリストの禁止

ポリシーファイルにチェックリストを記載しない。

**理由**:

- 本文と二重管理になり、不整合が発生しやすい
- 本文で説明済みの内容の繰り返しになる
- MECE違反（同じ情報が複数形式で存在）

**代替手段**:

- **静的解析**: ESLint/TypeScriptで機械的に検証
- **MCPツール**: guardrailsレビューツールで自動検証
- **Do/Don't**: 良い例・悪い例で判断基準を明示

```markdown
// ❌ Bad: チェックリスト

## チェックリスト

[ ] すべてのプロパティをreadonlyで定義
[ ] コンストラクタはPropsパターン

// ✅ Good: Do/Don'tで表現

## Do / Don't

### ✅ Good

export class Todo {
readonly id: string;
constructor(props: TodoProps) { ... }
}

### ❌ Bad

export class Todo {
id: string; // ❌ readonlyがない
constructor(id: string, title: string) { ... } // ❌ 個別引数
}
```

---

## ディレクトリ構造

### フラットな配置

ポリシーディレクトリはフラットに配置し、レビュー時の参照を容易にする。

```
policy/server/
├── domain-model/
├── use-case/
├── port/
├── logger/
├── fetch-now/
├── storage-client/
├── auth-client/
├── unit-of-work/
├── handler/
├── repository/
└── di-container/
```

### meta.json

各ポリシーディレクトリには `meta.json` を配置し、ラベル・説明・依存関係を定義する。

```json
{
  "label": "ユースケース",
  "description": "ビジネスロジックの実装、Result型パターン",
  "dependencies": ["domain-model", "port"]
}
```

| フィールド     | 型       | 必須 | 説明                     |
| -------------- | -------- | ---- | ------------------------ |
| `label`        | string   | ○    | 選択肢の表示名           |
| `description`  | string   | ○    | 選択肢の説明文           |
| `dependencies` | string[] | -    | 関連するポリシーIDの配列 |

### 依存関係の方向性

**一方向のみ**: 上位レイヤー → 下位レイヤー の方向で記述する。相互参照は禁止。

**portによる集約**: 個別ポート（logger, fetch-now等）への依存は `port` で集約する。

```json
// ✅ Good: portで集約
{ "dependencies": ["domain-model", "port"] }

// ❌ Bad: 個別ポートを列挙
{ "dependencies": ["domain-model", "logger", "fetch-now", "storage-client"] }
```
