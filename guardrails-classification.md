# ガードレール分類：縦（機能検証）と横（非機能検証）

本ドキュメントは、全ポリシーファイル（`guardrails/policy/**/*.md`）から抽出したルールを「縦のガードレール（機能検証）」と「横のガードレール（非機能検証）」に分類したものです。

---

## カスタムlint自動生成の方針

### 基本方針

**非機能のSSOT（Single Source of Truth）はカスタムlintである**

カスタムESLintルール（TypeScript実装）が唯一の真実（SSOT）であり、そこから `guardrails/policy/horizontal/generated/` 配下にセマンティックレビュー用のポリシードキュメント（Markdown）を自動生成します。

```
カスタムlint（TypeScript）← SSOT
    ↓ LLMで自動生成
horizontal/generated/（Markdown）← 派生物（人とAIがポリシーを理解するため）
```

### アノテーション形式

各カスタムlintルールには、以下のアノテーションを付けてセマンティックな文脈を示唆します。

- `@what`: 何をチェックするか
- `@why`: なぜチェックするか（ビジネス上の理由、技術的な理由）
- `@failure`: 違反を検出した場合の終了条件

**例**:

```typescript
/**
 * @what 複数の書き込みを行うUseCaseがトランザクションで保護されているか検査
 * @why 複数書き込みを非トランザクションで行うと部分的コミットが発生するため
 * @failure 書き込み>=2 かつトランザクションなしのメソッドを検出した場合に非0終了
 */
```

### LLMによるポリシー生成

カスタムESLintルールの `@what`、`@why`、`@failure` アノテーションとAST実装をLLMに渡すことで、`guardrails/policy/horizontal/generated/` 配下にセマンティックレビュー用のポリシードキュメント（Markdown）を自動生成します。

**目的**: 人とAIがポリシーを読んで理解しやすくする

### TypeScript実装

**カスタムESLintルールはTypeScriptで実装する**

従来の `.cjs` (CommonJS) ではなく、TypeScript + TypeScript ESLint Parser を使用してカスタムルールを実装します。

#### 利点

1. **型安全性**: TypeScript ASTの型定義により、誤ったノード操作を防止
2. **開発効率**: IDEの補完・型チェックによる高速な開発
3. **保守性**: 型があることで、ルールの意図が明確になる
4. **統一性**: プロダクトコードと同じ技術スタックを使用

#### 実装例: トランザクション保護チェック

```typescript
/**
 * @what 複数の書き込みを行うUseCaseがトランザクションで保護されているか検査
 * @why 複数書き込みを非トランザクションで行うと部分的コミットが発生するため
 * @failure 書き込み>=2 かつトランザクションなしのメソッドを検出した場合に非0終了
 */

import { ESLintUtils } from '@typescript-eslint/utils';
import * as ts from 'typescript';

const WRITE_METHODS = new Set([
  'save', 'delete', 'remove', 'bulkInsert', 'bulkUpdate', 'upsert'
]);

const TRANSACTION_METHODS = new Set([
  'run', // UnitOfWorkRunner.run()
  'runInTransactionScope',
  'withTransaction',
  'executeInUnitOfWork'
]);

export default ESLintUtils.RuleCreator.withoutDocs({
  meta: {
    type: 'problem',
    docs: {
      description: 'UseCaseで複数書き込みを行う場合はトランザクション保護必須',
      recommended: 'error',
    },
    messages: {
      multipleWritesWithoutTransaction:
        '複数の書き込み操作({{count}}個)がトランザクション保護されていません。UnitOfWorkRunner.run()を使用してください。',
    },
    schema: [],
  },
  defaultOptions: [],

  create(context) {
    return {
      MethodDefinition(node) {
        // executeメソッドのみチェック
        if (node.key.type !== 'Identifier' || node.key.name !== 'execute') {
          return;
        }

        const analysis = analyzeMethod(node.value);

        if (analysis.isViolation) {
          context.report({
            node,
            messageId: 'multipleWritesWithoutTransaction',
            data: { count: analysis.writes },
          });
        }
      },
    };
  },
});

function analyzeMethod(node: any) {
  let writes = 0;
  let hasTransaction = false;

  function visit(child: any) {
    if (child.type === 'CallExpression') {
      // 書き込みメソッド呼び出しを検出
      if (child.callee.type === 'MemberExpression' &&
          child.callee.property.type === 'Identifier' &&
          WRITE_METHODS.has(child.callee.property.name)) {
        writes += 1;
      }

      // トランザクション境界を検出
      if (child.callee.type === 'MemberExpression' &&
          child.callee.property.type === 'Identifier' &&
          TRANSACTION_METHODS.has(child.callee.property.name)) {
        hasTransaction = true;
      }
    }

    // 再帰的に子ノードを走査
    if (child.body) visit(child.body);
    if (child.arguments) child.arguments.forEach(visit);
  }

  visit(node.body);

  return {
    writes,
    hasTransaction,
    isViolation: writes >= 2 && !hasTransaction,
  };
}
```

#### ディレクトリ構造（TypeScript版）

```
server/guardrails/
├── handler/
│   ├── container-get-restriction.ts      # TypeScript実装
│   ├── single-usecase-call.ts
│   └── index.ts
├── use-case/
│   ├── transaction-protection.ts         # 新規追加
│   ├── result-type-return.ts
│   └── index.ts
└── domain-model/
    ├── readonly-properties.ts
    ├── no-external-dependencies.ts
    └── index.ts
```

#### 既存.cjsルールの移行

既存の `.cjs` ルールは段階的にTypeScriptに移行します：

1. **Phase 1**: 新規ルールは全てTypeScriptで実装
2. **Phase 2**: 既存.cjsルールをTypeScriptに書き換え
3. **Phase 3**: .cjsファイルを削除

移行完了後、`eslint.config.js` でTypeScriptルールのみを読み込むように設定します。

### 誤検知許容の方針

**誤検知するくらいのガードレール + ignore（理由付き）がAI駆動では丁度良い**

- カスタムlintは**積極的に誤検知する**設計を許容
- AI駆動開発では、「見逃し」より「誤検知」の方が安全
- 誤検知箇所は `// eslint-disable-next-line` で個別にignore

#### ignoreコメントには必ず理由を明示

```typescript
// ✅ Good: 理由を明示
// eslint-disable-next-line use-case/transaction-protection -- 読み取り専用操作のため不要
// eslint-disable-next-line domain-model/readonly-properties -- 内部状態の一時的な変更のため
// eslint-disable-next-line handler/container-get-restriction -- テスト用のモック取得のため

// ❌ Bad: 理由なし
// eslint-disable-next-line use-case/transaction-protection
```

**理由記述のガイドライン**:
- なぜこのルールが適用されないのか
- どのような特殊なケースなのか
- 将来の保守者（人・AI）が理解できる説明

### ディレクトリ構造

