# ガードレールのアーキテクチャ

## 基本方針

### カスタムlintがSSOT（Single Source of Truth）

**非機能検証の唯一の真実は、実装されたカスタムESLintルールである**

```
カスタムlint（TypeScript実装）
    ↓ LLMで自動生成
horizontal/generated/（Markdownポリシー）
```

### なぜこの方向なのか

1. **実行可能な検証が正**: コードで動くルールこそが信頼できる真実
2. **セマンティックレビュー用のドキュメント**: 人とAIがポリシーを理解しやすくするため、カスタムlintからMarkdownを生成
3. **ドキュメント腐敗の防止**: カスタムlintを更新したら、自動的にポリシーも更新される

---

## ディレクトリ構造

```
# カスタムlint実装（SSOT）
server/guardrails/
├── handler/
│   ├── container-get-restriction.ts
│   ├── single-usecase-call.ts
│   └── no-repository-import.ts
├── use-case/
│   ├── transaction-protection.ts
│   ├── result-type-return.ts
│   └── execute-method-single.ts
├── domain-model/
│   ├── readonly-properties.ts
│   ├── no-external-dependencies.ts
│   └── no-throw.ts
└── di-container/
    ├── import-type-usage.ts
    └── interface-impl-pattern.ts

# セマンティックレビュー用ポリシー（派生物）
guardrails/policy/horizontal/generated/
├── server/
│   ├── handler/
│   │   ├── container-get-restriction.md          # ← LLM生成
│   │   ├── single-usecase-call.md                # ← LLM生成
│   │   └── no-repository-import.md               # ← LLM生成
│   ├── use-case/
│   │   ├── transaction-protection.md             # ← LLM生成
│   │   ├── result-type-return.md                 # ← LLM生成
│   │   └── execute-method-single.md              # ← LLM生成
│   ├── domain-model/
│   │   ├── readonly-properties.md                # ← LLM生成
│   │   ├── no-external-dependencies.md           # ← LLM生成
│   │   └── no-throw.md                           # ← LLM生成
│   └── di-container/
│       ├── import-type-usage.md                  # ← LLM生成
│       └── interface-impl-pattern.md             # ← LLM生成
└── web/
    ├── component/
    │   └── selector-strategy.md                  # ← LLM生成
    └── hooks/
        └── tanstack-query-pattern.md             # ← LLM生成
```

---

## カスタムlintのアノテーション形式

カスタムlintには以下のアノテーションを付けることで、LLMがセマンティックなポリシーを生成できる：

```typescript
/**
 * @what 複数の書き込みを行うUseCaseがトランザクションで保護されているか検査
 * @why 複数書き込みを非トランザクションで行うと部分的コミットが発生するため
 * @failure 書き込み>=2 かつトランザクションなしのメソッドを検出した場合にエラー
 */

import { ESLintUtils } from '@typescript-eslint/utils';

export default ESLintUtils.RuleCreator.withoutDocs({
  meta: {
    type: 'problem',
    messages: {
      multipleWritesWithoutTransaction:
        '複数の書き込み操作({{count}}個)がトランザクション保護されていません。',
    },
  },
  create(context) {
    // 実装...
  },
});
```

---

## LLMによるポリシー生成

### 生成フロー

1. **カスタムlintのアノテーション読み取り**: `@what`, `@why`, `@failure`
2. **AST解析**: 実装ロジックから検証パターンを抽出
3. **Markdownポリシー生成**: `horizontal/generated/` 配下に配置

### 生成例

**Input**: `server/guardrails/use-case/transaction-protection.ts`

**Output**: `guardrails/policy/horizontal/generated/server/use-case/transaction-protection.md`

