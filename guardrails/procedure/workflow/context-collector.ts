/**
 * Context Collector（コンテキストコレクター）
 *
 * ワークフロー計画時に参照するコンテキスト情報を収集
 * - コミット履歴
 * - PRコメント
 * - 完了タスク
 */

import { execSync } from "child_process";
import * as path from "path";
import { getWorkflowMemory, type TaskWithStatus, type Phase } from "./memory";

/**
 * コミット情報
 */
export type CommitInfo = {
  /** コミットハッシュ（短縮） */
  hash: string;
  /** コミットメッセージ */
  message: string;
  /** 作成者 */
  author: string;
  /** 日時 */
  date: string;
};

/**
 * PRコメント情報
 */
export type PRComment = {
  /** コメント作成者 */
  author: string;
  /** コメント本文 */
  body: string;
  /** 作成日時 */
  createdAt: string;
  /** レビューコメントかどうか */
  isReviewComment: boolean;
};

/**
 * ワークフローコンテキスト
 */
export type WorkflowContext = {
  /** 最近のコミット */
  commits: CommitInfo[];
  /** PRコメント */
  prComments: PRComment[];
  /** 完了タスク */
  completedTasks: TaskWithStatus[];
  /** 設計判断 */
  designDecisions: string[];
  /** 現在のフェーズ */
  currentPhase: Phase | null;
  /** 完了したフェーズ */
  completedPhases: Phase[];
};

/**
 * 最近のコミットを取得
 */
const getRecentCommits = (
  projectRoot: string,
  limit: number = 20,
): CommitInfo[] => {
  try {
    const output = execSync(
      `git log --oneline -${limit} --format="%h|%s|%an|%ad" --date=short`,
      { cwd: projectRoot, encoding: "utf-8" },
    );

    return output
      .trim()
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => {
        const [hash, message, author, date] = line.split("|");
        return {
          hash: hash ?? "",
          message: message ?? "",
          author: author ?? "",
          date: date ?? "",
        };
      });
  } catch {
    return [];
  }
};

/**
 * 現在ブランチのPR情報を取得
 */
export const getPRForCurrentBranch = (): {
  number: number;
  url: string;
} | null => {
  try {
    const output = execSync("gh pr view --json number,url", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const data = JSON.parse(output) as { number: number; url: string };
    return data;
  } catch {
    return null; // PRがまだない場合
  }
};

/**
 * PRボディを取得（gh CLI使用）
 */
export const getPRBody = (prNumber?: number): string | null => {
  try {
    const command =
      prNumber !== undefined
        ? `gh pr view ${prNumber} --json body`
        : "gh pr view --json body";
    const output = execSync(command, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const data = JSON.parse(output) as { body: string };
    return data.body;
  } catch {
    return null;
  }
};

/**
 * PRコメントを取得（gh CLI使用）
 */
const getPRComments = async (prNumber: number): Promise<PRComment[]> => {
  try {
    // 通常のコメントを取得
    const commentsOutput = execSync(
      `gh api repos/:owner/:repo/issues/${prNumber}/comments --jq '.[] | {author: .user.login, body: .body, createdAt: .created_at}'`,
      { encoding: "utf-8" },
    );

    const comments: PRComment[] = commentsOutput
      .trim()
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => {
        try {
          const parsed = JSON.parse(line) as {
            author: string;
            body: string;
            createdAt: string;
          };
          return {
            author: parsed.author,
            body: parsed.body,
            createdAt: parsed.createdAt,
            isReviewComment: false,
          };
        } catch {
          return null;
        }
      })
      .filter((c): c is PRComment => c !== null);

    // レビューコメントを取得
    try {
      const reviewCommentsOutput = execSync(
        `gh api repos/:owner/:repo/pulls/${prNumber}/comments --jq '.[] | {author: .user.login, body: .body, createdAt: .created_at}'`,
        { encoding: "utf-8" },
      );

      const reviewComments: PRComment[] = reviewCommentsOutput
        .trim()
        .split("\n")
        .filter((line) => line.length > 0)
        .map((line) => {
          try {
            const parsed = JSON.parse(line) as {
              author: string;
              body: string;
              createdAt: string;
            };
            return {
              author: parsed.author,
              body: parsed.body,
              createdAt: parsed.createdAt,
              isReviewComment: true,
            };
          } catch {
            return null;
          }
        })
        .filter((c): c is PRComment => c !== null);

      return [...comments, ...reviewComments].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    } catch {
      return comments;
    }
  } catch {
    return [];
  }
};

/**
 * コンテキストを収集
 */
export const collectContext = async (
  guardrailsRoot: string,
): Promise<WorkflowContext> => {
  const projectRoot = path.dirname(guardrailsRoot);
  const memory = getWorkflowMemory();

  // コミット履歴を取得
  const commits = getRecentCommits(projectRoot);

  // PRコメントを取得（PRが存在する場合）
  const pr = getPRForCurrentBranch();
  const prComments = pr !== null ? await getPRComments(pr.number) : [];

  // メモリから状態を取得
  const completedTasks = memory.getCompletedTasks();
  const notes = memory.getNotes();
  const currentPhase = memory.getCurrentPhase();
  const completedPhases = memory.getCompletedPhases();

  return {
    commits,
    prComments,
    completedTasks,
    designDecisions: notes.designDecisions,
    currentPhase,
    completedPhases,
  };
};

/**
 * コンテキストをフォーマット（ガイダンスメッセージ用）
 */
export const formatContextForGuidance = (context: WorkflowContext): string => {
  const lines: string[] = [];

  // 完了フェーズ
  if (context.completedPhases.length > 0) {
    lines.push("### 完了フェーズ");
    lines.push("");
    lines.push(context.completedPhases.join(" → "));
    lines.push("");
  }

  // 最近のコミット
  if (context.commits.length > 0) {
    lines.push("### 最近のコミット");
    lines.push("");
    for (const commit of context.commits.slice(0, 10)) {
      lines.push(`- \`${commit.hash}\`: ${commit.message}`);
    }
    lines.push("");
  }

  // PRフィードバック
  if (context.prComments.length > 0) {
    lines.push("### PRフィードバック");
    lines.push("");
    for (const comment of context.prComments.slice(0, 5)) {
      const preview =
        comment.body.length > 100
          ? `${comment.body.slice(0, 100)}...`
          : comment.body;
      const type = comment.isReviewComment ? "[Review]" : "[Comment]";
      lines.push(`- ${type} @${comment.author}: ${preview}`);
    }
    lines.push("");
  }

  // 設計判断
  if (context.designDecisions.length > 0) {
    lines.push("### 設計判断");
    lines.push("");
    for (const decision of context.designDecisions) {
      lines.push(`- ${decision}`);
    }
    lines.push("");
  }

  // 完了タスク（直近10件）
  if (context.completedTasks.length > 0) {
    lines.push("### 完了タスク（直近）");
    lines.push("");
    for (const task of context.completedTasks.slice(-10)) {
      lines.push(`- [x] ${task.what}`);
    }
    lines.push("");
  }

  return lines.join("\n");
};
