# TypeScript静的解析実装ガイド

本ドキュメントは、既存ポリシーからTypeScript Compiler APIによる静的解析を段階的に実装するための実践的ガイドです。

---

## 最重要：横と縦の区別

**このドキュメントはHorizontal（横のガードレール）のみを対象とします。**

### Horizontal（横のガードレール）

**定義**: 各レイヤー（Handler/UseCase/Domain/Repository等）ごとの**技術的なルール**

**特徴**:
- 機能に依存しない共通原則
- レイヤーの責務境界を守るための構造的制約
- 全機能（Todo/Project/User等）に横断的に適用
- **全てTypeScript Compiler APIで自前実装**（P1/P2/P3すべて）

### Vertical（縦のガードレール）

**定義**: 機能単位（Todo/Project/User等）で4層を貫く**ビジネス契約との整合性検証**

**特徴**:
- 機能ごとのビジネス契約（用語集・シナリオ）と照合
- **TypeScript実装では対象外**
- 専用の検証ツールまたはqualitativeレビューで対応

**重要**: Verticalの検証項目（Entity名が用語集に記載されているか、メソッド名がシナリオと対応しているか等）は、このドキュメントの対象外です。

---

## 基本方針

### SSOTはTypeScript実装

**非機能検証の唯一の真実は、TypeScript Compiler APIで実装された静的解析である**

```
TypeScript実装（TypeScript Compiler API）← SSOT
    ↓ LLMで自動生成
horizontal/generated/semantic/（Markdown）← 派生物（人とAIがポリシーを理解するため）
```

### 誤検知許容

**誤検知するくらいのガードレール + ignore（理由付き）がAI駆動では丁度良い**

- 静的解析は**積極的に誤検知する**設計を許容
- 見逃しより誤検知の方が安全
- 誤検知箇所は理由を明示してignore

---

## 実装の段階的アプローチ

### Phase 1: P1ルール（構文検証のみ）

**特徴**: AST単独で判定可能。誤検知<5%。即座に実装可能。

#### 対象ルール

1. **readonly修飾子検証**
   - Entity/Value Objectのプロパティが`readonly`
   - Props型フィールドが`readonly`

2. **private constructor検証**
   - Entity/Value Objectのコンストラクタが`private`

3. **throw文検出**
   - ドメイン層でのthrow文禁止

4. **null使用禁止**
   - `| null`型アノテーション検出

5. **ファイル命名規則**
   - `.entity.ts`, `.vo.ts`, `.repository.ts`などのパターン

6. **JSDocコメント有無**
   - Entity/Value Object/メソッドにJSDoc必須

7. **ES2022プライベートフィールド**
   - Value Objectで`#`フィールド使用確認

#### 実装例：readonly修飾子検証

**TypeScript実装**: `policy/horizontal/static/server/domain-model/readonly-properties.ts`

```typescript
/**
 * @what Entity/Value Objectのプロパティがreadonlyで宣言されているか検査
 * @why mutableなプロパティは不変性を破壊し、予期しない副作用を生むため
 * @failure readonly修飾子がないEntityプロパティを検出した場合にエラー
 */

import * as ts from 'typescript';
import createCheck from '../../check-builder';

export default createCheck({
  filePattern: /\.(entity|vo)\.ts$/,
  visitor: (node, ctx) => {
    if (!ts.isClassDeclaration(node)) return;
    for (const member of node.members) {
      if (!ts.isPropertyDeclaration(member)) continue;
      const hasReadonly = member.modifiers?.some(
        m => m.kind === ts.SyntaxKind.ReadonlyKeyword
      );
      if (!hasReadonly && member.name && ts.isIdentifier(member.name)) {
        ctx.report(member, `プロパティ "${member.name.text}" にreadonly修飾子がありません。`);
      }
    }
  }
});
```

**Check Builderパターンの利点**:
- **68行→25行に簡素化**: ボイラープレートを削減
- **自動メタデータ抽出**: ファイルパスから`id`を自動生成（例: `server/domain-model/readonly-properties`）
- **JSDoc解析**: `@what`/`@why`/`@failure`を自動抽出
- **統一されたインターフェース**: 全チェックが同じパターンで実装可能

#### 生成されるMarkdownポリシー

**ファイル**: `guardrails/policy/horizontal/generated/server/domain-model/readonly-properties.md`