```
# カスタムlint実装（SSOT）
server/guardrails/
├── handler/
│   ├── container-get-restriction.ts       # TypeScript実装（SSOT）
│   ├── single-usecase-call.ts
│   └── index.ts
├── use-case/
│   ├── transaction-protection.ts
│   └── index.ts
└── domain-model/
    ├── readonly-properties.ts
    └── index.ts

# セマンティックレビュー用ポリシー（派生物）
guardrails/policy/
├── horizontal/
│   └── generated/           # LLMで自動生成されるMarkdownポリシー
│       ├── server/
│       │   ├── handler/
│       │   │   ├── container-get-restriction.md
│       │   │   ├── single-usecase-call.md
│       │   │   └── no-repository-import.md
│       │   ├── use-case/
│       │   │   └── transaction-protection.md
│       │   └── domain-model/
│       │       └── readonly-properties.md
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

## 分類の定義（正確版）

### 縦のガードレール（機能の検証体系）

**特定の機能**（TODO登録、プロジェクト作成、ユーザー削除など）が4層で意図通りに動くか：

1. **契約（API境界）**: 特定機能のAPIエンドポイント定義
2. **ビジネスロジック（ドメイン）**: 特定機能のビジネスルール実装
3. **UIロジック（IT）**: 特定機能のUI条件分岐
4. **UX（E2E）**: 特定機能の流れが自然につながっているか

**判断基準**: 「特定の機能名が入るか？」

- ✅ 「TODOを登録する機能が...」→ 縦
- ✅ 「プロジェクト削除シナリオが...」→ 縦
- ✅ 「同一会員に一定期間一通まで」→ 縦（ビジネスルール）
- ❌ 「enum値がドメイン層と一致しているか」→ 横（構造的整合性）
- ❌ 「Handler層でビジネスロジックを書かないか」→ 横（責務の境界）

### 横のガードレール（非機能の憲法）

**構造的規律**（全機能に共通）:

- アーキテクチャ（依存の向き、レイヤー構造）
- 責務の境界（Handler/UseCase/Domain/Repositoryの責務）
- 構造的規律（readonly、Result型、throwを使わない）
- 命名規則、ディレクトリ構造
- バリデーション戦略（MECE原則、Always Valid）
- パターン（DI、Port、Unit of Work）

**判断基準**:

- ✅ readonlyプロパティ必須
- ✅ Handler→UseCase→Domainの依存の向き
- ✅ new Date()を使わずfetchNowを使う
- ✅ enum値がドメイン層と一致（構造的整合性）
- ✅ minLength/nullable組み合わせルール（バリデーション戦略）

---

## Contract/API ポリシー

### contract/api/10-api-overview.md

#### 横（非機能検証）
- OpenAPI仕様はシステム境界の契約であり、型レベルバリデーションの唯一の真実の情報源である
- ドメインロジックを含むバリデーションはOpenAPIで実施しない（Domain層で実施）
- ドメインルールはValue Objectに集約し、責務を明確にする
- Single Source of Truth原則: 型レベルのバリデーションルールはOpenAPI仕様にのみ記述する
- マルチファイル構造の原則: DDD集約単位でディレクトリを分割
- 子エンティティは親と同一ディレクトリに配置
- `$ref`参照はJSON Pointer (RFC 6901) に従う
- スキーマ命名規則: `{Action}{Entity}Params`, `{Entity}Response`, `{Entity}sResponse`
- PUTは使用しない（PATCH統一）
- ネストされたリソースのレスポンスには親IDを含める
- enum定義原則: 大文字スネークケース（PREPARED, UPLOADED）

#### 縦（機能検証）
- **なし**（構造的ルールのみ）

---

### contract/api/15-validation-constraints.md

#### 横（非機能検証）
- OpenAPIスキーマは空文字列を許容し、変換はフロント/サーバー双方の境界層で行う
- minLength: 1の設定基準: ドメインで必須な属性には設定、オプショナル属性には設定しない
- Register*Paramsでnullable: trueを設定しない
- Update*ParamsでのみPATCH 3値セマンティクスのためnullable: trueを設定
- フロントエンド（normalize.ts）で空文字列を除外/null変換
- サーバー（Handler層）で空文字列をundefinedに変換

**カスタムlint生成アノテーション例**:

```typescript
/**
 * @what Register*Paramsスキーマでnullable: trueが設定されていないか検査
 * @why 新規登録ではnullによる「未設定」状態は不要なため
 * @failure Register*Paramsでnullable: trueが設定されている場合に非0終了
 */

/**
 * @what minLength: 1とnullable: trueが同時に設定されていないか検査
 * @why 空文字列を拒否しながらnullを許容するのは矛盾するため
 * @failure 同一フィールドでminLength: 1とnullable: trueが両方設定されている場合に非0終了
 */