```markdown
# UseCase: トランザクション保護

## ルール

複数の書き込みを行うUseCaseはトランザクションで保護されている必要があります。

## 理由（Why）

複数書き込みを非トランザクションで行うと部分的コミットが発生し、データ整合性が崩れます。

## 検証方法（What）

executeメソッド内で以下をチェック：
- 書き込みメソッド呼び出し（save, delete, remove等）が2回以上
- かつ、UnitOfWorkRunner.run()でラップされていない

## 違反例

```typescript
// ❌ Bad: トランザクションなし
async execute(input: DeleteProjectUseCaseInput) {
  await this.#projectRepository.delete({ id: input.projectId });
  await this.#todoRepository.deleteByProjectId({ projectId: input.projectId });
  // 2つの書き込みがあるのにトランザクション保護なし
}
```

## 正しい実装

```typescript
// ✅ Good: UnitOfWorkRunner.run()でトランザクション保護
async execute(input: DeleteProjectUseCaseInput) {
  return this.#uowRunner.run(async (uow) => {
    await uow.projectRepository.delete({ id: input.projectId });
    await uow.todoRepository.deleteByProjectId({ projectId: input.projectId });
    return Result.ok(undefined);
  });
}
```

## ignoreする場合

トランザクションが不要な正当な理由がある場合のみignore:

```typescript
// 読み取り専用操作のためトランザクション不要
// eslint-disable-next-line use-case/transaction-protection -- 読み取り専用のため不要
async execute(input: GetProjectWithTodosUseCaseInput) {
  const project = await this.#projectRepository.findById({ id: input.projectId });
  const todos = await this.#todoRepository.findByProjectId({ projectId: input.projectId });
  return Result.ok({ project, todos });
}
```

**重要**: ignoreコメントには必ず理由（`--` の後）を記述してください。
```

---

## 誤検知の許容と理由記述

### 誤検知許容の方針

**誤検知するくらいのガードレール + ignore（理由付き）がAI駆動では丁度良い**

- カスタムlintは**積極的に誤検知する**設計を許容
- 見逃しより誤検知の方が安全
- 誤検知箇所は理由を明示してignore

### ignoreコメントの書き方

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
- 将来の保守者が理解できる説明

---

## 優先順位と誤検知率

| 優先度 | 対象ルール | 誤検知率目標 |
|--------|-----------|-------------|
| P1（即座に実装） | readonly、外部依存、throw禁止 | < 5% |
| P2（早期実装） | import type、container.get制限 | < 15% |
| P3（段階的実装） | トランザクション保護、バリデーション重複 | < 30% |

誤検知率が30%を超える場合は、セマンティック解析（LLMベース）に切り替えを検討。

---

## TypeScript実装のメリット

1. **型安全性**: AST操作が型で保護される
2. **開発効率**: IDEの補完が効く
3. **保守性**: 型があるため意図が明確
4. **統一性**: プロダクトコードと同じ技術スタック

---

## 実装ロードマップ

### Phase 1: P1ルール実装（Week 1-2）
- readonly検査
- 外部依存検査
- throw禁止検査

### Phase 2: 既存.cjs移行（Week 3-4）
- handler/配下の5件をTypeScriptに移行
- di-container/配下の1件をTypeScriptに移行

### Phase 3: P2ルール実装（Week 5-6）
- import type使用検査
- container.get制限検査
- Result型戻り値検査

### Phase 4: P3ルール実装（Week 7+）
- トランザクション保護検査
- バリデーション重複検査
- 複数UseCase呼び出し検査

---

## 移行戦略（Strangler Fig Pattern）

### 基本方針

**既存のポリシーを保持しながら、新アーキテクチャを並列で構築する**

```
既存ポリシー（guardrails/policy/）
    ↓ 継続使用（削除しない）
    ↓
[並列構築]
    ↓
カスタムlint（server/guardrails/）← 新SSOT
    ↓ LLM生成
generated/（guardrails/policy/horizontal/generated/）
    ↓ コンテキスト品質検証
既存ポリシーと同等以上のコンテキストを確認
    ↓ 移行完了
既存ポリシーをアーカイブ
```

### 共存期間の管理

**2つのポリシー体系が共存する期間は、以下の状態を維持する：**

| 状態 | 既存ポリシー | カスタムlint + generated | MCPツール動作 |
|------|-------------|-------------------------|--------------|
| 現在（Phase 0） | ✅ 使用中 | ❌ 未実装 | 既存ポリシー参照 |
| 移行中（Phase 1-4） | ✅ 使用継続 | 🚧 段階的実装 | generated優先（フォールバック有） |
| 検証期間 | ✅ 参照用保持 | ✅ 本格運用 | generated優先（フォールバック有） |
| 移行完了 | 🗑️ 破棄 | ✅ SSOT | generated専用 |

**ディレクトリ構造（共存期間）**:

