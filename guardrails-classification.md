# ガードレール分類：検証の性質によるMECE分類

本ドキュメントは、全ポリシーファイル（`guardrails/policy/**/*.md`）から抽出したルールを**検証の性質**で抽象的かつMECEに分類したものです。

https://note.com/hideyuki_toyama/n/n24fd932811f5
https://zenn.dev/hideyuki_toyama/articles/ai-transaction-boundary-guard

---

## 最重要：横と縦の区別

ガードレールには2つの軸があり、**これらを混同しないことが最重要項目**です。

### Horizontal（横のガードレール）

**定義**: 各レイヤー（Handler/UseCase/Domain/Repository等）ごとの**技術的なルール**

**特徴**:

- 機能に依存しない共通原則
- レイヤーの責務境界を守るための構造的制約
- 全機能（Todo/Project/User等）に横断的に適用

**例**:

- Handler層: `container.get()`でLogger/UseCaseのみ取得可能
- UseCase層: 複数書き込みはトランザクション保護必須
- Domain層: Entityプロパティは`readonly`必須

**実装方法**:

- **全てTypeScript Compiler APIで自前実装**（P1/P2/P3すべて）
- 誤検知>30%のP3ルールも含めて、TypeScript実装がSSOT
- TypeScript実装 → `horizontal/generated/semantic/` Markdown → qualitativeレビューで使用

**配置先**:

```
guardrails/policy/horizontal/
├── static/                  # TypeScript実装（SSOT）
│   ├── server/
│   │   ├── handler/
│   │   ├── use-case/
│   │   ├── domain-model/
│   │   └── repository/
│   ├── web/
│   └── infra/
└── generated/
    └── semantic/            # 自動生成Markdown
        ├── server/
        │   ├── handler/
        │   ├── use-case/
        │   ├── domain-model/
        │   └── repository/
        ├── web/
        └── infra/
```

---

### Vertical（縦のガードレール）

**定義**: 機能単位（Todo/Project/User等）で4層を貫く**ビジネス契約との整合性検証**

**特徴**:

- 機能ごとのビジネス契約（用語集・シナリオ）と照合
- Contract → Domain → UseCase → Handler の一貫性を検証
- 機能ごとに独立した検証

**例**:

- Entity名が用語集に記載されているか（`Todo`エンティティ ⇔ 用語集「TODO」）
- メソッド名がシナリオ記述と対応しているか（`register()` ⇔ シナリオ「登録する」）
- 4層でユビキタス言語が一貫しているか

**実装方法**:

- **カスタムlintでは実装しない**
- ビジネス契約ファイルとの照合が必要
- 専用の検証ツールまたはqualitativeレビューで対応

**配置先**:

```
guardrails/policy/vertical/  # 機能ごとの検証ポリシー
├── todo/                    # TODO機能の4層検証
├── project/                 # プロジェクト機能の4層検証
└── user/                    # ユーザー機能の4層検証
```

---

### 混同しやすい例と正しい分類

| ルール                                     | 一見        | 実際           | 理由                       |
| ------------------------------------------ | ----------- | -------------- | -------------------------- |
| Entity名が用語集に記載されているか         | horizontal? | **vertical**   | 機能ごとのビジネス契約照合 |
| メソッド名がシナリオと対応しているか       | horizontal? | **vertical**   | 機能ごとのビジネス契約照合 |
| Value Object化の必要性                     | vertical?   | **horizontal** | ドメイン層全体の技術的原則 |
| 不変条件を持つフィールドがVO化されているか | vertical?   | **horizontal** | 機能横断の構造的制約       |

---

## TypeScript実装からMarkdown生成の方針

### 基本方針

**非機能のSSOT（Single Source of Truth）はTypeScript実装である**

TypeScript Compiler APIによる検証実装が唯一の真実（SSOT）であり、そこから `guardrails/policy/horizontal/generated/semantic/` 配下にセマンティックレビュー用のポリシードキュメント（Markdown）を自動生成します。

```
TypeScript実装（TypeScript Compiler API）← SSOT
    ↓ LLMで自動生成
horizontal/generated/semantic/（Markdown）← 派生物（人とAIがポリシーを理解するため）
```

