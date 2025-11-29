# ドメインモデルテスト戦略：概要

## 核心原則

ドメインモデル（Entity、Value Object）は**外部依存ゼロ**のため、**Small Testのみで完全に検証**する。

**関連ドキュメント**:
- **Value Objectテスト**: `51-value-object-test-patterns.md`
- **Entityテスト**: `52-entity-test-patterns.md`
- **Entity設計**: `20-entity-overview.md`
- **Value Object設計**: `25-value-object-overview.md`
- **バリデーション戦略**: `11-domain-validation-strategy.md`

## テスト戦略の全体像

### ドメイン層の特徴とテスト方針

| 観点 | 特徴 | テスト方針 |
|------|------|-----------|
| 外部依存 | なし（純粋TypeScript） | Small Testのみ |
| 実行速度 | 高速 | 全テストを毎回実行 |
| テスト対象 | ドメインルール、不変条件、データ変換 | 網羅的にテスト |
| モック | 不要 | 実装のみテスト |

## テストファイル構成

```
domain/model/{entity}/
├── {entity}.ts                    # Entity本体
├── {entity}.small.test.ts         # Entityテスト
├── {entity}.dummy.ts              # テスト用ファクトリ
├── {value-object}.ts              # Value Object本体
├── {value-object}.small.test.ts   # Value Objectテスト
└── {entity}-repository.ts         # リポジトリインターフェース
```

### ファイル命名規則

| 種類 | パターン | 例 |
|------|---------|-----|
| Entity Small Test | `{entity}.small.test.ts` | `todo.small.test.ts`, `project.small.test.ts` |
| Value Object Small Test | `{value-object}.small.test.ts` | `project-color.small.test.ts`, `todo-status.small.test.ts` |
| Dummy Factory | `{entity}.dummy.ts` | `todo.dummy.ts`, `project.dummy.ts` |

## テスト実行戦略

### 実行コマンド

```bash
# ドメインモデルのSmall Testのみ実行
npm run test:small -- domain/model

# 特定Entityのテスト実行
npm run test:small -- domain/model/project

# 特定ファイルのテスト実行
npm run test:small -- domain/model/project/project.small.test.ts
```

### CI/CDでの実行

| タイミング | 実行テスト | 理由 |
|-----------|----------|------|
| Pull Request作成時 | All Domain Model Tests | 高速（外部依存なし） |
| mainブランチマージ時 | All Tests | 完全な検証 |
| コミット前（pre-commit hook） | 変更ファイルのテストのみ | 高速フィードバック |

## テストカバレッジ要件

### Value Object

**参照**: `51-value-object-test-patterns.md` - 詳細なテストパターン

**必須テスト**:
```
[ ] fromString() - 正常系（代表値、境界値）
[ ] fromString() - 異常系（不正形式、空文字列、境界値外）
[ ] equals() - 同じ値、異なる値
[ ] toString() - 文字列表現の検証
[ ] Result型の正しいチェック（success分岐）
[ ] エラー型とメッセージの検証
```

**条件付きテスト**:
```
[ ] canTransitionTo() - 許可される遷移（全パターン） ※不変条件がある場合
[ ] canTransitionTo() - 禁止される遷移（全パターン） ※不変条件がある場合
[ ] default() - デフォルト値の検証 ※default()メソッドがある場合
[ ] 静的ファクトリメソッド（todo(), completed()等） ※提供される場合
[ ] ヘルパーメソッド - すべての分岐 ※ヘルパーメソッドがある場合
```

### Entity

**参照**: `52-entity-test-patterns.md` - 詳細なテストパターン

```
[ ] constructor - すべてのプロパティ
[ ] constructor - オプショナルプロパティ省略
[ ] constructor - Value Object保持
[ ] update() - すべてのフィールド更新
[ ] update() - 一部のフィールドのみ更新
[ ] update() - イミュータブル性（元のインスタンス不変）
[ ] update() - 新しいインスタンス生成
[ ] update() - ID、createdAtは不変
[ ] 専用メソッド（changeStatus等） - 正常系
[ ] 専用メソッド - イミュータブル性
```

## MECE原則との整合性

**参照**: `11-domain-validation-strategy.md` - バリデーション戦略の大原則