```

#### 縦（機能検証）
- **なし**（構造的ルールのみ）

---

### contract/api/20-url-design.md

#### 横（非機能検証）
- Current User パターン: 認証されたユーザー自身のリソースには`/users/me`を使用
- ネストされたリソースは階層的なURL構造で表現
- レスポンスボディに親IDを含める（WebSocket/SSE対応）
- パスパラメータは単数形 + `Id`サフィックス、camelCase
- 特殊アクションは動詞を含むパス（`/prepare`, `/download-url`）

#### 縦（機能検証）
- **なし**（構造的ルールのみ）

---

### contract/api/30-http-operations-overview.md

#### 横（非機能検証）
- すべての更新操作にPATCHを使用（PUT/PATCH使い分けなし）
- Update*Paramsはすべてオプショナル（requiredに含めない）
- PATCH 3値セマンティクス: フィールド省略・null送信・値送信を区別
- DELETE成功時は204 No Contentを返す（レスポンスボディなし）
- GETでリソース一覧が空でも200 OKを返す（404ではない）

#### 縦（機能検証）
- **なし**（構造的ルールのみ）

---

### contract/api/31-patch-semantics.md

#### 横（非機能検証）
- PATCH 3値セマンティクス: フィールド省略（変更しない）、null送信（クリアする）、値送信（値を設定）
- JSON層のnullはHandler層でundefinedに変換
- nullable: true設定の判断フレームワーク: ユーザーが一度設定した値を「未設定」に戻したいか
- 日付フィールド、外部ID、説明文にnullable: true設定
- 必須フィールド、enum型、boolean型にnullable: true不要

#### 縦（機能検証）
- **なし**（構造的ルールのみ）

---

### contract/api/40-error-responses.md

#### 横（非機能検証）
- エラーステータスコード一覧とエラー型のマッピング
- ValidationError（400）: 型レベルバリデーションエラー
- DomainError（422）: ドメインルールエラー
- NotFoundError（404）、ForbiddenError（403）、ConflictError（409）、UnexpectedError（500）
- エラーレスポンス形式: `{ name, message }`
- エンドポイント種別ごとの必須エラー定義

#### 縦（機能検証）
- **なし**（構造的ルールのみ）

---

### contract/api/50-security.md

#### 横（非機能検証）
- 認証必須エンドポイントにsecurityフィールドと401エラーレスポンスをセットで定義
- 認証不要エンドポイントはsecurityを省略

#### 縦（機能検証）
- **なし**（構造的ルールのみ）

---

### contract/api/60-file-upload-overview.md

#### 横（非機能検証）
- Two-Phase Upload パターン: APIサーバーの負荷を最小化
- ステート管理: PREPARED → UPLOADED の一方向遷移
- enum定義原則: 大文字スネークケース（PREPARED, UPLOADED）
- Pre-signed URL有効期限: 15分を推奨
- メタデータのみ送信（ファイルバイナリをAPIサーバーで扱わない）
- 親リソースID包含

#### 縦（機能検証）
- **なし**（アップロードパターンは構造的ルール）

---

## Contract/Business ポリシー

### contract/business/10-overview.md

#### 横（非機能検証）
- ビジネス契約はユビキタス言語の唯一の源泉
- 契約にない概念をコードに導入しない
- 子エンティティは親の定義ファイルに併記
- マルチファイル構造: DDD集約単位でディレクトリを分割
- 用語集との一致、定義とシナリオの一致、コードとの一致

#### 縦（機能検証）
- 用語集に存在する用語がコードで使用されているか
- 定義の属性がEntityのプロパティと対応しているか
- シナリオがUseCaseの実装と対応しているか

---

### contract/business/20-glossary.md

#### 横（非機能検証）
- 用語集は命名の唯一の源泉
- 用語は集約単位でグループ化し、親から子の順で配置
- 英語名はコードの命名と一致させる
- 定義は一意で明確でなければならない
- コンテキスト修飾の原則: 将来の拡張で曖昧になる用語はコンテキストで修飾
- 列挙値は独立した用語として定義しない（親の用語の定義に含める）

#### 縦（機能検証）
- **なし**（用語集自体は構造的ルール）

---

### contract/business/30-definition.md

#### 横（非機能検証）
- 定義はドメインモデルの唯一の源泉
- 集約境界の明示: 子エンティティは親の定義ファイルに併記
- 参照関係の管理: クロスドメインの依存関係を記録
- 定義変更時の影響分析: 同一ドメインとクロスドメインの影響を確認

#### 縦（機能検証）
- 定義の属性がEntityのプロパティと対応しているか
- 制約がValue ObjectまたはEntityに実装されているか

---

### contract/business/40-scenario.md

#### 横（非機能検証）
- シナリオはユースケースの唯一の源泉
- 1シナリオ = 1ユースケース
- 汎用的なユースケースを作らない（意図ごとに分離）
- 子エンティティの操作は親のディレクトリに配置
- 対称性のある操作は両方定義する（追加 ↔ 削除、昇格 ↔ 降格）
- CRUDの検討: 必要性を検討した上で除外
- 状態遷移の網羅

#### 縦（機能検証）
- シナリオとUseCaseが1対1で対応しているか
- 「TODOを登録する」シナリオがRegisterTodoUseCaseに対応しているか
- 「プロジェクトを削除する」シナリオがDeleteProjectUseCaseに対応しているか

---

## E2E/Playwright ポリシー

### e2e/playwright/10-playwright-overview.md

#### 横（非機能検証）
- E2Eテストは他のテスト層でカバーできない領域を検証
- テストピラミッドのMECE原則
- ローカルモック困難なサービスをE2Eで検証
- ディレクトリ構造: ルート別配置
- 命名規則: `{action}-{target}.spec.ts`

#### 縦（機能検証）
- **なし**（テスト戦略は構造的ルール）

---

### e2e/playwright/20-page-object-pattern.md

#### 横（非機能検証）
- Page Objectでページ構造とテストロジックを分離
- セレクタ戦略: getByRole > getByLabel > getByTestId
- filter()で要素絞り込み
- XPath/CSSセレクタ禁止

#### 縦（機能検証）
- **なし**（セレクタ戦略は構造的ルール）

---

### e2e/playwright/30-test-patterns.md

#### 横（非機能検証）
- ナビゲーションはUI経由で行う（page.goto()は起点のみ許可）
- 検証の完結原則: 操作の結果がユーザーに見える形で反映されているかまで確認
- テストの独立性原則: 各テストは自分でテストデータを作成
- テストデータのクリーンアップ: afterEach/afterAllでAPI直接呼び出しで削除
- 堅牢なテストコードの原則: セマンティックなセレクタ、明示的な待機、Page Object経由の操作

#### 縦（機能検証）
- 「TODOを登録する」機能のE2Eテストで、UI経由でナビゲーションが実装されているか
- 「プロジェクトを削除する」機能のE2Eテストで、検証が完結しているか

---

### e2e/playwright/40-authentication.md

#### 横（非機能検証）
- 認証状態はテスト実行前にセットアップし再利用
- セットアップで認証状態を保存（storageState）
- 認証情報の一元管理（fixtures/auth.ts）

#### 縦（機能検証）
- **なし**（認証セットアップは構造的ルール）

---

### e2e/playwright/50-test-repair.md

#### 横（非機能検証）
- E2Eテスト失敗時はあるべき修正を行う（応急処置ではなく根本解決）
- 修正対象の判断基準: テストコードの問題 → アプリのバグ → UX設計の問題 → 環境・データの問題
- strict mode violation: 同一ラベルの要素が複数存在する場合はUX問題を検出
- 回避策を選ぶべきケース: リスト内の同名要素、モーダル内の要素、動的に生成される要素

#### 縦（機能検証）
- **なし**（テスト修復戦略は構造的ルール）

---

## Infra/Terraform ポリシー

### infra/terraform/10-terraform-overview.md

#### 横（非機能検証）
- 再現可能なインフラを宣言し、環境のライフサイクルを完全に制御
- 宣言的定義: あるべき状態をコードで宣言
- 環境完全分離: 独立したエントリーポイント・tfstate
- 構造の統一: 全環境で同一のモジュール構成
- 並行デプロイ対応: ブランチ環境でリソース分離
- apply/destroyが常に成功する状態を維持
- planで差分が出ない状態を維持

#### 縦（機能検証）
- **なし**（インフラ構造は構造的ルール）

---

### infra/terraform/20-environment.md

#### 横（非機能検証）
- 環境は独立したエントリーポイントで完全分離
- 構造の統一: 全環境で同一のモジュール構成
- パラメータで差異表現
- ブランチ環境: branch_suffixでリソース分離

#### 縦（機能検証）
- **なし**（環境分離は構造的ルール）

---

### infra/terraform/30-module.md

#### 横（非機能検証）
- モジュールは再利用可能な単位
- パラメータで環境差異を吸収
- 安全なデフォルト: 保護系はtrueをデフォルト
- description必須: 全変数・出力に説明を付与

#### 縦（機能検証）
- **なし**（モジュール設計は構造的ルール）

---

### infra/terraform/40-protection.md

#### 横（非機能検証）
- ステートフルリソースはTrivyカスタムポリシーで保護を強制
- 環境別trivyignore: 開発環境のみ保護を緩和
- CODEOWNERSレビュー: trivyignore変更は人間のレビュー必須

#### 縦（機能検証）
- **なし**（保護戦略は構造的ルール）

---

### infra/terraform/50-validation.md

#### 横（非機能検証）
- インフラコードはデプロイ前に静的検証
- フォーマット統一（terraform fmt）、静的解析（TFLint）、セキュリティスキャン（Trivy）
- 環境エントリーポイントから検証

#### 縦（機能検証）
- **なし**（検証戦略は構造的ルール）

---

## Server/Auth-Client ポリシー

### server/auth-client/10-auth-client-overview.md

#### 横（非機能検証）
- AuthClientは認証サービスへの抽象インターフェース
- 技術非依存: Cognito、Firebase Authなどの具体的な技術に依存しない
- Result型でエラーハンドリング

#### 縦（機能検証）
- **なし**（抽象化は構造的ルール）

---

## Server/DI-Container ポリシー

### server/di-container/10-di-container-overview.md

#### 横（非機能検証）
- DIコンテナはComposition Rootとして機能
- インターフェース（型）に依存し実装クラスをインスタンス化する唯一の場所
- カスタムESLintルール: `di-container/interface-impl-import-pattern`
- 型とImplを分離してimport
- 型は`import type`で書く
- 型を`new`しない
- `bind<A>`と`new BImpl`の一致
- サービスID命名規則: `{VARIABLE_NAME}`, `{ENTITY}_REPOSITORY`, `{ACTION}_{ENTITY}_USE_CASE`
- スコープ: Repository、UseCase、Logger、環境変数はSingleton

**カスタムlint生成アノテーション例**:

```typescript
/**
 * @what DIコンテナで型のimportに`import type`が使用されているか検査
 * @why ランタイムコードに型定義が混入するとバンドルサイズが肥大化するため
 * @failure container.ts内で型のimportに`import type`が使われていない場合に非0終了
 */

