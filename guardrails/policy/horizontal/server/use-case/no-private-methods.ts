/**
 * @what UseCaseImplクラスでのプライベートメソッド禁止チェック
 * @why executeメソッド内で全体の流れを書き切り、追跡容易性を高めるため
 * @failure UseCaseImplクラスにexecute以外のメソッドがある場合にエラー
 *
 * @concept executeメソッドで書き切る
 *
 * **原則**: executeメソッド内で全体の流れを書き切り、プライベートメソッドに分割しない。
 *
 * **理由:**
 * - **全体像の把握**: executeメソッドを読むだけでユースケース全体の流れが理解できる
 * - **追跡容易性**: ロジックが一箇所に集約され、デバッグ・修正が容易
 * - **単一責任原則**: 1ユースケース = 1ユーザーアクション = 1メソッド
 * - **AI支援の恩恵**: LLMがexecuteメソッド全体を一度に理解・修正可能
 *
 * **複雑になる場合の対処法:**
 * executeメソッドが長くなる場合は、**ドメインモデルのメソッドに抽出**する。
 *
 * @example-good
 * ```typescript
 * export class CreateProjectUseCaseImpl implements CreateProjectUseCase {
 *   readonly #props: CreateProjectUseCaseProps;
 *
 *   constructor(props: CreateProjectUseCaseProps) {
 *     this.#props = props;
 *   }
 *
 *   async execute(input: CreateProjectUseCaseInput): Promise<CreateProjectUseCaseResult> {
 *     // executeメソッド内で全体の流れを書き切る
 *     const { projectRepository, fetchNow } = this.#props;
 *     const projectId = projectRepository.projectId();
 *     const now = dateToIsoString(fetchNow());
 *
 *     const newProject = Project.from({ ... });
 *     const saveResult = await projectRepository.save({ project: newProject });
 *     if (saveResult.isErr()) {
 *       return Result.err(saveResult.error);
 *     }
 *
 *     return Result.ok(newProject);
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * export class CreateProjectUseCaseImpl implements CreateProjectUseCase {
 *   async execute(input: CreateProjectUseCaseInput) {
 *     const colorResult = await this.#validateColor(input.color);  // ❌
 *     const project = this.#createProjectEntity(input, colorResult.data);  // ❌
 *     return await this.#saveProject(project);  // ❌
 *   }
 *
 *   async #validateColor(color: string) { ... }  // ❌ プライベートメソッド
 *   #createProjectEntity(input, color) { ... }  // ❌ プライベートメソッド
 *   async #saveProject(project) { ... }  // ❌ プライベートメソッド
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /-use-case\.ts$/,

  visitor: (node, ctx) => {
    // UseCaseImplクラスをチェック
    if (!ts.isClassDeclaration(node)) return;

    const className = node.name?.text;
    if (className === undefined || !className.endsWith("UseCaseImpl")) return;

    // クラスメンバーをチェック
    for (const member of node.members) {
      // メソッドのみチェック
      if (!ts.isMethodDeclaration(member)) continue;

      // executeメソッドは許可
      const methodName = member.name !== undefined && ts.isIdentifier(member.name) ? member.name.text : "";
      if (methodName === "execute") continue;

      // execute以外のメソッドはエラー
      ctx.report(
        member,
        `UseCaseImplクラス "${className}" に execute 以外のメソッド "${methodName}" があります。\n` +
          "■ executeメソッド内で全体の流れを書き切ってください。\n" +
          "■ 複雑になる場合は、ドメインモデルのメソッドに抽出してください。\n" +
          "■ プライベートメソッドは禁止されています。"
      );
    }
  },
});