```markdown
# Domain Model: readonly修飾子

## ルール

Entity/Value Objectのプロパティはreadonlyでなければならない。

## 理由（Why）

mutableなプロパティは不変性を破壊し、予期しない副作用を生む。

## 検証方法（What）

`.entity.ts`または`.vo.ts`ファイル内のクラスプロパティに`readonly`修飾子があることを確認。

## 違反例

```typescript
// ❌ Bad: readonly修飾子なし
export class Todo {
  id: string;           // 違反
  title: string;        // 違反
  status: TodoStatus;   // 違反
}
```

## 正しい実装

```typescript
// ✅ Good: readonly修飾子あり
export class Todo {
  readonly id: string;
  readonly title: string;
  readonly status: TodoStatus;
}
```

## ignoreする場合

内部状態の一時的な変更が必要な場合のみignore:

```typescript
// 内部状態の一時的な変更のため
// eslint-disable-next-line domain-model/readonly-properties -- キャッシュの一時的な更新
private cache: Map<string, Todo>;
```
```

---

### Phase 2: P2ルール（型情報+構造検証）

**特徴**: 複数ファイル間の関係を検査。誤検知<15%。TypeScript型情報が必要。

#### 対象ルール

1. **Import方向検証**
   - Domain層が外部ライブラリをimportしない
   - Handler層がRepository直接importしない

2. **container.get()対象制限**
   - Handler層でLoggerとUseCaseのみ取得可能

3. **Result型返却確認**
   - 失敗可能なメソッドが`Result<T, E>`を返す

4. **循環依存検出**
   - A→B→C→Aのような循環を検出

5. **集約境界の完全性**
   - 集約ルートと子エンティティが同一ディレクトリ

6. **レイヤー間メソッド呼び出し制約**
   - Handler → UseCase → Domain の方向性

#### 実装例：container.get()対象制限

**カスタムlintルール**: `server/guardrails/handler/container-get-restriction.ts`

```typescript
/**
 * @what Handlerがcontainer.getでLoggerとUseCaseのみを取得しているか検査
 * @why Handler層がRepositoryやPortを直接取得すると責務境界が曖昧になるため
 * @failure Handler内でcontainer.get()がLogger/UseCase以外を取得している場合に非0終了
 */

import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const ALLOWED_SERVICES = new Set([
  'LOGGER',
  // UseCaseはサービスID命名規則により動的に判定
]);

export default ESLintUtils.RuleCreator.withoutDocs({
  meta: {
    type: 'problem',
    docs: {
      description: 'Handler層はcontainer.getでLoggerとUseCaseのみ取得可能',
      recommended: 'error',
    },
    messages: {
      forbiddenContainerGet:
        'Handler層でcontainer.get("{{serviceId}}")は禁止されています。LoggerまたはUseCaseのみ取得可能です。',
    },
    schema: [],
  },
  defaultOptions: [],

  create(context) {
    const filename = context.getFilename();

    // handler.tsファイルのみチェック
    if (!filename.includes('handler.ts')) {
      return {};
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // container.get() 呼び出しを検出
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'get' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'container'
        ) {
          // 引数を取得
          const arg = node.arguments[0];
          if (arg?.type === 'Literal' && typeof arg.value === 'string') {
            const serviceId = arg.value;

            // サービスIDがLOGGERまたはUseCaseパターンでない場合エラー
            if (
              !ALLOWED_SERVICES.has(serviceId) &&
              !serviceId.endsWith('_USE_CASE')
            ) {
              context.report({
                node,
                messageId: 'forbiddenContainerGet',
                data: { serviceId },
              });
            }
          }
        }
      },
    };
  },
});
```

#### 実装例：Result型返却確認

**カスタムlintルール**: `server/guardrails/use-case/result-type-return.ts`

```typescript
/**
 * @what UseCaseのexecuteメソッドがResult型を返すか検査
 * @why 明示的なエラーハンドリングを強制し、throwを使わない設計を保証するため
 * @failure executeメソッドの戻り値の型がResult<T, E>でない場合に非0終了
 */

import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

export default ESLintUtils.RuleCreator.withoutDocs({
  meta: {
    type: 'problem',
    docs: {
      description: 'UseCaseのexecuteメソッドはResult型を返す必要がある',
      recommended: 'error',
    },
    messages: {
      missingResultType:
        'executeメソッドの戻り値はResult<T, E>型でなければなりません。',
    },
    schema: [],
  },
  defaultOptions: [],

  create(context) {
    const filename = context.getFilename();

    // use-case.tsファイルのみチェック
    if (!filename.includes('use-case.ts')) {
      return {};
    }

    return {
      MethodDefinition(node: TSESTree.MethodDefinition) {
        // executeメソッドのみチェック
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'execute' &&
          node.value.type === 'FunctionExpression'
        ) {
          const returnType = node.value.returnType;

          // 戻り値の型がResult<T, E>であることを確認
          if (returnType?.typeAnnotation.type === 'TSTypeReference') {
            const typeName = returnType.typeAnnotation.typeName;

            if (
              typeName.type === 'Identifier' &&
              !typeName.name.startsWith('Result') &&
              !typeName.name.startsWith('Promise<Result')
            ) {
              context.report({
                node: returnType,
                messageId: 'missingResultType',
              });
            }
          }
        }
      },
    };
  },
});
```

