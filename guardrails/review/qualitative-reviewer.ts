/**
 * 定性的レビュー実装（Qualitative Review）
 *
 * LLMを使用したポリシーベースの定性的なコードレビュー。
 * 各責務（domain-model, use-case, test-strategy等）から利用される共通ロジック。
 *
 * 注: 静的解析（型チェック、Lint）は static-analysis-reviewer.ts を使用
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs/promises";
import * as path from "path";
import {
  ALL_TOOLS,
  executeToolUse,
  generateToolDescriptions,
} from "./tool-executor";

/**
 * レビュー実行設定
 */
const REVIEW_CONFIG = {
  /** 使用するClaudeモデル */
  model: "claude-haiku-4-5" as const,
  /** 最大トークン数 */
  maxTokens: 8192,
  /** frontmatter除外用正規表現 */
  frontmatterRegex: /^---\n[\s\S]*?\n---\n/,
} as const;

/**
 * レビュー対象の責務（Review Scope）定義
 */
export type ReviewScope = {
  /** レビュー責務（例: "ドメインモデル (Domain Model)"） */
  responsibility: string;
  /** 対象（例: "Entity, Value Object, Aggregate"） */
  targets: string;
  /** レビュー観点（例: "DDD原則、不変条件、バリデーション"） */
  aspects: string;
};

/**
 * レビュー入力パラメータ
 */
export type ReviewInput = {
  /** レビュー対象ファイルのパス一覧 */
  targetFilePaths: string[];
  /** ポリシーディレクトリの絶対パス */
  policyDir: string;
  /** guardrailsディレクトリのルートパス */
  guardrailsRoot: string;
  /** Anthropic API Key */
  apiKey: string;
  /** レビュー責務定義 */
  reviewScope: ReviewScope;
};

/**
 * ファイルごとのレビュー結果
 */
export type FileReviewResult = {
  filePath: string;
  review: string;
  success: boolean;
  error?: string;
};

/**
 * レビュー結果
 */
export type ReviewResult = {
  /** 全体レビューテキスト（複数ファイルの場合はファイルごとに区切られたテキスト） */
  overallReview: string;
  /** レビュー対象ファイル一覧 */
  targetFiles: string[];
  /** レビュー成功フラグ */
  success: boolean;
  /** エラーメッセージ（失敗時） */
  error?: string;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
};

/**
 * システムプロンプトを構築
 */
const buildSystemPrompt = (
  agentPrompt: string,
  policyDir: string,
  reviewScope: ReviewScope,
): string => {
  let systemPrompt = agentPrompt;

  systemPrompt += "\n\n# Review Scope\n\n";
  systemPrompt += `**レビュー責務**: ${reviewScope.responsibility}\n`;
  systemPrompt += `**対象**: ${reviewScope.targets}\n`;
  systemPrompt += `**観点**: ${reviewScope.aspects}\n\n`;

  systemPrompt += "# Policy Directory\n\n";
  systemPrompt += `ポリシーファイルディレクトリ: ${policyDir}\n\n`;
  systemPrompt += "利用可能なツール:\n";
  systemPrompt += generateToolDescriptions();
  systemPrompt += "\n";

  return systemPrompt;
};

/**
 * ユーザープロンプトを構築
 */