### アノテーション形式

各TypeScript実装には、以下のアノテーションを付けてセマンティックな文脈を示唆します。

- `@what`: 何をチェックするか
- `@why`: なぜチェックするか（ビジネス上の理由、技術的な理由）
- `@failure`: 違反を検出した場合の終了条件
- `@example-bad`: 違反コード例（LLM生成時に使用）
- `@example-good`: 正しいコード例（LLM生成時に使用）

**例**:

```typescript
/**
 * @what 複数の書き込みを行うUseCaseがトランザクションで保護されているか検査
 * @why 複数書き込みを非トランザクションで行うと部分的コミットが発生するため
 * @failure 書き込み>=2 かつトランザクションなしのメソッドを検出した場合に非0終了
 * @example-bad
 *   async execute(input) {
 *     await this.projectRepo.delete({ id: input.id });
 *     await this.todoRepo.deleteByProject({ projectId: input.id });
 *   }
 * @example-good
 *   async execute(input) {
 *     return this.uowRunner.run(async (uow) => {
 *       await uow.projectRepo.delete({ id: input.id });
 *       await uow.todoRepo.deleteByProject({ projectId: input.id });
 *       return Result.ok(undefined);
 *     });
 *   }
 */
```

### 誤検知許容の方針

**誤検知するくらいのガードレール + ignore（理由付き）がAI駆動では丁度良い**

- 静的解析は**積極的に誤検知する**設計を許容
- AI駆動開発では、「見逃し」より「誤検知」の方が安全
- 誤検知箇所は `// @guardrails-ignore` で個別にignore

#### ignoreコメントには必ず理由を明示

```typescript
// ✅ Good: 理由を明示
// @guardrails-ignore use-case/transaction-protection -- 読み取り専用操作のため不要
// @guardrails-ignore domain-model/readonly-properties -- 内部状態の一時的な変更のため

// ❌ Bad: 理由なし
// @guardrails-ignore use-case/transaction-protection
```

---

## 1. 検証の性質によるMECE分類

### 1-A. 構文的検証（AST単独で判定可能）

**特徴**: トークンやノード構造のみで判定。TypeScript型情報不要。誤検知<5%

#### 1-A-1. モディファイア・可視性の検証

**定義**: `readonly`、`private`、`public`などのキーワード有無

**代表例**:

- Entity/Value Objectのプロパティが`readonly`であることを検証
- Entity/Value Objectのコンストラクタが`private`であることを検証
- ES2022プライベートフィールド（`#`）の正しい使用

**優先度**: P1（即座に実装可能）

#### 1-A-2. 制御文の有無

**定義**: `throw`文、`null`チェック（`| null`型アノテーション）の存在

**代表例**:

- ドメイン層でのthrow文の禁止
- `null`の使用禁止（`undefined`を強制）
- Value Objectで例外を投げる場合の検出

**優先度**: P1

#### 1-A-3. クラス・インターフェース構造

**定義**: `class`/`interface`/`type`の定義形式

**代表例**:

- Entity/Value Objectが`class`で定義されていることを確認
- Props型が`type`エイリアスで定義されていることを確認
- インターフェースが`export`されていることを確認

**優先度**: P1

#### 1-A-4. ファイル命名規則

**定義**: ファイル名パターン（`.entity.ts`、`.vo.ts`、`.repository.ts`など）

**代表例**:

- Entity: `{name}.entity.ts`
- Value Object: `{name}.vo.ts`
- Repository: `{name}.repository.ts`
- UseCase: `{action}-{entity}-use-case.ts`
- Handler: `{action}-{entity}-handler.ts`

**優先度**: P1

#### 1-A-5. ImportパターンとCircular依存

**定義**: import文のパターン、循環依存の検出

**代表例**:

- Domain層が外部ライブラリ（AWS SDK、Hono、Zod）をimportしないこと
- Handler層がRepository直接importしていないこと
- 依存の方向が一方向のみ（`routes/ → features/ → lib/`）

**優先度**: P2（循環依存検出には型解析が必要）

