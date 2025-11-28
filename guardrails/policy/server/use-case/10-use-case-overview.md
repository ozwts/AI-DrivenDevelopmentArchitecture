# ユースケース層の全体像

## 核心原則

1. **1つのユーザーアクション = 1つのユースケース**として実装
2. **Result型で成功/失敗を明示的に表現**
3. **ドメインモデル貧血症を防ぐ**（常にドメインメソッドの追加・改修を検討）

**参照**: `15-domain-model-interaction.md` - ドメインモデルとの関係性

## UseCase層の責務

### 実施すること

1. **ビジネスロジック実行**: ユースケース固有のルール実装
2. **エンティティ協調**: 複数エンティティ/リポジトリの組み合わせ
3. **Result型返却**: 成功/失敗を型安全に表現
4. **トランザクション管理**: Unit of Workで複数操作を調整
5. **ドメインエラー定義**: ビジネス文脈に基づくエラー

### 実施しないこと

1. **HTTPリクエスト処理**: Handler層の責務
2. **型レベルのバリデーション**: Handler層でZodスキーマで実施済み
3. **データベースアクセス実装**: Infrastructure層（リポジトリ）に委譲
4. **レスポンス変換**: Handler層のマッパーに委譲

## ポリシー構成

| ポリシー | 内容 |
|---------|------|
| **10-use-case-overview.md** | ユースケース層の全体像、責務、命名規則、バリデーション戦略、Result型パターン、エラー型定義 |
| **15-domain-model-interaction.md** | ドメインモデル貧血症防止、Entity操作パターン（新規作成・PUT更新・PATCH更新・個別メソッド）、reconstruct()使い分け、Value Objectエラー変換 |
| **20-use-case-implementation.md** | 実装テンプレート、Props型設計、ビジネスルール検証パターン、Result型伝播、トランザクション管理、PATCH更新マージロジック、時刻取得・ログ出力・DIコンテナ登録 |
| **30-use-case-testing.md** | Small Test/Medium Test実装パターン、Dummyリポジトリパターン、テストカバレッジ戦略、テストヘルパー、テスト実行戦略 |

## ファイル構成

```
use-case/
├── interfaces.ts                     # 基底インターフェース
├── {entity}/                         # エンティティごとのディレクトリ
│   ├── {action}-{entity}-use-case.ts
│   └── {action}-{entity}-use-case.small.test.ts
```

## 命名規則

| 対象 | パターン | 例 |
|------|---------|-----|
| ファイル名 | `{action}-{entity}-use-case.ts` | `create-project-use-case.ts` |
| テストファイル | `{action}-{entity}-use-case.small.test.ts` | `create-project-use-case.small.test.ts` |
| 実装クラス | `{Action}{Entity}UseCaseImpl` | `CreateProjectUseCaseImpl` |
| インターフェース | `{Action}{Entity}UseCase` | `CreateProjectUseCase` |
| Input型 | `{Action}{Entity}UseCaseInput` | `CreateProjectUseCaseInput` |
| Output型 | `{Action}{Entity}UseCaseOutput` | `CreateProjectUseCaseOutput` |
| Exception型 | `{Action}{Entity}UseCaseException` | `CreateProjectUseCaseException` |
| Result型 | `{Action}{Entity}UseCaseResult` | `CreateProjectUseCaseResult` |
| Props型 | `{Action}{Entity}UseCaseProps` | `CreateProjectUseCaseProps` |

## アクション命名規則

| アクション | 用途 | 例 |
|---------|------|-----|
| `register` | 新規登録 | `register-todo-use-case` |
| `create` | リソース作成 | `create-project-use-case` |
| `get` | 単一取得 | `get-project-use-case` |
| `list` | リスト取得 | `list-projects-use-case` |
| `update` | 更新 | `update-project-use-case` |
| `delete` | 削除 | `delete-project-use-case` |
| `prepare-*` | 準備処理 | `prepare-attachment-upload-use-case` |

## レイヤー間の関係

```
Handler層
  ↓ (Zodバリデーション済みInput)
ユースケース層（このドキュメント）
  - ビジネスロジック実行
  - エンティティ協調
  ↓ (リポジトリインターフェース呼び出し)
Domain層
  - エンティティ操作
  ↓
Infrastructure層
  - データ永続化
  ↓ (Result型)
ユースケース層
  ↓ (Result型)
Handler層
  - レスポンス変換
  - エラー変換
```

## バリデーション戦略（MECE原則）

**参照**:
- `guardrails/constitution/validation-principles.md` - バリデーション原則の詳細
- `20-use-case-implementation.md` - ビジネスルール検証パターン