import { ESLintUtils } from '@typescript-eslint/utils';

export default ESLintUtils.RuleCreator.withoutDocs({
  meta: {
    type: 'problem',
    messages: {
      missingImportType: 'インターフェース型 "{{typeName}}" のimportにimport typeを使用してください',
    },
    schema: [],
  },
  defaultOptions: [],

  create(context) {
    return {
      ImportDeclaration(node) {
        const filename = context.getFilename();
        if (!filename.endsWith('container.ts')) return;

        // import type でない通常のimportをチェック
        if (node.importKind !== 'type' && node.specifiers.length > 0) {
          node.specifiers.forEach((specifier) => {
            if (specifier.type === 'ImportSpecifier' &&
                specifier.imported.type === 'Identifier' &&
                !specifier.imported.name.endsWith('Impl')) {
              context.report({
                node: specifier,
                messageId: 'missingImportType',
                data: { typeName: specifier.imported.name },
              });
            }
          });
        }
      },
    };
  },
});

/**
 * @what DIコンテナでインターフェース型を`new`していないか検査
 * @why インターフェース型は実体がないため、Impl実装クラスのみをインスタンス化すべきため
 * @failure container.ts内でインターフェース型名（Impl接尾辞なし）をnewしている場合に非0終了
 */

/**
 * @what bind<A>とnew BImplの型が一致しているか検査
 * @why 型不一致は実装とインターフェースの不整合を示すため
 * @failure bind<T>().toConstantValue(new XImpl())のTとXが不一致の場合に非0終了
 */
```

#### 縦（機能検証）
- **なし**（DI構造は構造的ルール）

---

## Server/Domain-Model ポリシー

### server/domain-model/10-domain-model-overview.md

#### 横（非機能検証）
- ドメインモデルは常に正しい状態（Always Valid）で外部依存ゼロ
- Entity: 識別子（ID）を持つ、readonlyプロパティ、更新メソッドは新インスタンス返却
- Value Object: 識別子なし、完全に不変、equals()・toString()必須
- Always Valid Domain Model: 常に正しい状態を維持
- 外部依存ゼロ: TypeScript標準ライブラリ、同じドメイン層内のEntity/VO、Result型のみ許可
- 不変性（Immutability）: すべてのプロパティはreadonly
- Result型による明示的エラーハンドリング
- 技術的詳細の漏洩防止
- ディレクトリ構成: フラットなディレクトリ構造 + 適切な境界
- ファイル命名規則: ドット表記（`.entity.ts`, `.vo.ts`, `.repository.ts`）

**カスタムlint生成アノテーション例**:

```typescript
/**
 * @what Entityのプロパティがreadonlyで宣言されているか検査
 * @why mutableなプロパティは不変性を破壊し、予期しない副作用を生むため
 * @failure readonly修飾子がないEntityプロパティを検出した場合に非0終了
 */

/**
 * @what Domain層で外部依存（DB、API、ライブラリ等）をimportしていないか検査
 * @why 外部依存があるとテストが困難になり、ドメインロジックの純粋性が損なわれるため
 * @failure domain/配下でTypeScript標準ライブラリ以外のimportを検出した場合に非0終了
 */

/**
 * @what Domain層でthrowを使用していないか検査
 * @why 例外は制御フローを不明瞭にし、Result型による明示的なエラーハンドリングを推奨するため
 * @failure domain/配下でthrow文を検出した場合に非0終了
 */
```

#### 縦（機能検証）
- Entityが用語集の英語名と一致しているか
- 属性が定義の属性と対応しているか
- 制約がValue ObjectまたはEntityに実装されているか

---

### server/domain-model/11-domain-validation-strategy.md

#### 横（非機能検証）
- バリデーションをMECE（相互排他的かつ網羅的）に各層で実施
- 第1階層: 型レベルバリデーション（Handler層、OpenAPI/Zod、ValidationError 400）
- 第2階層: ドメインルール（Domain層、OpenAPIで表現不可能な複雑な制約、DomainError 422）
- 第3階層: ビジネスルール（UseCase層、DB参照を伴う検証、NotFoundError 404等）
- Always Valid Domain Model原則
- 不変条件チェックの配置基準: 単一VO内で完結 → Value Object、複数の値の関係性 → Entity、外部依存 → UseCase
- Value Object化の判断基準: Tier 1（不変条件あり）必須、Tier 2（ドメインルールあり）推奨、Tier 3（型レベル制約のみ）不要
- 必ず成功するValue Objectは作らない

#### 縦（機能検証）
- **なし**（バリデーション戦略は構造的ルール）

---

### server/domain-model/20-entity-overview.md

#### 横（非機能検証）
- Entityは識別子（ID）を持つ不変ドメインオブジェクト
- すべてのEntityは`id: string`プロパティを持つ
- 複合キーは禁止
- Value Objectを保持
- メソッド設計パターン: チェック不要なメソッドはEntityを直接返す、チェックありはResult型
- Value Object化の判断基準（Tier 1/2/3）
- Dummyファクトリ: すべてのEntityに対応するDummyファクトリを実装

#### 縦（機能検証）
- **なし**（Entity設計は構造的ルール）

---

### server/domain-model/21-entity-field-classification.md

#### 横（非機能検証）
- Entityフィールドは必須性とundefinedの意味で3段階に分類（Tier 1/2/3）
- コンストラクタでは全フィールドを必須化（analyzability原則）
- Tier 2: undefinedがビジネス上の意味を持つフィールド、JSDocでundefinedの意味を必ず記載
- Tier 3: オプショナル、undefinedは単に未設定を意味
- PATCH更新との対応: `in`演算子でフィールド存在を判定（`??`演算子は使用しない）

#### 縦（機能検証）
- **なし**（フィールド分類は構造的ルール）

---

### server/domain-model/22-entity-implementation.md

#### 横（非機能検証）
- Entityはclassで定義、すべてのプロパティをreadonly
- Props型パターン: コンストラクタ引数は`<Entity>Props`型エイリアス
- privateコンストラクタとファクトリメソッド（from()）
- バリデーションの責務分担: from()はデータ整合性、個別メソッドは操作の前提条件
- 戻り値の型は失敗可能性を正確に表現（チェック不要ならEntityを直接返す）
- コンストラクタではバリデーションしない（MECE原則）
- メソッド命名はドメインの言葉を使う（approve、reject、complete、cancel、assign、clarify、reschedule）
- 日時はISO 8601文字列
- JSDocコメント必須
- 未使用のドメインメソッド追加禁止（YAGNI原則）

#### 縦（機能検証）
- **なし**（実装パターンは構造的ルール）

---

### server/domain-model/25-value-object-overview.md

#### 横（非機能検証）
- Value Objectは識別子を持たず値で等価性を判断する不変オブジェクト
- ドメインルールまたは不変条件を内包
- Result型によるファクトリ（from()）
- 必ず成功するバリデーションならValue Object化不要
- Value Object化の判断基準（Tier 1/2/3）
- 最低限の実装の原則: 「将来必要になるかも」で先行実装しない
- 必須メソッド: ES2022プライベートフィールド、プライベートコンストラクタ、from()、equals()、toString()

#### 縦（機能検証）
- **なし**（VO設計は構造的ルール）

---

### server/domain-model/26-value-object-implementation.md

#### 横（非機能検証）
- ファイル命名規則: `.vo.ts`で終わる
- Props型エイリアスパターン
- ES2022プライベートフィールド（#）とプライベートコンストラクタ
- getterで値を公開
- equals()とtoString()
- 不変条件チェックメソッド（インスタンスメソッド）
- JSDocコメント必須
- パブリックコンストラクタ禁止
- アンダースコアプレフィックス（_value）禁止
- パラメータプロパティ禁止
- throwを使用禁止

**カスタムlint生成アノテーション例**:

```typescript
/**
 * @what Value Objectクラスでコンストラクタがprivateで宣言されているか検査
 * @why パブリックコンストラクタはバリデーションを迂回するリスクがあるため
 * @failure .vo.tsファイル内でpublic constructorまたはコンストラクタのprivate修飾子なしを検出した場合に非0終了
 */