---

### Phase 3: P3ルール（セマンティック解析）

**特徴**: コンテキスト理解が必要。誤検知>30%。**誤検知を許容してカスタムlintで実装する。**

#### 対象ルール

1. **責務境界違反検出**
   - Handler層がビジネスロジックを含んでいないか
   - Entity層がビジネスルール（権限チェック）を含んでいないか

2. **MECE原則検証**
   - 型レベルバリデーションがHandler層のみか
   - ドメインルール検証がDomain層のみか
   - ビジネスルール検証がUseCase層のみか

3. **Value Object化の必要性**
   - 不変条件を持つフィールドがVO化されているか

4. **変換関数内ビジネスロジック検出**
   - レスポンス変換関数がビジネスロジックを含んでいないか

**実装方針**:
- **P3ルールもカスタムESLintで実装する**（horizontalの原則）
- 誤検知>30%を許容
- 誤検知箇所は `// eslint-disable-next-line {rule-name} -- {理由}` で個別にignore
- カスタムlint → `horizontal/generated/` Markdown → qualitativeレビューで使用

---

## Check Builderパターン

### 概要

Check Builderパターンは、TypeScript Compiler APIを使った静的解析チェックの実装を簡素化する。

**Before（68行）**:
```typescript
export const metadata: CheckMetadata = { ... };
export function check(sourceFile: ts.SourceFile, program: ts.Program): Violation[] { ... }
export default { metadata, check } as CheckModule;
```

**After（25行）**:
```typescript
export default createCheck({
  filePattern: /\.(entity|vo)\.ts$/,
  visitor: (node, ctx) => { ... }
});
```

### Check Builder内部実装

```typescript
// check-builder.ts
export default function createCheck(definition: CheckDefinition): CheckModule {
  // 1. スタックトレースから呼び出し元ファイルパスを取得
  const callerPath = extractCallerPath();

  // 2. JSDocアノテーションを抽出
  const jsDoc = extractJSDocFromFile(callerPath);
  const metadata = extractMetadata(callerPath, jsDoc);

  // 3. ポリシーパスを自動設定
  const policyPath = callerPath.includes('/policy/horizontal/static/')
    ? 'policy/horizontal/static/' + callerPath.split('/policy/horizontal/static/')[1]
    : callerPath;

  // 4. チェック関数を生成
  const check = (sourceFile: ts.SourceFile, program: ts.Program): Violation[] => {
    const violations: Violation[] = [];
    const fileName = sourceFile.fileName;

    if (definition.filePattern && !definition.filePattern.test(fileName)) {
      return violations;
    }

    const ctx: CheckContext = {
      report: (node: ts.Node, message: string, severity = 'error') => {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(sourceFile)
        );
        violations.push({
          file: fileName,
          line: line + 1,
          column: character + 1,
          severity,
          ruleId: metadata.id,
          message,
          what: metadata.what,
          why: metadata.why,
          policyPath,
        });
      },
      sourceFile,
      program,
    };

    function visit(node: ts.Node) {
      definition.visitor(node, ctx);
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return violations;
  };

  return { metadata, check };
}
```

---

## カスタムlint実装のベストプラクティス

### 1. アノテーション形式の統一

すべてのチェックに以下のアノテーションを付与：

```typescript
/**
 * @what 何をチェックするか（明確な検証対象）
 * @why なぜチェックするか（ビジネス理由または技術理由）
 * @failure 違反を検出した場合の終了条件
 */
```

**重要な変更**:
- **@ruleタグは廃止**: ファイルパスから自動生成されるため不要
- **@example-bad/@example-goodは削除**: LLM生成時に自動生成

### 2. ファイル命名規則

| 対象 | パターン | 例 |
|------|---------|-----|
| Domain層ルール | `{検証対象}.ts` | `readonly-properties.ts`, `no-throw.ts` |
| Handler層ルール | `{検証対象}.ts` | `container-get-restriction.ts`, `single-usecase-call.ts` |
| UseCase層ルール | `{検証対象}.ts` | `result-type-return.ts`, `execute-method-single.ts` |