#### 1-A-6. JSDocコメントの有無

**定義**: JSDoc形式（`/** ... */`）のコメント必須確認

**代表例**:

- Entity/Value Object/メソッドにJSDocがあること
- Tier 2フィールドの場合、undefinedの意味を記載していること

**優先度**: P1

#### 1-A-7. メソッド命名規則

**定義**: メソッド名のパターン（`from()`、`equals()`、`toString()`、`canTransitionTo()`など）

**代表例**:

- Value Objectに`from()`、`equals()`、`toString()`があること
- Entity操作メソッドが汎用動詞（`set`、`change`、`update`）を避けていること
- ビジネスドメインの言葉を使用していること

**優先度**: P2（文脈理解が必要）

---

### 1-B. 構造的検証（複数ファイル/モジュール間の関係）

**特徴**: ファイル間の相互参照、モジュール間の依存を検査。誤検知<15%

#### 1-B-1. 依存の方向性検証

**定義**: モジュール間の依存が単方向であること

**代表例**:

- `handler/ → use-case/ → domain/ → util/`（Domain層が他に依存しない）
- `routes/ → features/ → lib/`（Web層での方向性）
- Port層がDomain層に依存していないこと

**優先度**: P2

#### 1-B-2. 集約境界の完全性

**定義**: 集約ルートと子エンティティが同一ディレクトリに配置されていること

**代表例**:

- `domain/model/todo/`に`todo.entity.ts`と`attachment.entity.ts`が共存
- `todo.repository.ts`が集約全体を操作する
- 子エンティティ専用のリポジトリが存在しないこと

**優先度**: P2

#### 1-B-3. コロケーション検証

**定義**: コンポーネント・フック・ロジックが使用スコープに応じた層に配置されていること

**代表例**:

- Route固有コンポーネントが`routes/{feature}/components/`に配置
- 3+ルート横断コンポーネントが`features/`に配置
- 共有コードが`_shared/`に配置
- 純粋ユーティリティが`lib/`に配置

**優先度**: P3（ディレクトリ構造解析が複雑）

#### 1-B-4. レイヤー間のメソッド呼び出し制約

**定義**: 層間での関数呼び出し制限（例: Handlerから直接Repositoryへのアクセス禁止）

**代表例**:

- Handler: `container.get()`でLoggerとUseCaseのみ取得可能
- UseCase: 複数UseCase呼び出しの禁止
- Repository: 単一Value Objectの不変条件チェック禁止（Value Object層で実施済み）

**優先度**: P2

#### 1-B-5. ファイル間の型定義の整合性

**定義**: Props型、Input型、Output型がファイル間で一貫しているか

**代表例**:

- Entity Props型とRepository変換関数で使用される型の一致
- UseCase Input型とHandler入力バリデーション型の整合性
- API契約型（OpenAPI生成型）とコンポーネント Props型の対応

**優先度**: P3（セマンティック解析が必要）

---

### 1-C. 意味的検証（セマンティック解析）

**特徴**: コードの意図、ビジネス概念、責務を理解する必要。誤検知>30%。**カスタムlintで実装（誤検知許容）**

#### 1-C-1. 責務の境界違反

**定義**: レイヤー間の責務が適切に分離されているか

**代表例**:

- Entity層がビジネスロジック（権限チェック）を含んでいないか
- Handler層がビジネスルール検証を含んでいないか（Zod検証のみ）
- Value Object層がドメイン外の技術要素（AWS, S3パス）を含んでいないか

**カスタムlint化**: P3（誤検知>30%、カスタムlintで実装）

#### 1-C-2. バリデーション階層の違反（MECE原則）

**定義**: 同じバリデーションが複数層で重複実装されていないか

**代表例**:

- 型レベルバリデーション（長さ、必須性）がHandler層のみで実施されているか
- ドメインルール検証がValue Object層のみで実施されているか
- ビジネスルール検証（権限、存在確認）がUseCase層のみで実施されているか

**カスタムlint化**: P3（誤検知>30%、カスタムlintで実装）

#### 1-C-3. Value Object化の必要性

**定義**: Value Object化すべきフィールドが正しくVO化されているか

