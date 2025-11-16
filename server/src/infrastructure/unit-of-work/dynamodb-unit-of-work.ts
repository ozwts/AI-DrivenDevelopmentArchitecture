import type {
  DynamoDBDocumentClient,
  TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import type { UnitOfWork } from "@/domain/support/unit-of-work";
import type { Logger } from "@/domain/support/logger";

/**
 * TransactWriteCommandInputのTransactItems配列の要素型
 */
type TransactWriteItem = NonNullable<
  TransactWriteCommandInput["TransactItems"]
>[number];

/**
 * DynamoDB Maximum transaction items limit
 * https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html
 */
const MAX_TRANSACTION_ITEMS = 100;

/**
 * DynamoDB Unit of Work implementation
 */
export class DynamoDBUnitOfWork implements UnitOfWork {
  readonly #operations: TransactWriteItem[] = [];

  readonly #logger: Logger;

  constructor(logger: Logger) {
    this.#logger = logger;
  }

  registerOperation(operation: unknown): void {
    const transactWriteItem = operation as TransactWriteItem;

    if (this.#operations.length >= MAX_TRANSACTION_ITEMS) {
      this.#logger.error(
        `DynamoDBトランザクションの制限を超えました: ${MAX_TRANSACTION_ITEMS}`,
      );
      throw new Error(
        `単一トランザクションに${MAX_TRANSACTION_ITEMS}個を超える操作を追加できません`,
      );
    }

    this.#operations.push(transactWriteItem);
  }

  getOperationCount(): number {
    return this.#operations.length;
  }

  /**
   * トランザクションをコミットする
   *
   * @param ddbDoc - DynamoDB Document Client
   */
  async commit(ddbDoc: DynamoDBDocumentClient): Promise<void> {
    if (this.#operations.length === 0) {
      this.#logger.debug("コミットする操作がありません");
      return;
    }

    this.#logger.debug(`${this.#operations.length}個の操作をコミットします`);

    try {
      await ddbDoc.send(
        new TransactWriteCommand({
          TransactItems: this.#operations,
        }),
      );
    } catch (error) {
      this.#logger.error(
        "トランザクションのコミットに失敗しました",
        error as Error,
      );
      throw error;
    }
  }

  /**
   * トランザクションをロールバックする（操作をクリア）
   *
   * Note: DynamoDBはトランザクションがアトミックなので、
   * 明示的なロールバックは不要。失敗時は何も変更されない。
   */
  rollback(): void {
    this.#logger.debug("トランザクションをロールバックします（操作をクリア）");
    this.#operations.length = 0;
  }
}