### 3. エラーメッセージの明確化

```typescript
messages: {
  missingReadonly:
    'プロパティ "{{propertyName}}" にreadonly修飾子がありません。',
  forbiddenContainerGet:
    'Handler層でcontainer.get("{{serviceId}}")は禁止されています。LoggerまたはUseCaseのみ取得可能です。',
}
```

### 4. ファイルスコープの限定

```typescript
const filename = context.getFilename();

// .entity.ts または .vo.ts ファイルのみチェック
if (!filename.endsWith('.entity.ts') && !filename.endsWith('.vo.ts')) {
  return {};
}
```

### 5. テストケースの作成

各カスタムlintに対してPositive/Negativeテストケースを用意：

```typescript
// __tests__/readonly-properties.test.ts

import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../readonly-properties';

const ruleTester = new RuleTester({
  parser: '@typescript-eslint/parser',
});

ruleTester.run('readonly-properties', rule, {
  valid: [
    {
      code: `
        export class Todo {
          readonly id: string;
          readonly title: string;
        }
      `,
      filename: 'todo.entity.ts',
    },
  ],
  invalid: [
    {
      code: `
        export class Todo {
          id: string;  // readonly修飾子なし
        }
      `,
      filename: 'todo.entity.ts',
      errors: [{ messageId: 'missingReadonly' }],
    },
  ],
});
```

---

## LLM生成ツールの実装

### 1. アノテーション読み取り

```typescript
// tools/generate-policy-from-lint.ts

import * as fs from 'fs';
import * as path from 'path';

interface Annotations {
  what: string;
  why: string;
  failure: string;
}

function extractAnnotations(filePath: string): Annotations {
  const content = fs.readFileSync(filePath, 'utf-8');

  const whatMatch = content.match(/@what\s+(.+)/);
  const whyMatch = content.match(/@why\s+(.+)/);
  const failureMatch = content.match(/@failure\s+(.+)/);

  return {
    what: whatMatch?.[1] || '',
    why: whyMatch?.[1] || '',
    failure: failureMatch?.[1] || '',
  };
}
```

### 2. AST解析

```typescript
import * as ts from 'typescript';

function analyzeASTLogic(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  // ASTを走査して検証ロジックを抽出
  let logic = '';

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      // context.report()呼び出しを検出
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'report'
      ) {
        logic += '違反時にエラー報告\n';
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return logic;
}
```

### 3. LLMでMarkdown生成

```typescript
async function generateMarkdownWithLLM(params: {
  what: string;
  why: string;
  failure: string;
  exampleBad: string;
  exampleGood: string;
  astLogic: string;
}): Promise<string> {
  const prompt = `
以下のカスタムESLintルールのアノテーションとAST実装から、Markdownポリシーを生成してください。

# アノテーション

- What: ${params.what}
- Why: ${params.why}
- Failure: ${params.failure}
- Example (Bad): ${params.exampleBad}
- Example (Good): ${params.exampleGood}

# AST実装

${params.astLogic}

# 生成フォーマット

以下のMarkdown形式で生成してください：

\`\`\`markdown
# [レイヤー名]: [ルール名]

## ルール

[何をチェックするか]

## 理由（Why）

[なぜチェックするか]

## 検証方法（What）

[具体的な検証方法]

## 違反例

\`\`\`typescript
// ❌ Bad: [違反パターン]
[違反コード例]
\`\`\`

## 正しい実装

\`\`\`typescript
// ✅ Good: [正しいパターン]
[正しいコード例]
\`\`\`

## ignoreする場合

[ignore理由の例]

\`\`\`typescript
// [理由]
// eslint-disable-next-line [ルール名] -- [詳細な理由]
[ignoreするコード例]
\`\`\`
\`\`\`
  `;

  // LLM APIを呼び出してMarkdown生成
  const response = await callLLMAPI(prompt);
  return response;
}
```

### 4. 生成スクリプトの実行

```bash
# 単一ファイルから生成
npm run generate-policy -- server/guardrails/domain-model/readonly-properties.ts

# ディレクトリ全体から生成
npm run generate-policy -- server/guardrails/domain-model/

# すべてのカスタムlintから生成
npm run generate-policy:all
```

---

## MCPツールの変更

### 現在の動作

```typescript
// mcp__guardrails__review_qualitative

const policyPath = `guardrails/policy/${workspace}/${policyId}/`;
```

### 移行後の動作

```typescript
// mcp__guardrails__review_qualitative