**代表例**:

- 不変条件を持つフィールド（Tier 1）は必ずVO化
- ドメインルールを持つフィールド（Tier 2）はVO化推奨
- 型レベル制約のみ（Tier 3）はプリミティブでOK

**カスタムlint化**: P3（誤検知>30%、カスタムlintで実装）

**注**: ビジネス用語との整合性（Entity名が用語集に記載されているか、メソッド名がシナリオと対応しているか等）は**Vertical（縦のガードレール）**の検証項目であり、このドキュメント（Horizontal）の対象外です。

#### 1-C-4. 型安全性とResult型パターン

**定義**: 失敗可能性のあるメソッドが`Result<T, E>`を返しているか

**代表例**:

- Value Object生成でバリデーション失敗可能 → `Result`返却必須
- Entity.from()でデータ整合性チェック → `Result`返却必須
- UseCase実行でビジネスルール違反可能 → `Result`返却必須
- 必ず成功するメソッド（Entity個別操作）は直接値返却

**カスタムlint化**: 中程度（型情報+制御フロー解析）

---

## 2. 検証対象によるMECE分類

### 2-A. コード構造

#### 2-A-1. readonly修飾子

| 対象                          | ルール                 | 例                                           |
| ----------------------------- | ---------------------- | -------------------------------------------- |
| Entity/Value Objectプロパティ | すべて`readonly`       | `readonly id: string;`                       |
| Props型フィールド             | すべて`readonly`       | `readonly todo: TodoResponse;`               |
| Reactコンポーネント Props     | `readonly`で不変性表明 | `readonly onComplete: (id: string) => void;` |

**優先度**: P1

#### 2-A-2. private/public修飾子

| 対象                               | ルール               | 例                                   |
| ---------------------------------- | -------------------- | ------------------------------------ |
| Entity/Value Objectコンストラクタ  | `private`必須        | `private constructor(props)`         |
| ファクトリメソッド                 | `static from()`      | `static from(props): Result<Entity>` |
| Value Objectプライベートフィールド | ES2022 `#`フィールド | `readonly #status: string;`          |

**優先度**: P1

#### 2-A-3. クラス継承・implements

| 対象                | ルール                            | 例                                                         |
| ------------------- | --------------------------------- | ---------------------------------------------------------- |
| Entity/Value Object | 継承不可（finalのようなふるまい） | `export class Todo { ... }`                                |
| UseCase実装         | インターフェース実装必須          | `class CreateTodoUseCaseImpl implements CreateTodoUseCase` |
| Repository実装      | インターフェース実装必須          | `class TodoRepositoryImpl implements TodoRepository`       |

**優先度**: P2

---

### 2-B. 依存関係

#### 2-B-1. Import文のパターン

| 禁止パターン                | 許可パターン      | 層           |
| --------------------------- | ----------------- | ------------ |
| AWS SDK import              | Result型、同layer | Domain層     |
| `throw` statement           | `Result.err()`    | Domain層全体 |
| 外部ライブラリ（Hono, Zod） | TypeScript標準    | Domain層     |
| Repository直接取得          | UseCase経由       | Handler層    |

**優先度**: P2

#### 2-B-2. サーキュラー依存

| パターン             | 理由                 | 対象  |
| -------------------- | -------------------- | ----- |
| A→B→C→A              | 循環参照は予測不可能 | 全層  |
| features内の相互参照 | 独立性を損なう       | Web層 |

**優先度**: P2

---

### 2-C. 命名規則

#### 2-C-1. ファイル命名

| 種類         | パターン                        | 例                           |
| ------------ | ------------------------------- | ---------------------------- |
| Entity       | `{name}.entity.ts`              | `todo.entity.ts`             |
| Value Object | `{name}.vo.ts`                  | `todo-status.vo.ts`          |
| Repository   | `{name}.repository.ts`          | `todo.repository.ts`         |
| UseCase      | `{action}-{entity}-use-case.ts` | `create-project-use-case.ts` |
| Handler      | `{action}-{entity}-handler.ts`  | `create-project-handler.ts`  |
| Component    | `{name}.tsx`                    | `TodoItem.tsx`               |
| Hook         | `use{Name}.ts`                  | `useTodoFilter.ts`           |

