import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { UnitOfWorkRunner } from "@/domain/support/unit-of-work";
import type { Logger } from "@/domain/support/logger";
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
 * @example
 * ```typescript
 * const runner = new DynamoDBUnitOfWorkRunner({ ddbDoc, logger });
 *
 * const result = await runner.run(async (uow) => {
 *   await todoRepository.save(todo, uow);
 *   await userRepository.save(user, uow);
 *   return { success: true };
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

  async run<TResult>(
    callback: (uow: TUoW) => Promise<TResult>,
  ): Promise<TResult> {
    const uow = new DynamoDBUnitOfWork(this.#logger);
    const context = this.#createUowContext(uow);

    try {
      this.#logger.debug("トランザクションを開始しました");

      // コールバックを実行
      const result = await callback(context);

      // 成功時は自動的にコミット
      await uow.commit(this.#ddbDoc);

      this.#logger.debug("トランザクションのコミットに成功しました");

      return result;
    } catch (error) {
      // エラー時はロールバック（操作をクリア）
      uow.rollback();
      this.#logger.error(
        "トランザクションが失敗しました。ロールバックします",
        error as Error,
      );
      throw error;
    }
  }
}