const policyPath = (() => {
  // generated/に対応ポリシーがあればそちらを優先
  const generatedPath = `guardrails/policy/horizontal/generated/${workspace}/${policyId}/`;
  if (fs.existsSync(generatedPath)) {
    return generatedPath;
  }
  // なければ既存ポリシーを参照（後方互換性）
  return `guardrails/policy/${workspace}/${policyId}/`;
})();
```

---

## 実装ロードマップ

### 完了した実装（2026-01-17）

- [x] Check Builderパターンの実装
- [x] アノテーション自動抽出（@what/@why/@failure）
- [x] ファイルパスからID自動生成
- [x] readonly修飾子検証（実装例完成）
- [x] コンパクトな出力フォーマット（単行+詳細行）
- [x] 柔軟な実行粒度（workspace/layer省略可能）
- [x] ポリシー発見ツール（policy_list_horizontal/vertical）

### Week 1-2: P1ルール実装

- [ ] private constructor検証
- [ ] throw文検出
- [ ] null使用禁止
- [ ] JSDocコメント有無
- [ ] ES2022プライベートフィールド
- [ ] ファイル命名規則検証

### Week 3-4: LLM生成ツール構築

- [ ] アノテーション読み取り機能（Check Builderで部分実装済み）
- [ ] AST解析機能
- [ ] LLM呼び出し機能
- [ ] Markdown生成機能
- [ ] 生成スクリプト作成

### Week 5-6: P2ルール実装

- [ ] Import方向検証
- [ ] container.get()対象制限
- [ ] Result型返却確認
- [ ] 循環依存検出
- [ ] 集約境界の完全性
- [ ] レイヤー間メソッド呼び出し制約

### Week 7+: P3ルール検討

- [ ] 責務境界違反検出の実現可能性調査
- [ ] MECE原則検証の実現可能性調査
- [ ] LLMレビューとの使い分け整理

---

## 誤検知率の追跡

### 追跡方法

```bash
# ignoreコメント数を集計
grep -r "eslint-disable-next-line" server/ web/ | wc -l

# ルール別に集計
grep -r "eslint-disable-next-line domain-model/readonly-properties" server/ | wc -l
```

### 目標値

| 優先度 | 誤検知率目標 | 判断基準 |
|--------|-------------|---------|
| P1 | < 5% | 100回実行で5回未満の誤検知 |
| P2 | < 15% | 100回実行で15回未満の誤検知 |
| P3 | < 30% | 100回実行で30回未満の誤検知 |

---

## コンテキスト品質の保証

### 品質チェックリスト

各カスタムlint実装時に以下を確認：

- [ ] `@what`アノテーションが明確に記述されている
- [ ] `@why`アノテーションがビジネス/技術的理由を説明している
- [ ] `@failure`アノテーションが違反条件を明示している
- [ ] `@example-bad`アノテーションが具体的な違反コード例を示している
- [ ] `@example-good`アノテーションが正しい実装例を示している
- [ ] 生成されたMarkdownに違反例（Bad）が含まれている
- [ ] 生成されたMarkdownに正しい実装例（Good）が含まれている
- [ ] ignoreする場合のガイドラインが記載されている
- [ ] 既存ポリシーの重要な情報が漏れていない

**アノテーション例の効果**:
- `@example-bad`/`@example-good`を記述すると、LLMが生成するMarkdownの品質が大幅に向上
- 具体的なコード例により、ポリシーの意図がより明確に伝わる
- 新規開発者やAIエージェントが理解しやすいポリシーになる

### 品質検証プロセス

1. カスタムlint実装
2. LLM生成ツールでMarkdown生成
3. 既存ポリシーと生成ポリシーを比較
4. 不足している内容を特定
5. アノテーションまたは生成ロジックを改善
6. 再生成して再検証
7. 同等以上のコンテキストになるまで繰り返し

---

## 移行完了条件

以下の条件を全て満たした時点で移行完了とする：

1. ✅ 全既存ポリシーに対応するカスタムlintが実装済み
2. ✅ 全カスタムlintからgenerated/ポリシーが生成済み
3. ✅ コンテキスト品質検証が完了（同等以上を確認）
4. ✅ 本格運用期間（最低1ヶ月）を経過
5. ✅ 誤検知率が目標範囲内（P1: <5%, P2: <15%, P3: <30%）
6. ✅ ignoreコメントの理由記述が習慣化
7. ✅ 問題が発生していない（または発生時に速やかに修正できた）

移行完了後、既存ポリシーは破棄され、カスタムlintがSSOTとして機能する体制に移行する。

**生成日**: 2026-01-17
