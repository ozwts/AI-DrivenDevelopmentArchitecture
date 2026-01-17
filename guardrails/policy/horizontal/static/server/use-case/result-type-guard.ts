/**
 * @what Result型のチェックにisOk()/isErr()型ガードを使用しているか検証
 * @why .successプロパティでは型推論が効かず、非nullアサーションが必要になるため
 * @failure result.successを検出した場合にエラー
 *
 * @concept Result型の型ガード使用
 *
 * Result型のエラーチェックは`isOk()` / `isErr()`型ガードメソッドを使用する。
 *
 * **理由:**
 * - **型安全性**: `isErr()`後は`error`が必ず存在、`isOk()`後は`data`が必ず存在
 * - **非nullアサーション不要**: `result.error!`のような`!`が不要
 * - **コード可読性**: 意図が明確になる
 *
 * @example-good
 * ```typescript
 * export class UpdateProjectUseCaseImpl implements UpdateProjectUseCase {
 *   async execute(input: UpdateProjectUseCaseInput): Promise<UpdateProjectUseCaseResult> {
 *     const findResult = await this.#props.projectRepository.findById({
 *       id: input.projectId,
 *     });
 *
 *     // ✅ isErr()型ガードでエラーチェック
 *     if (findResult.isErr()) {
 *       // findResult.error は E 型として推論される（非nullアサーション不要）
 *       return Result.err(findResult.error);
 *     }
 *
 *     // findResult.data は T 型として推論される
 *     const project = findResult.data;
 *
 *     // ✅ isOk()型ガードで成功チェック
 *     if (updateResult.isOk()) {
 *       return Result.ok(updateResult.data);
 *     }
 *
 *     return Result.err(updateResult.error);
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * export class UpdateProjectUseCaseImpl implements UpdateProjectUseCase {
 *   async execute(input: UpdateProjectUseCaseInput) {
 *     const findResult = await this.#props.projectRepository.findById({
 *       id: input.projectId,
 *     });
 *
 *     // ❌ successプロパティでエラーチェック
 *     if (!findResult.success) {
 *       return Result.err(findResult.error!); // ❌ 非nullアサーション必要
 *     }
 *
 *     // ❌ successプロパティで成功チェック
 *     if (updateResult.success) {
 *       return Result.ok(updateResult.data!); // ❌ 非nullアサーション必要
 *     }
 *
 *     return Result.err(updateResult.error!);
 *   }
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /-use-case\.ts$/,

  visitor: (node, ctx) => {
    // PropertyAccessExpression（obj.propertyアクセス）をチェック
    if (!ts.isPropertyAccessExpression(node)) return;

    const { fileName } = ctx.sourceFile;

    // テストファイル、ダミーファイルは除外
    if (fileName.includes(".test.") || fileName.includes(".dummy.")) {
      return;
    }

    // .success プロパティアクセスをチェック
    if (node.name.text !== "success") return;

    // 親ノードをチェック - if文の条件式内で使用されているか
    const { parent } = node;
    if (parent === undefined) return;

    // PrefixUnaryExpression（!演算子）またはBinaryExpression（比較演算子）の一部か
    const isInCondition =
      ts.isPrefixUnaryExpression(parent) ||
      ts.isBinaryExpression(parent) ||
      ts.isIfStatement(parent) ||
      ts.isConditionalExpression(parent);

    if (!isInCondition) return;

    // result.successパターンを検出
    // 変数名が *Result で終わるかチェック
    if (ts.isIdentifier(node.expression)) {
      const varName = node.expression.text;
      if (varName.endsWith("Result") || varName.includes("result")) {
        ctx.report(
          node,
          `Result型のチェックに.successプロパティを使用しています: "${varName}.success"\n` +
            "■ ❌ Bad: if (!result.success) { return Result.err(result.error!); }\n" +
            "■ ✅ Good: if (result.isErr()) { return Result.err(result.error); }\n" +
            "■ 理由: isOk()/isErr()型ガードにより、非nullアサーション(!)が不要になります。"
        );
      }
    }
  },
});
