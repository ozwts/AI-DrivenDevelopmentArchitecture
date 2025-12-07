import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { UnitOfWorkRunner } from "@/application/port/unit-of-work";
import type { Logger } from "@/application/port/logger";
import { Result } from "@/util/result";
import { DynamoDBUnitOfWork } from "./dynamodb-unit-of-work";

export type DynamoDBUnitOfWorkRunnerProps = {
  ddbDoc: DynamoDBDocumentClient;
  logger: Logger;
};

/**
 * DynamoDB Unit of Work Runner implementation
 *
 * トランザクション境界を管理し、自動的にコミット/ロールバックを行う
 *
 * - コールバックはResult型を返す
 * - Result.ok()の場合のみコミット
 * - Result.err()の場合はロールバック
 *
 * @example
 * ```typescript
 * const runner = new DynamoDBUnitOfWorkRunner({ ddbDoc, logger });
 *
 * const result = await runner.run(async (uow) => {
 *   const saveResult = await todoRepository.save(todo, uow);
 *   if (saveResult.isErr()) {
 *     return saveResult;  // エラー時はロールバック
 *   }
 *   return Result.ok({ todo });  // 成功時はコミット
 * });
 * ```
 */
export class DynamoDBUnitOfWorkRunner<TUoW> implements UnitOfWorkRunner<TUoW> {
  readonly #ddbDoc: DynamoDBDocumentClient;

  readonly #logger: Logger;

  readonly #createUowContext: (uow: DynamoDBUnitOfWork) => TUoW;

  constructor(
    { ddbDoc, logger }: DynamoDBUnitOfWorkRunnerProps,
    createUowContext: (uow: DynamoDBUnitOfWork) => TUoW,
  ) {
    this.#ddbDoc = ddbDoc;
    this.#logger = logger;
    this.#createUowContext = createUowContext;
  }

  async run<TOutput, TError extends Error>(
    callback: (uow: TUoW) => Promise<Result<TOutput, TError>>,
  ): Promise<Result<TOutput, TError>> {
    const uow = new DynamoDBUnitOfWork(this.#logger);
    const context = this.#createUowContext(uow);

    this.#logger.debug("トランザクションを開始しました");

    // コールバックを実行
    const result = await callback(context);

    if (result.isErr()) {
      // エラー時はロールバック（操作をクリア）
      uow.rollback();
      this.#logger.debug("トランザクションが失敗しました。ロールバックします");
      return result;
    }

    // 成功時は自動的にコミット
    await uow.commit(this.#ddbDoc);

    this.#logger.debug("トランザクションのコミットに成功しました");

    return result;
  }
}
