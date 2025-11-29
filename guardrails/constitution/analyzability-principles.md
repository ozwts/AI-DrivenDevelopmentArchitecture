# 解析可能性の原則

## 最高原則

解析可能性を最大化する。変更の影響範囲を静的に把握でき、実装漏れを機械的に検出できる設計を優先する。静的解析でカバーできることは型システムやLinterで強制し、カバーできないことを定性的解析で補完する（MECE原則）。

## 解析可能性とは

**定義**: コードやシステムの変更が、どこに影響するかを機械的・静的に追跡できる性質

**AI駆動開発における重要性**:
- LLMは変更を提案するが、影響範囲の完全な把握は困難
- TypeScriptコンパイラが影響箇所をすべて検出
- IDEが変更箇所を即座に提示
- 実行前にバグを発見し、デバッグ時間を削減

### 解析可能性のレベル

```
レベル3（最高）: 型システムで完全に追跡可能
  例: `| undefined` 必須化、readonly、Result型
  → コンパイルエラーで100%検出

レベル2（中）: Linterやカスタムルールで検出可能
  例: 命名規則、アーキテクチャ依存関係の検証
  → ESLint、dependency-cruiserで自動検出

レベル1（低）: ドキュメント化された規約
  例: ビジネスルールの妥当性、設計パターンの適用
  → 人間・LLMによるレビューが必要

レベル0（解析不可能）: 暗黙的な知識
  例: 口頭での取り決め、個人の記憶
  → 検出不可能、避けるべき
```

## 解析可能な設計の原則

### 原則1: 型システムで表現可能なことは型で表現する

```typescript
// ❌ 解析不可能: コメントによる暗黙的な制約
static reconstruct(props: {
  description?: string;  // 必ず渡すこと（省略禁止）
}): Result<Todo, DomainError>

// ✅ 解析可能: 型システムで明示的に表現
static reconstruct(props: {
  description: string | undefined;  // 省略するとコンパイルエラー
}): Result<Todo, DomainError>
```

### 原則2: エラーハンドリングを型で明示する

```typescript
// ❌ 解析不可能: 例外による暗黙的なエラー
function process(input: string): Todo {
  if (invalid) throw new Error();  // 呼び出し側が予測困難
  return todo;
}

// ✅ 解析可能: Result型でエラーを明示
function process(input: string): Result<Todo, DomainError> {
  if (invalid) return { success: false, error: new DomainError() };
  return { success: true, data: todo };
}
```

### 原則3: 不変性を型で保証する

```typescript
// ❌ 解析不可能: どこで変更されるか追跡困難
export class Todo {
  id: string;  // mutable
}

// ✅ 解析可能: readonly で変更箇所を限定
export class Todo {
  readonly id: string;  // immutable
}
```

### 原則4: 暗黙的な依存を避ける

```typescript
// ❌ 解析不可能: グローバル変数への暗黙的な依存
function createTodo(title: string): Todo {
  const now = getCurrentTime();  // グローバル関数
  return new Todo({ title, createdAt: now });
}

// ✅ 解析可能: 依存を引数で明示
function createTodo(title: string, fetchNow: () => Date): Todo {
  const now = dateToIsoString(fetchNow());
  return new Todo({ title, createdAt: now });
}
```

## MECE原則：静的解析と定性的解析の使い分け

**静的解析（機械的検証）**:
- 型の一致・不一致（TypeScript型システム）
- フィールドの実装漏れ（`| undefined` 必須化）
- 不変性の保証（`readonly`）
- エラーハンドリングの完全性（Result型）
- アーキテクチャ依存関係の検証（ESLint、dependency-cruiser）
- 特徴: 確実性が高い、即座にフィードバック、CI/CD自動化可能

**定性的解析（人間・LLM判断）**:
- ビジネスロジックの妥当性
- 命名の適切性（ユビキタス言語）
- アーキテクチャ設計の妥当性
- パフォーマンス特性、セキュリティ要件
- 特徴: 文脈依存、主観的、不確実性あり

**MECE原則の適用**:
- **重複なく**: 型システムで検証可能なことを、LLMレビューに頼らない
- **漏れなく**: 静的解析でカバーできないことを、定性的解析で補完

## 設計判断基準

```
この制約は機械的に検証可能か？
│
├─ YES（型システムで表現可能）→ 型システムで強制（レベル3）
│   例: `| undefined` 必須化、Result型、readonly
│
├─ PARTIAL（Linterで検出可能）→ カスタムルールを追加（レベル2）
│   例: 命名規則、アーキテクチャ依存関係の検証
│
└─ NO（人間の判断が必要）→ ドキュメント化、定性的レビュー（レベル1）
    例: ビジネスルール妥当性、設計の妥当性
```

## 実践：チェックリスト

```
[ ] レベル3（型システム）
    - オプショナルフィールドは `| undefined` で必須化
    - Result型でエラーを明示
    - readonly で不変性を保証
    - 依存を引数で明示

[ ] レベル2（Linter/ツール）
    - 命名規則に従っているか
    - アーキテクチャ境界の保護（層間依存の検証）
    - カスタムルールを追加すべきか

[ ] レベル1（ドキュメント）
    - ビジネスルールをドキュメント化
    - 設計判断の理由を記録
    - 定性的レビューが必要な箇所を明示

[ ] レベル0を避ける
    - 暗黙的な制約や規約に依存していないか
    - グローバル状態に依存していないか
```

## まとめ

1. **解析可能性を最大化する**
   - 変更の影響範囲を静的に追跡可能にする
   - 実装漏れを機械的に検出可能にする
   - 型システムで表現可能なことは型で表現する

2. **解析可能性のレベルを意識する**
   - レベル3（型システム）を最優先
   - レベル2（Linter/ツール）で補完
   - レベル1（ドキュメント）は最小限
   - レベル0（解析不可能）は避ける

3. **静的解析と定性的解析をMECEに使い分ける**
   - 静的解析でカバーできることは型システムで強制
   - 定性的解析は静的解析でカバーできないことに集中
   - 重複なく、漏れなく

4. **トレードオフを理解し、解析可能性を優先する**
   - 記述量の増加 < 実装漏れの確実な検出
   - TypeScript慣習との違い < 型安全性の向上
   - 開発速度と品質を両立