**優先度**: P1

#### 2-C-2. クラス/型名命名

| 対象         | パターン                      | 例                                       |
| ------------ | ----------------------------- | ---------------------------------------- |
| Entity       | PascalCase                    | `Todo`, `TodoStatus`                     |
| Value Object | PascalCase                    | `Email`, `ProjectColor`                  |
| UseCase実装  | `{Action}{Entity}UseCaseImpl` | `CreateProjectUseCaseImpl`               |
| UseCase型    | `{Action}{Entity}UseCase`     | `CreateProjectUseCase`                   |
| Props型      | `{ClassName}Props`            | `TodoProps`, `CreateProjectUseCaseInput` |

**優先度**: P1

#### 2-C-3. メソッド命名

| 用途         | パターン            | 例                                     |
| ------------ | ------------------- | -------------------------------------- |
| ファクトリ   | `from()`            | `TodoStatus.from()`                    |
| 等価性       | `equals()`          | `email.equals(other)`                  |
| 文字列化     | `toString()`        | `status.toString()`                    |
| ビジネス操作 | ビジネス動詞        | `complete()`, `approve()`, `clarify()` |
| 状態判定     | `is{State}()`       | `isCompleted()`, `isTodo()`            |
| 遷移可能判定 | `canTransitionTo()` | `status.canTransitionTo(newStatus)`    |

**優先度**: P2

---

### 2-D. 型システム

#### 2-D-1. Result型パターン

| 場面                   | 戻り値型           | 例                                            |
| ---------------------- | ------------------ | --------------------------------------------- |
| バリデーション失敗可能 | `Result<T, E>`     | `ValueObject.from(): Result<VO, DomainError>` |
| 必ず成功               | `T`                | `entity.clarify(): Todo`                      |
| ビジネスルール違反可能 | `Result<T, Error>` | `useCase.execute(): Result<Output, Error>`    |

**優先度**: P2

#### 2-D-2. Props型定義

| パターン      | ルール                         | 例                                       |
| ------------- | ------------------------------ | ---------------------------------------- | ---------------------------------- |
| Entity Props  | すべてのフィールドを`          | undefined`で必須化                       | `{ dueDate: string \| undefined }` |
| UseCase Input | 入力を明示的に型定義           | `{ title: string; projectId?: string; }` |
| 変換型        | `z.infer<typeof schema>`で定義 | `type TodoDdbItem = z.infer<...>`        |

**優先度**: P1

#### 2-D-3. readonly型と不変性

| 対象                 | ルール             | 例                                         |
| -------------------- | ------------------ | ------------------------------------------ |
| Entity/VO Props      | `readonly`修飾     | `readonly id: string;`                     |
| コンポーネント Props | `readonly`修飾     | `readonly todo: TodoResponse;`             |
| 配列                 | `ReadonlyArray<T>` | `readonly todos: readonly Todo[]`          |
| メソッド戻り値       | 新インスタンス返却 | `update(): Todo { return new Todo(...); }` |

**優先度**: P1

---

### 2-E. アーキテクチャパターン

#### 2-E-1. DI（Dependency Injection）

| ルール                                 | 例                           |
| -------------------------------------- | ---------------------------- |
| Props型で依存を受け取る                | `{ container, logger, uow }` |
| `container.get()`はLoggerとUseCaseのみ | Handler層の制限              |
| リポジトリはDIコンテナから取得しない   | UseCase経由で依存注入        |

**優先度**: P2

#### 2-E-2. Port/Adapter パターン

| 層      | 責務                 | 例                                    |
| ------- | -------------------- | ------------------------------------- |
| Port    | インターフェース定義 | `Logger`, `FetchNow`, `StorageClient` |
| Adapter | 実装                 | `ConsoleLogger`, `AwsAuthClient`      |

**優先度**: P2

#### 2-E-3. Unit of Work

