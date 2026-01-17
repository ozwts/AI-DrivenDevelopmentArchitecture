/**
 * @what テストでResult型を正しくチェックすることを強制
 * @why Result型のsuccessをチェックせずにdataにアクセスすると、エラー時にテストが不正確になるため
 * @failure result.successをチェックせずにresult.dataにアクセスしている場合にエラー
 *
 * @concept Result型の正しいチェック
 *
 * **理由**:
 * - Result型はsuccessまたはisOk()でチェックしてから、dataまたはerrorにアクセスする
 * - チェックなしでdataにアクセスすると、型ガードが効かず、エラー時の動作が不明確
 *
 * @example-good
 * ```typescript
 * // ✅ Good: successをチェックしてからdataにアクセス
 * const result = await useCase.execute({ name: "test" });
 * expect(result.success).toBe(true);
 * if (result.success) {
 *   expect(result.data.name).toBe("test");
 * }
 *
 * // ✅ Good: isOk()をチェックしてからdataにアクセス
 * const result = await useCase.execute({ name: "test" });
 * expect(result.isOk()).toBe(true);
 * if (result.isOk()) {
 *   expect(result.data.name).toBe("test");
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * // ❌ Bad: successをチェックせずにdataにアクセス
 * const result = await useCase.execute({ name: "test" });
 * expect(result.data.name).toBe("test");  // ❌ result.successのチェックがない
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../ast-checker";

/**
 * result.success または result.isOk() のチェックがあるか
 */
const hasResultSuccessCheck = (
  resultVarName: string,
  containingBlock: ts.Node
): boolean => {
  let hasCheck = false;

  const visit = (node: ts.Node): void => {
    // result.success パターン
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === resultVarName &&
      ts.isIdentifier(node.name) &&
      node.name.text === "success"
    ) {
      hasCheck = true;
    }

    // result.isOk() パターン
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === resultVarName &&
      ts.isIdentifier(node.expression.name) &&
      node.expression.name.text === "isOk"
    ) {
      hasCheck = true;
    }

    // result.isErr() パターン
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === resultVarName &&
      ts.isIdentifier(node.expression.name) &&
      node.expression.name.text === "isErr"
    ) {
      hasCheck = true;
    }

    ts.forEachChild(node, visit);
  };

  visit(containingBlock);
  return hasCheck;
};

/**
 * if (result.success) { ... } または if (result.isOk()) { ... } の内部か
 */
const isInsideSuccessCheck = (node: ts.Node, resultVarName: string): boolean => {
  let currentNode: ts.Node | undefined = node;

  while (currentNode !== undefined) {
    // IfStatement
    if (ts.isIfStatement(currentNode)) {
      const condition = currentNode.expression;

      // result.success
      if (
        ts.isPropertyAccessExpression(condition) &&
        ts.isIdentifier(condition.expression) &&
        condition.expression.text === resultVarName &&
        ts.isIdentifier(condition.name) &&
        condition.name.text === "success"
      ) {
        return true;
      }

      // result.isOk()
      if (
        ts.isCallExpression(condition) &&
        ts.isPropertyAccessExpression(condition.expression) &&
        ts.isIdentifier(condition.expression.expression) &&
        condition.expression.expression.text === resultVarName &&
        ts.isIdentifier(condition.expression.name) &&
        condition.expression.name.text === "isOk"
      ) {
        return true;
      }
    }

    currentNode = currentNode.parent;
  }

  return false;
};

export const policyCheck = createASTChecker({
  // テストファイルのみをチェック
  filePattern: /\.test\.ts$/,

  visitor: (node, ctx) => {
    const { fileName } = ctx.sourceFile;

    // application/use-case 配下のテストファイルのみ対象
    if (!fileName.includes("/application/use-case/")) return;

    // result.data へのアクセスを検出
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!ts.isPropertyAccessExpression(node)) return;

    // result.data かチェック
    if (
      !ts.isIdentifier(node.expression) ||
      !ts.isIdentifier(node.name) ||
      node.name.text !== "data"
    ) {
      return;
    }

    const resultVarName = node.expression.text;

    // result.success または result.isOk() のチェックがあるか
    const containingBlock = node.parent;
    if (containingBlock === undefined) return;

    // if (result.success) { ... } 内部かチェック
    if (isInsideSuccessCheck(node, resultVarName)) {
      return; // OK
    }

    // 同じブロック内にresult.successチェックがあるか
    if (hasResultSuccessCheck(resultVarName, containingBlock)) {
      return; // OK
    }

    ctx.report(
      node,
      `Result型の"${resultVarName}.data"に、successまたはisOk()のチェックなしでアクセスしています。\n` +
        "■ ❌ Bad: expect(result.data.name).toBe(\"test\");  // successチェックなし\n" +
        "■ ✅ Good:\n" +
        "  expect(result.success).toBe(true);\n" +
        "  if (result.success) {\n" +
        "    expect(result.data.name).toBe(\"test\");\n" +
        "  }\n" +
        "■ 理由: Result型は型ガードでチェックしてからdata/errorにアクセスする必要があります。"
    );
  },
});