ドメインモデルのテストは**第2階層：ドメインルール**のテストである。

| 階層 | テスト対象 | テスト場所 | 実施内容 |
|------|----------|-----------|---------|
| 第1階層 | 型レベルバリデーション | Handler層テスト | OpenAPI制約（minLength/maxLength/pattern） |
| **第2階層** | **ドメインルール** | **Domain層テスト（本ドキュメント）** | **Value Object不変条件、Entity不変性** |
| 第3階層 | ビジネスルール | UseCase層テスト | 権限チェック、外部依存する不変条件 |

**重要**: 型レベルバリデーション（文字列長、形式等）はHandler層でテスト済みのため、ドメイン層テストで重複しない。

## Do / Don't

### ✅ Good

```typescript
// Result型を正しくチェック
expect(result.success).toBe(true);
if (result.success) {
  expect(result.data.value).toBe("#FF5733");
}

// エラー型とメッセージを検証
expect(result.success).toBe(false);
if (!result.success) {
  expect(result.error).toBeInstanceOf(DomainError);
  expect(result.error.message).toContain("Invalid");
}

// イミュータブル性を検証
const original = new Todo({ /* ... */ });
original.update({ title: "Updated" });
expect(original.title).toBe("元のタスク");  // 不変であることを確認

// 状態遷移パターンをテスト
const todoResult = TodoStatus.from({ value: "TODO" });
const completedResult = TodoStatus.from({ value: "COMPLETED" });

// Dummyファクトリを活用
const todo = todoDummyFrom({ title: "テスト" });
```

### ❌ Bad

```typescript
// Result型をチェックせずdata参照
const result = TodoStatus.from({ value: "TODO" });
expect(result.data.isTodo()).toBe(true);  // ❌ errorの可能性

// エラー型を検証しない
expect(result.success).toBe(false);  // ❌ どのエラーかわからない

// 外部依存を使用（ドメイン層は外部依存ゼロ）
const useCase = new CreateTodoUseCaseImpl({ /* ... */ });  // ❌ ドメイン層のテストではない

// 実DBを使用
const repository = new TodoRepositoryImpl({ /* ... */ });  // ❌ ドメイン層のテストではない

// 型レベルバリデーションのテスト（Handler層の責務）
// ❌ OpenAPIでバリデーション可能な制約（Tier 3）はValue Object化不要
const colorResult = ProjectColor.from("#FF5733000");  // OpenAPIのpatternで検証すべき

// 不変条件チェックをEntityテストで実施
// ❌ 不変条件はValue Objectでテスト済み（MECE原則違反）
```

## チェックリスト

### Value Objectテスト

**参照**: `51-value-object-test-patterns.md` - 詳細な実装例

```
[ ] fromString()の正常系・異常系テスト（必須）
[ ] equals()テスト（必須）
[ ] toString()テスト（必須）
[ ] 不変条件チェックメソッドテスト（不変条件がある場合）
[ ] default()テスト（ある場合）
[ ] ヘルパーメソッドテスト（ある場合）
[ ] 静的ファクトリメソッドテスト（ある場合）
[ ] Result型の正しいチェック（必須）
[ ] エラー型とメッセージの検証（必須）
[ ] 境界値テスト
[ ] ファイル名: {value-object}.small.test.ts
```

### Entityテスト

**参照**: `52-entity-test-patterns.md` - 詳細な実装例

```
[ ] constructorテスト（必須、オプショナル）
[ ] update()テスト（全フィールド、一部のみ）
[ ] イミュータブル性テスト（元のインスタンス不変）
[ ] 新しいインスタンス生成の検証
[ ] ID、createdAtは不変であることの検証
[ ] 専用メソッドテスト（changeStatus等）
[ ] Value Object保持の検証
[ ] Dummyファクトリ実装（{entity}.dummy.ts）
[ ] ファイル名: {entity}.small.test.ts
```

### 全般

```
[ ] 外部依存を使用していない
[ ] Small Testのみ（Medium Test不要）
[ ] MECE原則遵守（Handler層テストと重複しない）
[ ] 高速実行（外部I/Oなし）
[ ] テストが独立している（順序に依存しない）
```