| ルール                     | 例                                                  |
| -------------------------- | --------------------------------------------------- |
| トランザクション操作を登録 | `uow.registerOperation()`                           |
| uow有無で動作分岐          | `if (uow) { uow.register(...) } else { execute() }` |
| 成功時自動コミット         | コールバック終了時                                  |
| エラー時自動ロールバック   | エラー発生時                                        |

**優先度**: P2

#### 2-E-4. Repository パターン

| ルール                           | 例                                     |
| -------------------------------- | -------------------------------------- |
| 集約ルート単位で操作             | Attachment個別操作不可                 |
| ドメイン↔DB変換                 | Zod schema + 変換関数                  |
| Value Object生成時エラーハンドル | `from()` → `default()`でフォールバック |

**優先度**: P2

---

### 2-F. 制御フロー

#### 2-F-1. throw禁止

| ルール             | 例             |
| ------------------ | -------------- |
| 全層で例外使用禁止 | Result型で表現 |
| 失敗を返す         | `Result.err()` |

**優先度**: P1

#### 2-F-2. メソッド内ロジック

| ルール                                          | 例                        |
| ----------------------------------------------- | ------------------------- |
| executeメソッド単一（プライベートメソッド不可） | UseCase層で全ロジック記述 |
| 複数UseCase呼び出し禁止                         | Handler層で制限           |
| ビジネスロジック適切な層に配置                  | 権限チェック→UseCase      |

**優先度**: P2

---

## 3. レイヤー別責務境界ルール（MECE）

### 3-A. Domain層

#### 3-A-1. Entity層

| 禁止                 | 必須                |
| -------------------- | ------------------- |
| `throw`使用          | `Result`返却        |
| `null`使用           | `undefined`使用     |
| 外部ライブラリimport | 同層内Entity/VO参照 |
| Mutableプロパティ    | `readonly`修飾      |
| 複雑な計算           | Value Object委譲    |

**検証対象**:

- `readonly`修飾子検証（P1）
- `private constructor`検証（P1）
- `throw`statement検証（P1）
- Value Object参照のみ（P2）

#### 3-A-2. Value Object層

| 禁止                                     | 必須                                |
| ---------------------------------------- | ----------------------------------- |
| `public constructor`                     | `private constructor` + `from()`    |
| 例外throw                                | `Result.err()`返却                  |
| 必ず成功する形式                         | 不変条件必須                        |
| アンダースコアプレフィックス（`_value`） | ES2022プライベートフィールド（`#`） |

**検証対象**:

- ES2022 `#`フィールド使用（P1）
- `from()`メソッド存在確認（P1）
- `equals()`/`toString()`実装確認（P1）
- Result型返却確認（P2）

---

### 3-B. Handler層

#### 3-B-1. HTTPハンドラー

| 禁止                   | 必須                  |
| ---------------------- | --------------------- |
| ビジネスロジック実装   | Zod入力バリデーション |
| Repository直接取得     | UseCase呼び出しのみ   |
| 複数UseCase呼び出し    | 単一UseCase実行       |
| レスポンス変換ロジック | 変換関数使用          |

**検証対象**:

- `container.get()`対象がLoggerとUseCaseのみ（P2）
- 複数UseCase呼び出し検出（P2）
- try-catch存在確認（P1）
- Result型チェック（`isOk()`, `isErr()`）確認（P1）

---

### 3-C. UseCase層

#### 3-C-1. 単一責任

| ルール                    | 例                           |
| ------------------------- | ---------------------------- |
| 1ユースケース = 1シナリオ | `RegisterTodoUseCase`        |
| 複数UseCase呼び出し禁止   | 統合が必要ならシナリオ見直し |
| executeメソッドのみ公開   | プライベートメソッド不可     |

**検証対象**:

- `execute()`単一メソッド確認（P1）
- Input/Output型定義確認（P1）
- Result型返却確認（P2）

#### 3-C-2. バリデーション層（MECE原則）

| 層      | 責務                             | 禁止                   |
| ------- | -------------------------------- | ---------------------- |
| UseCase | ビジネスルール（権限、存在確認） | 型レベルバリデーション |
| Domain  | ドメインルール                   | 外部依存チェック       |
| Handler | 型レベルバリデーション           | ビジネスロジック       |