/**
 * @what Value Objectクラスでequals()とtoString()メソッドが実装されているか検査
 * @why 値の等価性比較と文字列表現は必須メソッドのため
 * @failure .vo.tsファイル内でequals()またはtoString()が欠けている場合に非0終了
 */

/**
 * @what Value Objectでアンダースコアプレフィックス（_value）が使用されていないか検査
 * @why ES2022プライベートフィールド（#value）の使用を推奨するため
 * @failure .vo.tsファイル内で_valueパターンを検出した場合に非0終了
 */
```

#### 縦（機能検証）
- **なし**（VO実装パターンは構造的ルール）

---

### server/domain-model/30-repository-interface-overview.md

#### 横（非機能検証）
- リポジトリインターフェースは型エイリアスで定義（classではない）
- Result型を使用
- Propsパターン: メソッド引数はオブジェクト形式
- ID生成メソッド: リポジトリがエンティティIDの生成を担当
- 検索メソッドの戻り値: 単一エンティティ検索は`Result<Entity | undefined, Error>`、複数は`Result<Entity[], Error>`
- JSDocコメント必須
- 具体的な実装詳細の露出禁止
- 例外のthrow禁止
- 集約との関連: 子エンティティ専用のリポジトリは作らない

#### 縦（機能検証）
- **なし**（リポジトリIF設計は構造的ルール）

---

### server/domain-model/40-aggregate-overview.md

#### 横（非機能検証）
- 集約は整合性境界
- 1集約 = 1リポジトリ = 1ディレクトリ
- 子エンティティに親IDを含めない（親子関係は永続化層で管理）
- 集約ルートで子エンティティを保持（ビジネス契約の集約セクションで定義）
- 子エンティティ専用のリポジトリ禁止、子エンティティ専用のCRUDメソッド禁止
- ESLintで検出: `local-rules/domain-model/single-repository-per-aggregate`
- 集約のサイズ制限: IDの参照関係は1階層まで
- 別の集約への参照はID参照

#### 縦（機能検証）
- **なし**（集約設計は構造的ルール）

---

### server/domain-model/50-test-overview.md

#### 横（非機能検証）
- ドメインモデルは外部依存ゼロのためSmall Testのみで完全に検証
- 全テストでDummyファクトリを使用
- MECE原則との整合性: ドメイン層テストは第2階層（ドメインルール）のテスト
- 型レベルバリデーションはHandler層でテスト済み

#### 縦（機能検証）
- **なし**（テスト戦略は構造的ルール）

---

### server/domain-model/51-value-object-test-patterns.md

#### 横（非機能検証）
- Value Objectテストは静的ファクトリメソッドまたはfrom()で特定値を生成
- Dummyファクトリ不要（Entity Dummyファクトリ内では使用）
- テスト対象メソッド: from()（必須）、equals()（必須）、toString()（必須）、canTransitionTo()（条件付き）
- Result型を正しくチェック
- エラー型とメッセージを検証

#### 縦（機能検証）
- **なし**（VOテストパターンは構造的ルール）

---

### server/domain-model/52-entity-test-patterns.md

#### 横（非機能検証）
- すべてのテストコードでDummyファクトリを使用（new Entity()を直接使わない）
- テスト対象: from()異常系（直接呼び出し）、専用更新メソッド（Dummyファクトリ使用）
- from()正常系のテスト不要（Dummyファクトリが内部でfrom()を呼ぶため）
- Entity Dummyファクトリ実装パターン: 必須フィールドは`??`、オプショナルフィールドは`"key" in props`
- 共通Dummyヘルパー: `server/src/util/testing-util/dummy-data.ts`
- Value Object用のヘルパーは作らず、Value Object Dummyファクトリを使用

#### 縦（機能検証）
- **なし**（Entityテストパターンは構造的ルール）

---

## Server/FetchNow ポリシー

### server/fetch-now/10-fetch-now-overview.md

#### 横（非機能検証）
- FetchNowは現在時刻を取得する関数型インターフェース
- テスト可能性と時刻制御を実現
- 依存性注入でUseCaseやドメインサービスに注入
- テスト用のDummy実装: buildFetchNowDummy
- 固定日時のデフォルト値: 2024-01-01T00:00:00+09:00

#### 縦（機能検証）
- **なし**（時刻抽象化は構造的ルール）

---

## Server/Handler ポリシー

### server/handler/10-handler-overview.md

#### 横（非機能検証）
- Handler層は外部イベントとアプリケーション層の間の薄いアダプター
- 入力の取得と変換、入力バリデーション（Zod）、ユースケース呼び出し、エラーハンドリング、レスポンス変換、出力バリデーション、出力の返却
- ビジネスロジック、ドメインルール、データベースアクセス、複雑な計算、状態管理は実施しない
- バリデーション戦略（MECE原則）: Handler層は型レベルのバリデーションのみ

**カスタムlint生成アノテーション例**:

```typescript
/**
 * @what Handler層でビジネスロジック（if/switch/ループ等の制御構造）を実装していないか検査
 * @why Handler層は薄いアダプターであり、ビジネスロジックはUseCaseに委譲すべきため
 * @failure handler/配下でif/switch/for/while文を検出した場合に非0終了
 */

/**
 * @what Handlerがcontainer.getでLoggerとUseCaseのみを取得しているか検査
 * @why Handler層がRepositoryやPortを直接取得すると責務境界が曖昧になるため
 * @failure Handler内でcontainer.get()がLogger/UseCase以外を取得している場合に非0終了
 */

/**
 * @what Handlerが単一のUseCaseのみを呼び出しているか検査
 * @why 複数UseCaseの呼び出しは新しいUseCaseにまとめるべきため
 * @failure Handler内で2つ以上のUseCase呼び出しを検出した場合に非0終了
 */