### バリデーション階層におけるユースケース層の位置付け

バリデーションは4つの階層に分類され、ユースケース層は**第3階層：ビジネスルール**を担当する。

| 階層 | 責務 | 実装場所 | 例 |
|------|------|---------|-----|
| 1. 型レベル | 形式・長さ・型・必須性 | Handler層（Zod） | `name: string（1文字以上）` |
| 2. ドメインルール | ドメイン固有制約 | Domain層（Value Object） | `ProjectColor.fromString()` |
| **3. ビジネスルール** | **権限・状態・関連チェック** | **ユースケース層** | **権限チェック、重複チェック** |
| 4. 構造的整合性 | エンティティ不変条件 | Entity層（最小限） | readonly等で保護 |

### ユースケース層の責務（第3階層）

**実施すること**: データベース参照を伴うビジネスルールの検証

1. **権限チェック**: リソースへのアクセス権限確認
2. **リソース存在確認**: 参照先データの存在チェック
3. **重複チェック**: ユニーク制約の検証
4. **状態遷移ルール**: ビジネス文脈での状態変更可否

**実施しないこと**:

- **型レベルのバリデーション**（第1階層）: Handler層でZodスキーマによる検証が完了済み
- **ドメインルールの検証**（第2階層）: Domain層のValue Objectで検証済み

**詳細な実装パターン**: `20-use-case-implementation.md` - ビジネスルール検証パターン

### MECE原則の適用

**Mutually Exclusive（相互排他的）**: 同じバリデーションを複数層で重複しない

**Collectively Exhaustive（網羅的）**: ビジネスルールはすべてユースケース層で検証

**利点**:
- 保守性: ビジネスルール変更が一箇所で完結
- 信頼性: 各層の責務が明確で検証漏れを防止
- テスタビリティ: 各層を独立してテスト可能

## Result型パターン

```typescript
// 基底インターフェース
export type UseCase<TInput, TOutput, TException extends Error> = {
  execute(input: TInput): Promise<Result<TOutput, TException>>;
};

// Result型定義
export type Success<T> = {
  success: true;
  data: T;
};

export type Failure<E extends Error> = {
  success: false;
  error: E;
};

export type Result<T, E extends Error> = Success<T> | Failure<E>;
```

**特徴**:
- 例外を投げず、Result型でエラーを表現
- 型システムでエラーハンドリング強制
- Handler層でのエラー変換が容易

## エラー型の定義

| エラー型 | 用途 | 例 |
|---------|------|-----|
| ValidationError | ビジネスルール違反 | "プロジェクト名を入力してください" |
| NotFoundError | リソース未存在 | "ユーザーが見つかりません" |
| ConflictError | 重複データ | "このユーザーはすでに登録されています" |
| ForbiddenError | アクセス権限なし | "プロジェクトへのアクセス権限がありません" |
| UnexpectedError | 予期しないエラー | DB接続エラー等 |

## テスト戦略

### Small Test (`.small.test.ts`)

- **目的**: ユニットテスト
- **依存**: Dummy実装を使用
- **実行速度**: 高速
- **カバレッジ**: 正常系、異常系、境界値

### Medium Test (`.medium.test.ts`)

- **目的**: 統合テスト
- **依存**: 実DynamoDB使用
- **実行速度**: 低速
- **カバレッジ**: トランザクション動作確認

## Do / Don't

### ✅ Good

```typescript
// 明示的な型定義
export type CreateProjectUseCaseInput = {
  name: string;
  description?: string;
  color: string;
};

// Result型での明示的エラー処理
if (!saveResult.success) {
  return { success: false, error: saveResult.error };
}

// 依存性の明示（Props型）
export type CreateProjectUseCaseProps = {
  readonly projectRepository: ProjectRepository;
  readonly logger: Logger;
  readonly fetchNow: FetchNow;
};

// 単一責任原則（1アクション = 1ユースケース）
// create-project-use-case.ts - プロジェクト作成のみ
// delete-project-use-case.ts - プロジェクト削除のみ
```

### ❌ Bad

```typescript
// any型の使用
async execute(input: any): Promise<any>

// 例外を投げる
try {
  await this.#projectRepository.save(...);
} catch (error) {
  throw error; // ❌ Result型で返すべき
}

// 型レベルのバリデーション
if (input.name.length === 0) {
  // ❌ Handler層でZodスキーマで検証済み
}

// 複数のアクションを1つに含める
// manage-project-use-case.ts（作成・削除・更新を全て含む）
```