**検証対象**:

- バリデーション重複検出（P3）
- NotFoundError/ForbiddenError/ConflictError適切使用（P3）

---

### 3-D. Repository層

#### 3-D-1. 集約操作

| ルール                           | 例                               |
| -------------------------------- | -------------------------------- |
| 集約ルート単位                   | TodoRepository（Attachment含む） |
| 子エンティティ専用リポジトリ禁止 | AttachmentRepositoryなし         |
| ID生成                           | `uuid()`利用                     |

**検証対象**:

- リポジトリ命名確認（`{Entity}Repository`）（P1）
- 集約境界内ファイル配置確認（P2）

---

### 3-E. Web層（Route/Component）

#### 3-E-1. Route設計

| ルール         | 例                              |
| -------------- | ------------------------------- |
| ロール括弧付き | `({role})/`                     |
| コロケーション | route固有コード同一ディレクトリ |
| 依存方向       | `routes/ → features/ → lib/`    |

**検証対象**:

- ディレクトリ配置パターン確認（P3）
- Import方向検証（P2）

#### 3-E-2. Component設計

| ルール             | 例                             |
| ------------------ | ------------------------------ |
| Props readonly     | `readonly todo: TodoResponse;` |
| API型参照          | `TodoResponse`を直接使用       |
| UIプリミティブ利用 | `app/lib/ui/`から import       |

**検証対象**:

- Props型に`readonly`修飾（P1）
- API型参照確認（P2）

---

### 3-F. UI層（UIプリミティブ）

#### 3-F-1. Leaf/Composite分類

| 対象      | ルール            | 例                         |
| --------- | ----------------- | -------------------------- |
| Leaf      | サイズvariant管理 | Button（size, variant）    |
| Composite | 内部余白管理      | Card（デフォルト余白あり） |

**検証対象**:

- CVAvariant定義確認（P1）
- forwardRef使用確認（P1）
- displayName設定確認（P1）

#### 3-F-2. className制御

| ルール                          |
| ------------------------------- |
| classNameプロパティ受け入れない |
| 配置は親でラップ                |
| variant/sizeで選択肢限定        |

**検証対象**:

- className受け入れないことを確認（P1）

---

## 4. 実装難易度マトリクス

```
                  構文的検証        構造的検証        意味的検証
                  (AST単独)      (複数ファイル)    (セマンティクス)
─────────────────────────────────────────────────────────────

コード構造
  readonly/private         P1             —               —
  クラス定義形式           P1             —               —
  ファイル命名             P1             —               —
  JSDocコメント           P1             —               —

依存関係
  Import制限               P2            P2               —
  循環依存                 —             P2               —
  レイヤー間メソッド呼び出し —            P2              P3

命名規則
  ファイル名               P1             —               —
  メソッド名               P2             —              P3
  ビジネス用語対応         —              —              P3

型システム
  Result型パターン         P2             —              P2
  Props型定義             P1             —               —
  readonly型             P1             —               —

アーキテクチャ
  DI構造                   —             P2               —
  Port/Adapter            —             P2               —
  UnitOfWork              —             P2              P3
  Repository集約           —             P2              P3

制御フロー
  throw禁止                P1             —               —
  executeメソッド単一      P1             —              P2
  MECE原則検証            —              —              P3
```

---

## 5. カスタムlint実装の優先順位

### Phase 1: P1ルール（構文検証のみ）- 即座に実装可能

**誤検知率**: < 5%

1. ファイル命名規則検証（glob + regex）
2. readonly/private修飾子検証
3. throw文検出・禁止
4. `| null`型アノテーション検出・禁止
5. JSDocコメント有無確認
6. Props型の`readonly`修飾確認
7. try-catch存在確認（Handler層）

**対象ポリシー**: Entity実装、Value Object実装、Handler実装

### Phase 2: P2ルール（型情報+構造検証）- 中程度の複雑さ

**誤検知率**: < 15%

1. Import方向検証（循環依存検出）
2. `container.get()`対象制限（Handler層）
3. Result型返却確認
4. Zodスキーマ定義存在確認
5. Value Object変換エラー処理確認
6. UnitOfWork登録/実行パターン確認
7. コロケーション配置パターン確認

