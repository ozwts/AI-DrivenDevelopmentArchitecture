/**
 * ドメインモデルレビュー専用
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs/promises";
import * as path from "path";

type PolicySelection = {
  policyFiles: string[];
};

type FileReviewResult = {
  filePath: string;
  policies: string[];
  review: string;
  success: boolean;
  error?: string;
};

export type ParallelReviewResult = {
  results: FileReviewResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
};

export type FileReviewInput = {
  targetFilePaths: string[];
  guardrailsRoot: string;
  apiKey: string;
};

/**
 * ファイル読み込みツール定義
 */
const READ_FILE_TOOL: Anthropic.Messages.Tool = {
  name: "read_file",
  description: "指定されたパスのファイルの内容を読み込みます",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "読み込むファイルの絶対パス",
      },
    },
    required: ["path"],
  },
};

/**
 * ファイルパスから適切なポリシーファイルのリストを取得
 */
const selectPolicies = async (
  targetFilePath: string,
  guardrailsRoot: string,
): Promise<PolicySelection> => {
  const fileName = path.basename(targetFilePath);
  const isEntity = fileName.endsWith(".ts") && !fileName.includes("repository");
  const isRepository = fileName.includes("repository.ts");

  // テストファイルとダミーファイルは除外
  if (
    fileName.endsWith(".small.test.ts") ||
    fileName.endsWith(".dummy.ts") ||
    fileName.endsWith(".medium.test.ts")
  ) {
    throw new Error(
      `テストファイルとダミーファイルはレビュー対象外です: ${fileName}`,
    );
  }

  // ポリシーディレクトリのベースパス
  const policyBase = path.join(
    guardrailsRoot,
    "policy",
    "server",
    "domain-model",
  );

  let policyFiles: string[] = [];

  if (isEntity) {
    // エンティティ: 全体像 + エンティティ設計 + 集約パターン
    policyFiles = [
      path.join(policyBase, "10-domain-model-overview.md"),
      path.join(policyBase, "20-entity-design.md"),
      path.join(policyBase, "40-aggregate-pattern.md"),
    ];
  } else if (isRepository) {
    // リポジトリインターフェース: 全体像 + リポジトリ設計 + 集約パターン
    policyFiles = [
      path.join(policyBase, "10-domain-model-overview.md"),
      path.join(policyBase, "30-repository-interface.md"),
      path.join(policyBase, "40-aggregate-pattern.md"),
    ];
  } else {
    throw new Error(`サポートされていないファイル形式です: ${fileName}`);
  }

  // 全てのポリシーファイルが存在するか確認
  await Promise.all(
    policyFiles.map(async (file) => {
      try {
        await fs.access(file);
      } catch (error) {
        throw new Error(`ポリシーファイルが見つかりません: ${file}`);
      }
    }),
  );

  return { policyFiles };
};

/**
 * ポリシーファイルを並列で読み込む
 */
const loadPolicies = async (policyFiles: string[]): Promise<string[]> =>
  Promise.all(
    policyFiles.map(async (file) => {
      const content = await fs.readFile(file, "utf-8");
      return `# Policy: ${path.basename(file)}\n\n${content}`;
    }),
  );

/**
 * 単一ファイルをレビュー（Tool Use）
 */
const reviewSingleFile = async (
  filePath: string,
  guardrailsRoot: string,
  anthropic: Anthropic,
): Promise<FileReviewResult> => {
  try {
    // 1. ポリシーファイルを選択
    const { policyFiles } = await selectPolicies(filePath, guardrailsRoot);

    // 2. ポリシーを並列で読み込み
    const policyContents = await loadPolicies(policyFiles);
    const policies = policyFiles.map((file, index) => ({
      name: path.basename(file),
      content: policyContents[index],
    }));

    // 3. レビュー指示を生成
    const policySection = policies
      .map((p, index) => `## Policy ${index + 1}: ${p.name}\n\n${p.content}`)
      .join("\n\n---\n\n");

    const systemPrompt = `あなたはGuardrailsポリシーシステムに従うコードレビュアーです。
提供されたポリシーに基づいてドメインモデルコードをレビューし、建設的なフィードバックを提供してください。

${policySection}

対象ファイルを読み込む必要がある場合は、read_fileツールを使用してください。ファイルパス: ${filePath}`;

    // 4. Claude APIでレビュー実行（Tool Use）
    const messages: Anthropic.Messages.MessageParam[] = [
      {
        role: "user",
        content: `${filePath} のファイルを、提供されたポリシーに基づいてレビューしてください。まず read_file ツールを使用してファイルの内容を読み込んでください。`,
      },
    ];

    let reviewText = "";
    let continueLoop = true;

    while (continueLoop) {
      // eslint-disable-next-line no-await-in-loop
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        tools: [READ_FILE_TOOL],
      });

      // Tool Useがあれば実行
      const toolUseBlock = response.content.find(
        (block): block is Anthropic.Messages.ToolUseBlock =>
          block.type === "tool_use",
      );

      if (
        toolUseBlock !== null &&
        toolUseBlock !== undefined &&
        toolUseBlock.name === "read_file"
      ) {
        // ファイルを読み込み
        const input = toolUseBlock.input as { path: string };
        // eslint-disable-next-line no-await-in-loop
        const fileContent = await fs.readFile(input.path, "utf-8");

        // Tool結果を追加
        messages.push({
          role: "assistant",
          content: response.content,
        });
        messages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: toolUseBlock.id,
              content: fileContent,
            },
          ],
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
          typeof textBlock.text === "string" &&
          textBlock.text !== ""
            ? textBlock.text
            : "";
        continueLoop = false;
      }
    }

    return {
      filePath,
      policies: policies.map((p) => p.name),
      review: reviewText,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      filePath,
      policies: [],
      review: "",
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * 複数ファイルを並列でレビュー
 */
export const reviewFilesInParallel = async (
  input: FileReviewInput,
): Promise<ParallelReviewResult> => {
  const { targetFilePaths, guardrailsRoot, apiKey } = input;

  // Claude APIクライアント
  const anthropic = new Anthropic({ apiKey });

  // 各ファイルを並列でレビュー
  const results = await Promise.all(
    targetFilePaths.map((filePath) =>
      reviewSingleFile(filePath, guardrailsRoot, anthropic),
    ),
  );

  // サマリーを生成
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    results,
    summary: {
      total: results.length,
      successful,
      failed,
    },
  };
};
