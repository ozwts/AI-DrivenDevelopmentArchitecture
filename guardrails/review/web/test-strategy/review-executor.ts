/**
 * ポリシーベースのレビュー実行
 */

import * as fs from "fs/promises";
import * as path from "path";
import { selectPolicies, loadPolicies } from "./policy-loader.js";

export interface ReviewInput {
  targetFilePath: string;
  guardrailsRoot: string;
}

export interface ReviewResult {
  policies: Array<{
    name: string;
    content: string;
  }>;
  targetCode: string;
  targetFilePath: string;
  instruction: string;
}

/**
 * レビュー準備: ポリシーとコードを並列で読み込み、レビュー用のデータを返す
 */
export async function prepareReview(
  input: ReviewInput
): Promise<ReviewResult> {
  const { targetFilePath, guardrailsRoot } = input;

  // 対象ファイルを読み込む
  const targetCode = await fs.readFile(targetFilePath, "utf-8");

  // ポリシーファイルを選択
  const { policyFiles } = await selectPolicies(
    targetFilePath,
    guardrailsRoot
  );

  // ポリシーを並列で読み込む
  const policyContents = await loadPolicies(policyFiles);

  const policies = policyFiles.map((file, index) => ({
    name: path.basename(file),
    content: policyContents[index],
  }));

  // LLMへの指示を生成
  const instruction = generateReviewInstruction(
    policies,
    targetCode,
    targetFilePath
  );

  return {
    policies,
    targetCode,
    targetFilePath,
    instruction,
  };
}

/**
 * LLMへのレビュー指示を生成
 */
function generateReviewInstruction(
  policies: Array<{ name: string; content: string }>,
  targetCode: string,
  targetFilePath: string
): string {
  const policySection = policies
    .map((p, index) => `## Policy ${index + 1}: ${p.name}\n\n${p.content}`)
    .join("\n\n---\n\n");

  return `# Guardrails ポリシーレビュー

あなたはGuardrailsポリシーシステムに従うコードレビュアーです。
提供されたポリシーに基づいてコードをレビューし、建設的なフィードバックを提供してください。

${policySection}

---

## 対象ファイル

**ファイルパス**: \`${targetFilePath}\`

\`\`\`typescript
${targetCode}
\`\`\`

---

## レビュー指示

1. **コードを分析**: 各ポリシー要件に対してコードを評価してください
2. **違反を特定**: ポリシーに違反している具体的な行を指摘してください
3. **改善提案を提供**: 具体的な改善方法を提案してください
4. **良い実践を強調**: ポリシーに適合している点を認めてください

## 出力形式

以下の構造でレビューをまとめてください:

### サマリー
[全体的な評価を2-3文で記載]

### ポリシー準拠状況

#### ✅ 準拠している点
- [ポリシーに従っている実践をリストアップ]

#### ⚠️ 発見された問題
- **[ポリシー名] - [問題のタイトル]**
  - **場所**: X-Y行目
  - **問題**: [違反内容の説明]
  - **提案**: [修正方法]
  - **例**:
    \`\`\`typescript
    // 良い例
    \`\`\`

### 推奨事項
[追加の改善提案]

---

レビューを開始してください。
`;
}
