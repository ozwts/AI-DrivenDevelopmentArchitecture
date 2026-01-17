/**
 * @what 不変条件の配置基準（検証場所の判断）
 * @why 不変条件を適切な層で検証することで、責務を明確化しテスト容易性を高める
 * @failure 不変条件が不適切な層で実装されている場合にエラー
 *
 * @concept 不変条件チェックの配置基準
 *
 * | 不変条件の種類             | 実装場所     | 例                                             |
 * |----------------------------|--------------|------------------------------------------------|
 * | 単一VO内で完結する不変条件 | Value Object | 状態遷移ルール、会社ドメインのみEmail、年齢制限 |
 * | 複数の値の関係性           | Entity/from() | 完了TODOは期限必須、ステータスと完了日の整合性 |
 * | 外部依存する不変条件       | UseCase層    | プロジェクト存在チェック、権限チェック          |
 *
 * **Value Object（単一VO内で完結）:**
 * - `canTransitionTo(newStatus)` - 状態遷移ルール
 * - `from()` でのドメイン固有バリデーション
 *
 * **Entity/from()（複数値の関係性）:**
 * - `status.isCompleted() && completedAt === undefined` → エラー
 * - `startDate > endDate` → エラー
 *
 * **UseCase（外部依存）:**
 * - `projectRepository.findById()` で存在チェック
 * - `authService.hasPermission()` で権限チェック
 *
 * @example-good
 * ```typescript
 * // Value Object: 単一VO内で完結する不変条件
 * export class AttachmentStatus {
 *   canTransitionTo(to: AttachmentStatus): Result<void, DomainError> {
 *     // PREPARED -> UPLOADED のみ許可
 *     if (this.isPrepared() && to.isUploadCompleted()) {
 *       return Result.ok(undefined);
 *     }
 *     return Result.err(new DomainError("無効な状態遷移"));
 *   }
 * }
 *
 * // Entity/from(): 複数値の関係性
 * export class Todo {
 *   static from(props: TodoProps): Result<Todo, DomainError> {
 *     // 複数フィールドの関係性チェック
 *     if (props.status.isCompleted() && props.completedAt === undefined) {
 *       return Result.err(new DomainError("完了済みTODOには完了日時が必要"));
 *     }
 *     return Result.ok(new Todo(props));
 *   }
 * }
 *
 * // UseCase: 外部依存する不変条件
 * const projectResult = await projectRepository.findById({ id: input.projectId });
 * if (!projectResult.success || !projectResult.data) {
 *   return Result.err(new NotFoundError("プロジェクトが見つかりません"));
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * // ❌ Entity内で単一VOの不変条件チェック（VOに委譲すべき）
 * export class Todo {
 *   approve(updatedAt: string): Result<Todo, DomainError> {
 *     if (this.status.isCompleted()) {
 *       return Result.err(new DomainError("完了済みは変更不可"));
 *       // ❌ これはstatus.canTransitionTo()に委譲すべき
 *     }
 *     return Result.ok(new Todo({ ...this, status: TodoStatus.approved() }));
 *   }
 * }
 *
 * // ❌ VO内で外部依存する不変条件（UseCase層でやるべき）
 * export class ProjectId {
 *   static async from(props: { projectId: string }): Promise<Result<ProjectId, DomainError>> {
 *     const exists = await projectRepository.exists({ id: props.projectId });
 *     if (!exists) {
 *       return Result.err(new DomainError("プロジェクトが存在しません"));
 *       // ❌ 外部依存はUseCase層の責務
 *     }
 *   }
 * }
 *
 * // ❌ Domain層でDB参照（外部依存）
 * export class Todo {
 *   static from(props: TodoProps, projectRepo: ProjectRepository): Promise<Result<...>> {
 *     const project = await projectRepo.findById({ id: props.projectId });
 *     // ❌ リポジトリ依存はUseCase層の責務
 *   }
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../ast-checker";

// 外部依存を示唆する型名パターン
const EXTERNAL_DEPENDENCY_PATTERNS = [
  /Repository$/,
  /Service$/,
  /Client$/,
  /Gateway$/,
  /Adapter$/,
  /Port$/,
  /Api$/,
  /Provider$/,
];

export const policyCheck = createASTChecker({
  filePattern: /\.(entity|vo)\.ts$/,

  visitor: (node, ctx) => {
    // 1. メソッド引数に外部依存型が含まれていないかチェック
    if (ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node)) {
      const params = node.parameters;

      for (const param of params) {
        if (param.type === undefined) continue;

        const typeText = param.type.getText();

        // 外部依存型が引数に含まれている場合
        for (const pattern of EXTERNAL_DEPENDENCY_PATTERNS) {
          if (pattern.test(typeText)) {
            const methodName = ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)
              ? node.name.text
              : "constructor";

            ctx.report(
              param,
              `メソッド "${methodName}" の引数に外部依存型 "${typeText}" が含まれています。\n` +
                "■ 外部依存する不変条件はUseCase層で検証してください。\n" +
                "■ Domain層は外部依存ゼロを維持します。"
            );
            break;
          }
        }
      }
    }

    // 2. async/awaitがEntity/VO内で使用されていないかチェック（全メソッド対象）
    if (ts.isMethodDeclaration(node)) {
      if (!ts.isIdentifier(node.name)) return;

      const methodName = node.name.text;

      // asyncキーワードがあるかチェック
      const isAsync = node.modifiers?.some(
        (mod) => mod.kind === ts.SyntaxKind.AsyncKeyword
      );

      if (isAsync === true) {
        ctx.report(
          node,
          `メソッド "${methodName}" がasyncです。\n` +
            "■ Domain層（Entity/VO）は外部依存ゼロを維持し、同期的に動作すべきです。\n" +
            "■ 非同期処理が必要な場合はUseCase層で実装してください。"
        );
      }

      // 3. 戻り値型にPromiseが含まれていないかチェック
      if (node.type !== undefined) {
        const returnTypeText = node.type.getText();
        if (/Promise/.test(returnTypeText)) {
          ctx.report(
            node,
            `メソッド "${methodName}" の戻り値型にPromiseが含まれています。\n` +
              "■ Domain層（Entity/VO）は同期的に動作すべきです。\n" +
              "■ 非同期処理が必要な場合はUseCase層で実装してください。"
          );
        }
      }

      // 4. メソッドボディ内にawaitが含まれていないかチェック
      if (node.body !== undefined) {
        const bodyText = node.body.getText();
        if (/\bawait\b/.test(bodyText)) {
          ctx.report(
            node,
            `メソッド "${methodName}" 内でawaitが使用されています。\n` +
              "■ Domain層（Entity/VO）は外部依存ゼロを維持し、同期的に動作すべきです。\n" +
              "■ 非同期処理が必要な場合はUseCase層で実装してください。"
          );
        }
      }
    }

    // 5. クラスプロパティに外部依存型が含まれていないかチェック
    if (ts.isPropertyDeclaration(node)) {
      if (node.type === undefined) return;

      const typeText = node.type.getText();
      const propName = ts.isIdentifier(node.name) ? node.name.text : "property";

      for (const pattern of EXTERNAL_DEPENDENCY_PATTERNS) {
        if (pattern.test(typeText)) {
          ctx.report(
            node,
            `プロパティ "${propName}" に外部依存型 "${typeText}" が含まれています。\n` +
              "■ Domain層（Entity/VO）は外部依存ゼロを維持します。\n" +
              "■ 外部サービスへの参照はUseCase層で注入してください。"
          );
          break;
        }
      }
    }
  },
});