```

#### 縦（機能検証）
- **なし**（Handler責務は構造的ルール）

---

### server/handler/20-http-handler-overview.md

#### 横（非機能検証）
- HTTPハンドラーはHonoフレームワークを使用した薄いHTTPアダプター
- 単一のUseCaseのみを呼び出す
- container.getの制約: LoggerとUseCaseのみ取得可能
- ディレクトリ構成: エンティティごとのディレクトリ
- 命名規則: `build{Action}{Entity}Handler`
- HTTPステータスコード: POST 201、GET 200、PATCH 200、DELETE 204

#### 縦（機能検証）
- **なし**（HTTPハンドラー構造は構造的ルール）

---

### server/handler/21-http-handler-implementation.md

#### 横（非機能検証）
- 薄いアダプター実装パターン
- 入力取得・バリデーション・UseCase呼び出し・レスポンス変換の4ステップ
- 空文字列のundefined変換
- PATCH 3値判別パターン（`in`演算子使用）
- エラーハンドリングとHTTPステータスコードマッピング
- レスポンス変換（EntityからResponseへ）
- 出力バリデーション（Zodスキーマ）

#### 縦（機能検証）
- **なし**（実装パターンは構造的ルール）

---

### server/handler/22-http-validation-error.md

#### 横（非機能検証）
- Zodスキーマバリデーション
- ValidationErrorの統一形式
- エラーハンドリング戦略
- 型レベルバリデーションとドメインルールの分離

#### 縦（機能検証）
- **なし**（バリデーションエラー処理は構造的ルール）

---

### server/handler/23-http-router-patterns.md

#### 横（非機能検証）
- Honoルーター構築パターン
- エンドポイント登録
- 認証ミドルウェア
- CORS設定
- エラーハンドリングミドルウェア

#### 縦（機能検証）
- **なし**（ルーター構成は構造的ルール）

---

## Server/Logger ポリシー

### server/logger/10-logger-overview.md

#### 横（非機能検証）
- Loggerは抽象インターフェース
- 技術非依存（CloudWatch Logs等の具体的な技術に依存しない）
- ログレベル: error, warn, info, debug
- 構造化ログ形式

#### 縦（機能検証）
- **なし**（Logger抽象化は構造的ルール）

---

### server/logger/11-log-level-strategy.md

#### 横（非機能検証）
- ログレベル戦略: error（システム異常）、warn（要注意）、info（ビジネスイベント）、debug（開発時詳細）
- ログ出力基準
- 構造化ログのフィールド定義

#### 縦（機能検証）
- **なし**（ログレベル戦略は構造的ルール）

---

## Server/Port ポリシー

### server/port/10-port-overview.md

#### 横（非機能検証）
- Portは外部サービスへの抽象インターフェース
- 技術非依存: 具体的な実装（AWS SDK、外部API等）に依存しない
- Result型でエラーハンドリング
- ポート種別: Logger、FetchNow、StorageClient、AuthClient

#### 縦（機能検証）
- **なし**（Port抽象化は構造的ルール）

---

## Server/Repository ポリシー

### server/repository/10-repository-overview.md

#### 横（非機能検証）
- リポジトリは永続化層の実装
- ドメインモデルとDB形式の相互変換
- Result型でエラーハンドリング
- トランザクション管理はUnit of Workに委譲

#### 縦（機能検証）
- **なし**（Repository実装は構造的ルール）

---

### server/repository/20-aggregate-persistence.md

#### 横（非機能検証）
- 集約単位での永続化
- 親エンティティと子エンティティの同時保存
- 集約境界の維持
- 子エンティティ専用のCRUDメソッド禁止

#### 縦（機能検証）
- **なし**（集約永続化は構造的ルール）

---

### server/repository/30-dynamodb-patterns.md

#### 横（非機能検証）
- DynamoDBアクセスパターン
- Single Table Design
- GSI設計
- トランザクション
- バッチ操作

#### 縦（機能検証）
- **なし**（DynamoDBパターンは構造的ルール）

---

### server/repository/40-test-patterns.md

#### 横（非機能検証）
- Repositoryテスト戦略
- Medium Test（DynamoDB Local使用）
- テストデータ準備とクリーンアップ
- トランザクションテスト

#### 縦（機能検証）
- **なし**（Repositoryテストは構造的ルール）

---

## Server/Storage-Client ポリシー

### server/storage-client/10-storage-client-overview.md

#### 横（非機能検証）
- StorageClientは抽象インターフェース
- 技術非依存: S3等の具体的な技術に依存しない
- Pre-signed URL生成
- Result型でエラーハンドリング

#### 縦（機能検証）
- **なし**（StorageClient抽象化は構造的ルール）

---

## Server/Unit-of-Work ポリシー

### server/unit-of-work/10-unit-of-work-overview.md

#### 横（非機能検証）
- Unit of Workはトランザクション境界管理
- 複数リポジトリ操作をアトミックに実行
- Result型でエラーハンドリング
- トランザクション失敗時は全操作をロールバック

**カスタムlint生成アノテーション例**:

```typescript
/**
 * @what 複数の書き込みを行うUseCaseがトランザクションで保護されているか検査
 * @why 複数書き込みを非トランザクションで行うと部分的コミットが発生するため
 * @failure 書き込み>=2 かつunitOfWork.executeの呼び出しがないメソッドを検出した場合に非0終了
 */

/**
 * @what UseCaseでトランザクション外でリポジトリの書き込みメソッドを直接呼び出していないか検査
 * @why トランザクション保護がない書き込みは一貫性を損なうため
 * @failure unitOfWork.execute()外でrepository.save/update/deleteを検出した場合に非0終了
 */
```

#### 縦（機能検証）
- **なし**（UoW戦略は構造的ルール）

---

### server/unit-of-work/20-dynamodb-implementation.md

#### 横（非機能検証）
- DynamoDB TransactWriteItems使用
- 最大25操作まで
- トランザクション制約
- エラーハンドリング

#### 縦（機能検証）
- **なし**（DynamoDB UoW実装は構造的ルール）

---

### server/unit-of-work/30-usage-patterns.md

#### 横（非機能検証）
- UseCase層でのUoW使用パターン
- トランザクション境界の設定
- 複数リポジトリ操作の調整
- エラー時のロールバック

#### 縦（機能検証）
- **なし**（UoW使用パターンは構造的ルール）

---

## Server/Use-Case ポリシー

### server/use-case/10-use-case-overview.md

#### 横（非機能検証）
- 1シナリオ = 1ユースケース
- Result型で成功/失敗を明示的に表現
- executeメソッドで書き切る（プライベートメソッド禁止）
- バリデーション階層: UseCase層は第3階層（ビジネスルール）を担当
- NotFoundError、ForbiddenError、ConflictErrorを返す
- 命名規則: `{action}-{entity}-use-case.ts`

**カスタムlint生成アノテーション例**:

```typescript
/**
 * @what UseCaseクラスがexecuteメソッドのみを持ち、プライベートメソッドを持たないか検査
 * @why プライベートメソッドはテストが困難で、責務の分離を妨げるため
 * @failure use-case.ts内でexecute以外のメソッドを検出した場合に非0終了
 */

