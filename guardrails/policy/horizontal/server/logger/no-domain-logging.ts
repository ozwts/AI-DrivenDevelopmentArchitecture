/**
 * @what ドメイン層（domain/model/）でのLogger使用を禁止
 * @why ドメインモデルは純粋なビジネスルールを表現し、ログ出力のような副作用を持たないため
 * @failure domain/model/配下でlogger.*の呼び出しを検出した場合にエラー
 *
 * @concept ドメイン層の純粋性
 *
 * ドメインモデル（Entity, ValueObject）は純粋なビジネスルールを表現する。
 * ログ出力はUseCase層、Handler層、Repository層の責務。
 *
 * **レイヤー別ログ出力責務:**
 * | レイヤー | ログ出力 |
 * |---------|---------|
 * | Handler | ○ |
 * | UseCase | ○ |
 * | Repository | ○ |
 * | Domain | × |
 *
 * @example-good
 * ```typescript
 * // UseCase層でログ出力
 * class CreateTodoUseCase {
 *   execute(input: Input) {
 *     this.#logger.info("TODO作成開始", { title: input.title });
 *     const todo = TodoEntity.create({ ... });
 *     this.#logger.info("TODO作成完了", { todoId: todo.id });
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * // ドメイン層でログ出力（NG）
 * class TodoEntity {
 *   complete() {
 *     this.#logger.info("TODO完了"); // ❌ ドメイン層はログ出力しない
 *     this.#status = "completed";
 *   }
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../ast-checker";

// loggerメソッド名のリスト
const LOGGER_METHODS = ["debug", "info", "warn", "error", "appendKeys"];

export const policyCheck = createASTChecker({
  // domain/model/配下のファイルを対象
  filePattern: /\/domain\/model\/.*\.ts$/,

  visitor: (node, ctx) => {
    const { fileName } = ctx.sourceFile;

    // テストファイル、ダミーファイルは除外
    if (
      fileName.includes(".test.") ||
      fileName.includes(".dummy.") ||
      fileName.includes("dummy.ts")
    ) {
      return;
    }

    // CallExpression（関数呼び出し）をチェック
    if (ts.isCallExpression(node)) {
      const expression = node.expression;

      // xxx.logger.info() または this.#logger.info() の形式をチェック
      if (ts.isPropertyAccessExpression(expression)) {
        const method = expression.name.text;
        const object = expression.expression;

        // logger.xxx() の形式
        if (ts.isIdentifier(object) && object.text === "logger") {
          if (LOGGER_METHODS.includes(method)) {
            ctx.report(
              node,
              `ドメイン層でのログ出力は禁止です: logger.${method}()\n` +
                "■ ❌ Bad: ドメインモデル内でlogger.info(...)\n" +
                "■ ✅ Good: UseCase層またはRepository層でログ出力\n" +
                "■ 理由: ドメインモデルは純粋なビジネスルールを表現し、副作用を持ちません。"
            );
          }
        }

        // this.#logger.xxx() または this.logger.xxx() の形式
        if (ts.isPropertyAccessExpression(object)) {
          const innerProp = object.name.text;
          if (
            (innerProp === "logger" || innerProp === "#logger") &&
            LOGGER_METHODS.includes(method)
          ) {
            ctx.report(
              node,
              `ドメイン層でのログ出力は禁止です: ${innerProp}.${method}()\n` +
                "■ ❌ Bad: ドメインモデル内でthis.#logger.info(...)\n" +
                "■ ✅ Good: UseCase層またはRepository層でログ出力\n" +
                "■ 理由: ドメインモデルは純粋なビジネスルールを表現し、副作用を持ちません。"
            );
          }
        }

        // #logger.xxx() の形式（private field直接アクセス）
        if (ts.isPrivateIdentifier(object) && object.text === "#logger") {
          if (LOGGER_METHODS.includes(method)) {
            ctx.report(
              node,
              `ドメイン層でのログ出力は禁止です: #logger.${method}()\n` +
                "■ ❌ Bad: ドメインモデル内で#logger.info(...)\n" +
                "■ ✅ Good: UseCase層またはRepository層でログ出力\n" +
                "■ 理由: ドメインモデルは純粋なビジネスルールを表現し、副作用を持ちません。"
            );
          }
        }
      }
    }
  },
});