```
guardrails/policy/
├── server/              # 既存ポリシー（保持）
│   ├── handler/
│   ├── use-case/
│   ├── domain-model/
│   └── ...
├── web/                 # 既存ポリシー（保持）
│   ├── component/
│   ├── hooks/
│   └── ...
└── horizontal/
    └── generated/       # 新ポリシー（段階的生成）
        ├── server/
        │   ├── handler/
        │   ├── use-case/
        │   └── domain-model/
        └── web/
            ├── component/
            └── hooks/
```

---

## 段階的実装手順

### Step 1: カスタムlint実装

既存ポリシーを忠実に再現する形でカスタムlintを実装：

1. **既存ポリシーの分析**
   - 対象: `guardrails/policy/server/use-case/20-result-type-return.md`
   - 抽出: ルールの意図（What）、理由（Why）、違反条件（Failure）

2. **アノテーション付きカスタムlint作成**
   ```typescript
   /**
    * @what UseCaseのexecuteメソッドはResult型を返す必要がある
    * @why エラーハンドリングの一貫性とビジネスエラーの明示的な扱いのため
    * @failure executeメソッドでResult型以外を返している場合にエラー
    */
   ```

3. **AST実装**
   - 既存ポリシーの検証ロジックをTypeScriptで実装
   - テストケースで検証精度を確認

### Step 2: LLM生成ツール構築

カスタムlintからMarkdownポリシーを生成するツールを実装：

```typescript
// tools/generate-policy-from-lint.ts
async function generatePolicy(lintFilePath: string): Promise<string> {
  // 1. アノテーション読み取り
  const annotations = extractAnnotations(lintFilePath);

  // 2. AST実装解析
  const astLogic = analyzeASTLogic(lintFilePath);

  // 3. LLMでMarkdown生成
  const markdown = await generateMarkdownWithLLM({
    what: annotations.what,
    why: annotations.why,
    failure: annotations.failure,
    astLogic: astLogic,
  });

  return markdown;
}
```

### Step 2.5: MCPツールの実装変更

新アーキテクチャに対応するため、MCPツールの動作を変更：

**現在の動作**:
```
mcp__guardrails__review_static_analysis
  → ESLint実行（既存のTypeScriptチェック + カスタムルール）

mcp__guardrails__review_qualitative
  → guardrails/policy/{workspace}/{policyId}/ を参照
  → LLMでセマンティックレビュー
```

**移行後の動作**:
```
mcp__guardrails__review_static_analysis
  → ESLint実行（カスタムlintを含む）
  → server/guardrails/ のルールを適用
  → 構造的違反を100%検出

mcp__guardrails__review_qualitative
  → guardrails/policy/horizontal/generated/{workspace}/{layer}/ を参照
  → LLMでセマンティックレビュー
  → カスタムlintで検出できない意図・文脈の違反を検出
```

**実装変更内容**:

1. **静的解析ツール（変更なし）**
   - カスタムlintはESLintの仕組みで実行される
   - 既存のツールがそのまま動作

2. **定性レビューツール（参照先変更）**
   ```typescript
   // 修正前
   const policyPath = `guardrails/policy/${workspace}/${policyId}/`;

   // 修正後（移行中）
   const policyPath = (() => {
     // generated/に対応ポリシーがあればそちらを優先
     const generatedPath = `guardrails/policy/horizontal/generated/${workspace}/${policyId}/`;
     if (fs.existsSync(generatedPath)) {
       return generatedPath;
     }
     // なければ既存ポリシーを参照（後方互換性）
     return `guardrails/policy/${workspace}/${policyId}/`;
   })();

   // 修正後（移行完了後）
   const policyPath = `guardrails/policy/horizontal/generated/${workspace}/${layer}/`;
   ```

3. **policyIdの変更**
   - 移行前: `policyId="server/domain-model"`（既存ディレクトリ構造）
   - 移行後: `policyId="server/domain-model"`（generated/配下の構造に対応）

**移行期間の互換性**:
- generated/にポリシーがあればそちらを参照
- なければ既存ポリシーを参照（フォールバック）
- 段階的な移行をサポート

### Step 3: コンテキスト品質検証

生成されたポリシーが既存ポリシーと同等以上のコンテキストを持つか検証：