**対象ポリシー**: Domain層全体、Handler層、Repository層

### Phase 3: P3ルール（セマンティック解析）

**誤検知率**: > 30%（ignoreで対処）

1. 責務境界違反検出（コンテキスト理解）
2. MECE原則検証（バリデーション重複検出）
3. Value Object化の必要性判定
4. 変換関数内ビジネスロジック検出

**実装方針**:

- **カスタムESLintで実装**（horizontalの原則）
- 誤検知>30%を許容
- `// eslint-disable-next-line {rule-name} -- {理由}` で個別にignore

**注**: ビジネス用語との整合性、メソッド命名のビジネス意図確認は**Vertical（縦のガードレール）**の検証項目であり、このドキュメント（Horizontal）の対象外です。

**対象ポリシー**: 全層（Domain/UseCase/Handler/Repository）

---

## 6. ディレクトリ構造

```
# カスタムlint実装（SSOT）
server/guardrails/
├── handler/
│   ├── container-get-restriction.ts       # TypeScript実装（SSOT）
│   ├── single-usecase-call.ts
│   └── index.ts
├── use-case/
│   ├── transaction-protection.ts
│   ├── result-type-return.ts
│   └── index.ts
├── domain-model/
│   ├── readonly-properties.ts
│   ├── no-external-dependencies.ts
│   └── index.ts
└── di-container/
    ├── import-type-usage.ts
    └── index.ts

web/guardrails/
├── component/
│   ├── selector-strategy.ts
│   └── index.ts
└── hooks/
    ├── tanstack-query-pattern.ts
    └── index.ts

# セマンティックレビュー用ポリシー（派生物）
guardrails/policy/
├── horizontal/
│   └── generated/           # LLMで自動生成されるMarkdownポリシー
│       ├── server/
│       │   ├── handler/
│       │   │   ├── container-get-restriction.md
│       │   │   └── single-usecase-call.md
│       │   ├── use-case/
│       │   │   ├── transaction-protection.md
│       │   │   └── result-type-return.md
│       │   └── domain-model/
│       │       ├── readonly-properties.md
│       │       └── no-external-dependencies.md
│       └── web/
│           ├── component/
│           │   └── selector-strategy.md
│           └── hooks/
│               └── tanstack-query-pattern.md
└── vertical/                # 縦のガードレール（機能検証）
    ├── todo/                # TODO機能の4層検証
    ├── project/             # プロジェクト機能の4層検証
    └── user/                # ユーザー機能の4層検証
```

---

## 7. 検証対象の具体的な分布

### サーバー側（約20個の検証パターン）

| レイヤー     | P1  | P2  | P3  |
| ------------ | --- | --- | --- |
| Domain層     | 8   | 5   | 3   |
| Handler層    | 4   | 4   | 2   |
| UseCase層    | 3   | 3   | 3   |
| Repository層 | 3   | 4   | 2   |
| UnitOfWork層 | 1   | 3   | 2   |

### Web層（約12個の検証パターン）

| レイヤー       | P1  | P2  | P3  |
| -------------- | --- | --- | --- |
| Route          | 2   | 2   | 2   |
| Component      | 3   | 2   | 2   |
| Hook           | 2   | 1   | 1   |
| UIプリミティブ | 4   | 1   | 1   |

---

## まとめ

### カスタムlint化対象の全体像

- **構文検証（P1）**: 90%はESLintとNode.js AST解析で実装可能（誤検知<5%）
- **構造検証（P2）**: 複雑な依存関係解析が必要。TypeScript型情報+トランスパイラ活用で対応可能（誤検知<15%）
- **意味的検証（P3）**: **カスタムESLintで実装**。誤検知>30%を許容し、ignoreで対処。カスタムlint → `horizontal/generated/` Markdown → `mcp__guardrails__review_qualitative`で使用

### 優先実装戦略

P1 → P2 → P3の順に段階的に実装することで、段階的な品質向上が実現可能。

**生成日**: 2026-01-17