const buildUserPrompt = (targetFilePaths: string[]): string => {
  let userPrompt = "以下のファイルをレビューしてください。\n\n";

  userPrompt += "## 対象ファイル\n\n";
  for (const filePath of targetFilePaths) {
    const fileName = path.basename(filePath);
    userPrompt += `- ${fileName} (${filePath})\n`;
  }

  userPrompt += "\n## レビュー手順\n\n";
  userPrompt +=
    "1. `list_overview_files` でポリシーディレクトリから Overview ファイル一覧を取得\n";
  userPrompt +=
    "2. Overview ファイルを `read_file` で読み込み、レビュー対象の概要を把握\n";
  userPrompt +=
    "3. 必要に応じて `list_files` で詳細ファイルを確認し、`read_file` で読み込み\n";
  userPrompt += "4. 対象ファイルを `read_file` で読み込み\n";
  userPrompt += "5. ポリシーに基づいてレビューを実施\n\n";

  userPrompt += "## 重要: レビュー結果の形式\n\n";
  userPrompt +=
    "**複数ファイルをレビューする場合は、必ず各ファイルごとに明確に区切ってレビュー結果を記述してください。**\n\n";
  userPrompt += "以下の形式に従ってください：\n\n";
  userPrompt += "```\n";
  userPrompt += "## ファイル: {ファイル名}\n\n";
  userPrompt += "**ポリシー:** [...]\n\n";
  userPrompt += "**✅ 準拠:** ...\n\n";
  userPrompt += "**❌ 違反:** ...\n\n";
  userPrompt += "---\n\n";
  userPrompt += "## ファイル: {次のファイル名}\n\n";
  userPrompt += "...\n";
  userPrompt += "```\n";

  return userPrompt;
};

/**
 * 汎用レビュー実行
 *
 * LLMがポリシーディレクトリから適切なファイルを選択・読み込みしてレビューを実行
 */
export const executeReview = async (
  input: ReviewInput,
): Promise<ReviewResult> => {
  const { targetFilePaths, policyDir, guardrailsRoot, apiKey, reviewScope } =
    input;

  try {
    // 1. エージェントプロンプトを読み込み
    const agentPath = path.join(
      guardrailsRoot,
      "..",
      ".claude",
      "agents",
      "guardrails-reviewer.md",
    );

    let agentPrompt: string;
    try {
      const content = await fs.readFile(agentPath, "utf-8");
      // frontmatter（---で囲まれた部分）を除外
      agentPrompt = content.replace(REVIEW_CONFIG.frontmatterRegex, "").trim();

      if (agentPrompt === "") {
        throw new Error("Agent prompt is empty after removing frontmatter");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to load agent prompt from ${agentPath}: ${message}`,
      );
    }

    // 2. システムプロンプトを構築
    const systemPrompt = buildSystemPrompt(agentPrompt, policyDir, reviewScope);

    // 3. ユーザープロンプトを構築
    const userPrompt = buildUserPrompt(targetFilePaths);

    // 4. Claude APIでレビュー実行
    const anthropic = new Anthropic({ apiKey });
    const messages: Anthropic.Messages.MessageParam[] = [
      { role: "user", content: userPrompt },
    ];

    let reviewText = "";
    let continueLoop = true;

    while (continueLoop) {
      // eslint-disable-next-line no-await-in-loop
      const response = await anthropic.messages.create({
        model: REVIEW_CONFIG.model,
        max_tokens: REVIEW_CONFIG.maxTokens,
        system: systemPrompt,
        messages,
        tools: ALL_TOOLS,
      });

      // Tool Useがあれば実行
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.Messages.ToolUseBlock =>
          block.type === "tool_use",
      );

      if (toolUseBlocks.length > 0) {
        // 全ツールを実行
        messages.push({
          role: "assistant",
          content: response.content,
        });

        // eslint-disable-next-line no-await-in-loop
        const toolResults = await Promise.all(
          toolUseBlocks.map((block) => executeToolUse(block)),
        );

        messages.push({
          role: "user",
          content: toolResults,
        });
      } else {
        // Textレスポンスを取得
        const textBlock = response.content.find(
          (block): block is Anthropic.Messages.TextBlock =>
            block.type === "text",
        );
        reviewText =
          textBlock !== null &&
          textBlock !== undefined &&
          typeof textBlock.text === "string"
            ? textBlock.text
            : "";
        continueLoop = false;
      }
    }

    // 5. 結果を構造化
    return {
      overallReview: reviewText,
      targetFiles: targetFilePaths,
      success: true,
      summary: {
        total: targetFilePaths.length,
        successful: targetFilePaths.length,
        failed: 0,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      overallReview: "",
      targetFiles: targetFilePaths,
      success: false,
      error: errorMessage,
      summary: {
        total: targetFilePaths.length,
        successful: 0,
        failed: targetFilePaths.length,
      },
    };
  }
};
