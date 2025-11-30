import { UnexpectedError } from "@/util/error-util";
import type { TodoRepository } from "@/domain/model/todo/todo.repository";
import type { StorageClient } from "@/domain/support/storage-client";
import type { Logger } from "@/domain/support/logger";
import { Result } from "@/util/result";
import type { UseCase } from "../interfaces";

export type DeleteTodoUseCaseInput = {
  todoId: string;
};

export type DeleteTodoUseCaseOutput = void;

export type DeleteTodoUseCaseException = UnexpectedError;

export type DeleteTodoUseCaseResult = Result<
  DeleteTodoUseCaseOutput,
  DeleteTodoUseCaseException
>;

export type DeleteTodoUseCaseProps = {
  readonly todoRepository: TodoRepository;
  readonly storageClient: StorageClient;
  readonly logger: Logger;
};

export type DeleteTodoUseCase = UseCase<
  DeleteTodoUseCaseInput,
  DeleteTodoUseCaseOutput,
  DeleteTodoUseCaseException
>;

export class DeleteTodoUseCaseImpl implements DeleteTodoUseCase {
  readonly #props: DeleteTodoUseCaseProps;

  constructor(props: DeleteTodoUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: DeleteTodoUseCaseInput,
  ): Promise<DeleteTodoUseCaseResult> {
    const { todoRepository, storageClient, logger } = this.#props;

    logger.debug("use-case: delete-todo-use-case", {
      todoId: input.todoId,
    });

    // TODOを取得
    const todoResult = await todoRepository.findById({
      id: input.todoId,
    });

    if (todoResult.isErr()) {
      logger.error("TODO取得に失敗", todoResult.error);
      return Result.err(todoResult.error);
    }

    if (todoResult.data === undefined) {
      // TODOが存在しない場合も成功として扱う（冪等性）
      logger.info("TODOが存在しないため削除をスキップ", {
        todoId: input.todoId,
      });
      return Result.ok(undefined);
    }

    const todo = todoResult.data;

    // 添付ファイルをS3から削除
    // 順次削除することで、エラー時に即座に処理を中断し、詳細なログを記録する
    for (const attachment of todo.attachments) {
      // eslint-disable-next-line no-await-in-loop
      const deleteResult = await storageClient.deleteObject({
        key: attachment.storageKey,
      });

      if (deleteResult.isErr()) {
        logger.error("S3からの添付ファイル削除に失敗", {
          todoId: input.todoId,
          attachmentId: attachment.id,
          storageKey: attachment.storageKey,
          error: deleteResult.error,
        });
        return Result.err(deleteResult.error);
      }

      logger.debug("添付ファイルをS3から削除", {
        todoId: input.todoId,
        attachmentId: attachment.id,
        storageKey: attachment.storageKey,
      });
    }

    // TODOをDBから削除
    const removeResult = await todoRepository.remove({
      id: input.todoId,
    });

    if (removeResult.isErr()) {
      logger.error("TODO削除に失敗", removeResult.error);
      return Result.err(removeResult.error);
    }

    logger.info("TODO削除完了", {
      todoId: input.todoId,
      attachmentsCount: todo.attachments.length,
    });

    return Result.ok(undefined);
  }
}