/**
 * @what UseCaseのexecuteメソッドがResult型を返すか検査
 * @why 明示的なエラーハンドリングを強制し、throwを使わない設計を保証するため
 * @failure executeメソッドの戻り値の型がResult<T, E>でない場合に非0終了
 */

/**
 * @what UseCaseのPropsがreadonlyプロパティのみを持つか検査
 * @why Props内でのmutationを防ぎ、予期しない副作用を排除するため
 * @failure Props型内にreadonly修飾子がないプロパティを検出した場合に非0終了
 */
```

#### 縦（機能検証）
- シナリオとUseCaseが1対1で対応しているか

---

### server/use-case/11-use-case-implementation.md

#### 横（非機能検証）
- 実装テンプレート: Props型、execute、Result型
- PATCH更新パターン（`in`演算子使用）
- トランザクション管理（Unit of Work）
- 時刻取得（FetchNow）
- DI（コンストラクタ注入）

#### 縦（機能検証）
- **なし**（実装パターンは構造的ルール）

---

### server/use-case/12-entity-operation-patterns.md

#### 横（非機能検証）
- Entity操作パターン
- 判断フロー: チェック不要 → Entity直接返す、チェックあり → Result型
- メソッド選択基準
- VOエラー伝播

#### 縦（機能検証）
- **なし**（Entity操作パターンは構造的ルール）

---

### server/use-case/20-refactoring-overview.md

#### 横（非機能検証）
- リファクタリング契機: 貧血症、重複、N+1、ドメインサービス、VO追加
- ドメインサービス導出パターン
- リポジトリ最適化

#### 縦（機能検証）
- **なし**（リファクタリング戦略は構造的ルール）

---

### server/use-case/30-testing-overview.md

#### 横（非機能検証）
- テスト戦略: Small/Medium Test
- Dummyファクトリ使用
- カバレッジ基準
- CI/CD統合

#### 縦（機能検証）
- **なし**（テスト戦略は構造的ルール）

---

## Web/API ポリシー

### web/api/10-api-overview.md

#### 横（非機能検証）
- API通信インフラ
- リクエスト正規化
- 型安全なクライアント
- エラーハンドリング

#### 縦（機能検証）
- **なし**（API通信は構造的ルール）

---

### web/api/20-request-normalization.md

#### 横（非機能検証）
- リクエスト正規化戦略
- POST: オプショナルフィールドの空文字列を除外
- PATCH: 空文字列をnullに変換（クリア操作）
- dirtyFieldsでフィルタリング

#### 縦（機能検証）
- **なし**（正規化は構造的ルール）

---

## Web/Component ポリシー

### web/component/10-component-overview.md

#### 横（非機能検証）
- Component設計原則
- RouteまたはFeatureコンポーネント
- 実装パターン
- テストパターン

#### 縦（機能検証）
- **なし**（Component設計は構造的ルール）

---

### web/component/20-selector-strategy.md

#### 横（非機能検証）
- セレクタ戦略: TanStack Query
- データ取得パターン
- キャッシュ戦略
- 再検証ロジック

**カスタムlint生成アノテーション例**:

```typescript
/**
 * @what ComponentでuseQueryを直接呼び出さず、カスタムフックを経由しているか検査
 * @why カスタムフックを経由することでキャッシュキーとクエリロジックを一元管理できるため
 * @failure Component内でuseQueryを直接呼び出している場合に非0終了
 */

/**
 * @what カスタムフックの命名がuse{Action}{Entity}パターンに従っているか検査
 * @why 命名規則の統一でコードの可読性と保守性が向上するため
 * @failure hooks/配下でuse{Action}{Entity}パターンに従わないファイルを検出した場合に非0終了
 */