**検証観点**:

| 観点 | 既存ポリシー | generated/ | 検証方法 |
|------|-------------|-----------|---------|
| ルール定義の明確性 | ✅ | ？ | 人間レビュー |
| 理由の説明 | ✅ | ？ | 人間レビュー |
| 違反例の具体性 | ✅ | ？ | コード例の数・質 |
| 正しい実装例 | ✅ | ？ | コード例の数・質 |
| ignoreする場合の説明 | ✅ | ？ | ガイドライン有無 |

**検証プロセス**:

1. カスタムlint実装 → generated/にMarkdown生成
2. 既存ポリシーと生成ポリシーを比較
3. 不足している内容を特定
4. カスタムlintのアノテーションまたは生成ロジックを改善
5. 再生成して再検証
6. 同等以上のコンテキストになるまで繰り返し

### Step 4: 段階的な切り替え

**レイヤー単位で段階的に切り替え**:

```
Phase 1: domain-model/ （最も独立性が高い）
  ├── カスタムlint実装
  ├── generated/生成
  ├── 品質検証
  └── ✅ 移行完了

Phase 2: use-case/
  ├── カスタムlint実装
  ├── generated/生成
  ├── 品質検証
  └── ✅ 移行完了

Phase 3: handler/、di-container/
  ...

Phase 4: repository/、port/
  ...
```

### Step 5: 既存ポリシーの破棄

全レイヤーの移行完了後、既存ポリシーを破棄：

```bash
# 既存ポリシーを削除
rm -rf guardrails/policy/server/
rm -rf guardrails/policy/web/
rm -rf guardrails/policy/e2e/
rm -rf guardrails/policy/infra/
rm -rf guardrails/policy/contract/
```

**破棄条件**:
- 全カスタムlintが実装済み
- 全generated/ポリシーが生成済み
- コンテキスト品質検証が完了（既存ポリシーと同等以上）
- 最低1ヶ月の本格運用期間を経過
- 問題が発生していないことを確認
- **Git履歴に残っているため、必要時に復元可能**

---

## コンテキスト品質の保証

### 品質チェックリスト

各カスタムlint実装時に以下を確認：

- [ ] `@what`アノテーションが明確に記述されている
- [ ] `@why`アノテーションがビジネス/技術的理由を説明している
- [ ] `@failure`アノテーションが違反条件を明示している
- [ ] 生成されたMarkdownに違反例（Bad）が含まれている
- [ ] 生成されたMarkdownに正しい実装例（Good）が含まれている
- [ ] ignoreする場合のガイドラインが記載されている
- [ ] 既存ポリシーの重要な情報が漏れていない

### コンテキスト不足時の対応

**問題**: 生成されたポリシーが既存ポリシーより情報量が少ない

**対応策**:

1. **アノテーションの充実**
   - `@what`、`@why`、`@failure`に詳細を追加
   - 必要に応じて`@example-bad`、`@example-good`を追加

2. **生成プロンプトの改善**
   - LLM生成時のプロンプトテンプレートを改善
   - 具体例を自動生成する仕組みを追加

3. **手動補完**
   - generated/ポリシーに手動で情報を追加
   - 追加した情報をアノテーションに反映（次回生成で自動化）

---

## 移行の完了条件

以下の条件を全て満たした時点で移行完了とする：

1. ✅ 全既存ポリシーに対応するカスタムlintが実装済み
2. ✅ 全カスタムlintからgenerated/ポリシーが生成済み
3. ✅ コンテキスト品質検証が完了（同等以上を確認）
4. ✅ 本格運用期間（最低1ヶ月）を経過
5. ✅ 誤検知率が目標範囲内（P1: <5%, P2: <15%, P3: <30%）
6. ✅ ignoreコメントの理由記述が習慣化
7. ✅ 問題が発生していない（または発生時に速やかに修正できた）

移行完了後、既存ポリシーは破棄され、カスタムlintがSSOTとして機能する体制に移行する

**移行完了後のツール動作**:
- `mcp__guardrails__review_static_analysis`: カスタムlintで構造的違反を検出
- `mcp__guardrails__review_qualitative`: `generated/`ポリシーでセマンティックレビュー
- 既存ポリシーへのフォールバックは削除（参照先が存在しない）