```

#### 縦（機能検証）
- **なし**（セレクタ戦略は構造的ルール）

---

### web/component/30-form-overview.md

#### 横（非機能検証）
- フォーム設計: React Hook Form
- バリデーション統合（Zod）
- dirtyFields追跡
- エラーハンドリング

#### 縦（機能検証）
- **なし**（フォーム設計は構造的ルール）

---

### web/component/31-conditional-validation.md

#### 横（非機能検証）
- 条件付きバリデーション
- 動的バリデーションルール
- フィールド依存関係
- UI条件分岐

#### 縦（機能検証）
- **なし**（条件付きバリデーションは構造的ルール）

---

### web/component/40-test-patterns.md

#### 横（非機能検証）
- Componentテストパターン
- Playwright Component Test
- MSWモック
- ユーザーイベントシミュレーション

#### 縦（機能検証）
- **なし**（Componentテストは構造的ルール）

---

## Web/Design ポリシー

### web/design/10-design-overview.md

#### 横（非機能検証）
- 4つの設計原則: Alignment（整列）、Proximity（近接）、Contrast（コントラスト）、Repetition（反復）
- デザイントークン管理
- 視覚的階層

#### 縦（機能検証）
- **なし**（デザイン原則は構造的ルール）

---

### web/design/20-token-management.md

#### 横（非機能検証）
- デザイントークン管理: Tailwind CSS
- カラー、タイポグラフィ、スペーシング、シャドウ
- テーマ切り替え

#### 縦（機能検証）
- **なし**（トークン管理は構造的ルール）

---

### web/design/30-aesthetic-direction.md

#### 横（非機能検証）
- 美的方向性: ミニマリズム
- 余白の活用
- カラーパレット制約
- タイポグラフィ階層

#### 縦（機能検証）
- **なし**（美的方向性は構造的ルール）

---

### web/design/40-interaction-efficiency.md

#### 横（非機能検証）
- インタラクション効率: 操作距離の最小化
- フィードバック即応性
- 予測可能性
- エラー防止

#### 縦（機能検証）
- **なし**（インタラクション効率は構造的ルール）

---

## Web/Feature ポリシー

### web/feature/10-feature-overview.md

#### 横（非機能検証）
- Feature設計: 3つ以上のRouteで共有される横断的機能
- Provider/Context パターン
- Public API エクスポート

#### 縦（機能検証）
- **なし**（Feature設計は構造的ルール）

---

### web/feature/20-provider-context-pattern.md

#### 横（非機能検証）
- Provider/Context実装パターン
- カスタムフック提供
- 状態管理
- 依存性注入

#### 縦（機能検証）
- **なし**（Provider/Contextは構造的ルール）

---

## Web/Hooks ポリシー

### web/hooks/10-hooks-overview.md

#### 横（非機能検証）
- カスタムフック設計
- TanStack Query統合
- 命名規則: `use{Action}{Entity}`

#### 縦（機能検証）
- **なし**（Hooks設計は構造的ルール）

---

### web/hooks/20-query-patterns.md

#### 横（非機能検証）
- Query パターン: useQuery
- データ取得
- キャッシュ戦略
- 再検証

#### 縦（機能検証）
- **なし**（Queryパターンは構造的ルール）

---

### web/hooks/30-state-patterns.md

#### 横（非機能検証）
- State パターン: useState、useReducer
- ローカル状態管理
- フォーム状態
- UI状態

#### 縦（機能検証）
- **なし**（Stateパターンは構造的ルール）

---

## Web/Lib ポリシー

### web/lib/10-lib-overview.md

#### 横（非機能検証）
- Lib層: 汎用的なフック、純粋関数
- APIクライアント基盤
- Context/Provider
- 技術的基盤

#### 縦（機能検証）
- **なし**（Lib層は構造的ルール）

---

## Web/Logger ポリシー

### web/logger/10-logger-overview.md

#### 横（非機能検証）
- フロントエンドLogger抽象インターフェース
- 技術非依存
- ログレベル: error, warn, info, debug

#### 縦（機能検証）
- **なし**（Logger抽象化は構造的ルール）

---

### web/logger/11-log-level-strategy.md

#### 横（非機能検証）
- ログレベル戦略
- フロントエンド固有のログ出力基準
- エラーバウンダリ統合

#### 縦（機能検証）
- **なし**（ログレベル戦略は構造的ルール）

---

## Web/Mock ポリシー

### web/mock/10-mock-overview.md

#### 横（非機能検証）
- Mock設計: MSW（Mock Service Worker）
- テストデータ
- ハンドラー命名規則

#### 縦（機能検証）
- **なし**（Mock設計は構造的ルール）

---

### web/mock/20-msw-patterns.md

#### 横（非機能検証）
- MSWハンドラー実装パターン
- エラーシミュレーション
- 遅延シミュレーション
- 状態管理

#### 縦（機能検証）
- **なし**（MSWパターンは構造的ルール）

---

## Web/Route ポリシー

### web/route/10-route-overview.md

#### 横（非機能検証）
- Route設計: ルートは機能境界
- ディレクトリ構造
- ファイル配置基準

#### 縦（機能検証）
- **なし**（Route設計は構造的ルール）

---

### web/route/15-role-design.md

#### 横（非機能検証）
- Role設計: Page、Layout、Loader
- 責務分担
- データフェッチング

#### 縦（機能検証）
- **なし**（Role設計は構造的ルール）

---

### web/route/20-colocation-patterns.md

#### 横（非機能検証）
- Colocation原則: 関連ファイルを近くに配置
- Route配下の構成
- 共有配置基準

#### 縦（機能検証）
- **なし**（Colocationは構造的ルール）

---

### web/route/30-shared-placement.md

#### 横（非機能検証）
- 共有コード配置基準
- Feature vs Lib vs Route
- 3ルート基準（3つ以上のRouteで共有 → Feature）

#### 縦（機能検証）
- **なし**（共有配置は構造的ルール）

---

### web/route/40-test-patterns.md

#### 横（非機能検証）
- Routeテストパターン
- Playwright Component Test
- MSW統合
- ルーティングテスト

#### 縦（機能検証）
- **なし**（Routeテストは構造的ルール）

---

## Web/UI ポリシー

### web/ui/10-ui-overview.md

#### 横（非機能検証）
- UI Primitive設計: Leaf/Composite分類
- CVA（Class Variance Authority）によるバリアント管理
- デザイントークン統合

#### 縦（機能検証）
- **なし**（UI設計は構造的ルール）

---

### web/ui/20-leaf.md

#### 横（非機能検証）
- Leaf UI Primitive: Button、Input、Icon等
- プロパティ設計
- アクセシビリティ

#### 縦（機能検証）
- **なし**（Leaf設計は構造的ルール）

---

### web/ui/30-composite.md

#### 横（非機能検証）
- Composite UI Primitive: Card、Dialog、Dropdown等
- 構成パターン
- Compound Component

#### 縦（機能検証）
- **なし**（Composite設計は構造的ルール）

---

### web/ui/40-variant-system.md

#### 横（非機能検証）
- Variant System: CVA
- バリアント定義
- デフォルトバリアント
- 複合バリアント

#### 縦（機能検証）
- **なし**（Variant Systemは構造的ルール）

---

### web/ui/50-test-pattern.md

#### 横（非機能検証）
- UI Primitiveテストパターン
- Playwright Component Test
- バリアントテスト
- アクセシビリティテスト

#### 縦（機能検証）
- **なし**（UIテストは構造的ルール）

---

## サマリー

### 縦のルール総数: 約10件（全体の約2%）

縦のルールは非常に限定的です。以下の項目のみが縦に該当します：

1. **Contract/Business**: 用語集・定義・シナリオとコードの対応関係検証
2. **Use-Case**: シナリオとUseCaseの1対1対応検証
3. **E2E**: 特定機能のE2Eフロー検証（「TODOを登録する」など）

### 横のルール総数: 約450件（全体の約98%）

横のルールは全体の大部分を占めます。以下のカテゴリに分類されます：

- **アーキテクチャ・責務境界**: 約50件
- **構造的規律（readonly、Result型、throw禁止等）**: 約80件
- **命名規則・ディレクトリ構造**: 約60件
- **バリデーション戦略（MECE原則、Always Valid）**: 約40件
- **パターン（DI、Port、Unit of Work、Provider/Context等）**: 約70件
- **実装パターン（Entity、VO、Handler、UseCase等）**: 約100件
- **テスト戦略（Small/Medium Test、Dummy、E2E等）**: 約50件

### 縦/横の割合: 約2% / 98%

**結論**: ほとんどのルールは「横のガードレール（非機能の憲法）」であり、構造的規律・アーキテクチャ・パターンに関するものです。「縦のガードレール（機能検証）」は契約とコードの対応関係検証、シナリオとUseCaseの対応検証、特定機能のE2Eフローのみに限定されます。

---

## カスタムlint自動生成の優先順位

### 優先順位テーブル

| 優先度 | 対象ルール | 生成難易度 | 誤検知リスク | 代表例 |
|--------|-----------|-----------|------------|--------|
| **P1（即座に実装）** | readonly、外部依存、命名規則、throw禁止 | 低 | 低 | Entityのreadonly検査、domain/配下の外部依存検査、.entity.ts命名規則、throw文検出 |
| **P2（早期実装）** | import type、container.get制限、execute戻り値型、equals/toString必須 | 中 | 中 | DIコンテナでのimport type使用、Handlerのcontainer.get制限、UseCaseのResult型戻り値、VOのequals/toString |
| **P3（段階的実装）** | トランザクション保護、バリデーション重複、複数UseCase呼び出し | 高 | 高 | UoWトランザクション検査、Register/UpdateパラメータのPATCH 3値セマンティクス、Handler内の複数UseCase検出 |

### 誤検知の許容範囲

- **P1ルール**: 誤検知率 < 5%
  - 構文解析で機械的に判定可能
  - false positiveはほぼ発生しない
  - 例: readonly修飾子の有無、throw文の存在、import文のパターン

- **P2ルール**: 誤検知率 < 15%
  - 型解析やパターンマッチングが必要
  - 限定的な文脈で誤検知が発生する可能性
  - 例: container.getの引数判定、メソッド戻り値の型推論

- **P3ルール**: 誤検知率 < 30%（ignoreで対処）
  - セマンティック解析が必要
  - 複雑な制御フローやビジネスロジックの理解が必要
  - 例: トランザクション境界の判定、複数書き込み操作の検出

**誤検知が30%を超える場合**: セマンティック解析（LLMベース）に切り替えることを検討します。

### カスタムlint実装の進め方

1. **P1ルールから順次実装**: 低リスク・高効果のルールから着手
2. **テスト駆動**: 各カスタムlintルールに対してPositive/Negative両方のテストケースを用意
3. **誤検知の追跡**: ignoreコメントの集計で誤検知率をモニタリング
4. **段階的改善**: P3ルールは最初から完璧を目指さず、ignoreを活用しながら精度向上

---

**生成日**: 2026-01-17
