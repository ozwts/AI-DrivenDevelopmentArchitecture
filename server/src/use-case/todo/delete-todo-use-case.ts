import type { Result } from "@/util/result";
import type { UnexpectedError } from "@/util/error-util";
import type { TodoRepository } from "@/domain/model/todo/todo-repository";
import type { StorageClient } from "@/domain/support/storage-client";
import type { Logger } from "@/domain/support/logger";

export type DeleteTodoUseCaseInput = {
  todoId: string;
};

export type DeleteTodoUseCaseOutput = Result<void, UnexpectedError>;

export type DeleteTodoUseCase = {
  execute(input: DeleteTodoUseCaseInput): Promise<DeleteTodoUseCaseOutput>;
};

export type DeleteTodoUseCaseProps = {
  todoRepository: TodoRepository;
  storageClient: StorageClient;
  logger: Logger;
};

export class DeleteTodoUseCaseImpl implements DeleteTodoUseCase {
  readonly #todoRepository: TodoRepository;

  readonly #storageClient: StorageClient;

  readonly #logger: Logger;

  constructor({
    todoRepository,
    storageClient,
    logger,
  }: DeleteTodoUseCaseProps) {
    this.#todoRepository = todoRepository;
    this.#storageClient = storageClient;
    this.#logger = logger;
  }

  async execute(
    input: DeleteTodoUseCaseInput,
  ): Promise<DeleteTodoUseCaseOutput> {
    this.#logger.debug("use-case: delete-todo-use-case", {
      todoId: input.todoId,
    });

    // TODOを取得
    const todoResult = await this.#todoRepository.findById({
      id: input.todoId,
    });

    if (!todoResult.success) {
      this.#logger.error("TODO取得に失敗", todoResult.error);
      return todoResult;
    }

    if (todoResult.data === undefined) {
      // TODOが存在しない場合も成功として扱う（冪等性）
      this.#logger.info("TODOが存在しないため削除をスキップ", {
        todoId: input.todoId,
      });
      return {
        success: true,
        data: undefined,
      };
    }

    const todo = todoResult.data;

    // 添付ファイルをS3から削除
    // 順次削除することで、エラー時に即座に処理を中断し、詳細なログを記録する
    for (const attachment of todo.attachments) {
      // eslint-disable-next-line no-await-in-loop
      const deleteResult = await this.#storageClient.deleteObject({
        key: attachment.storageKey,
      });

      if (!deleteResult.success) {
        this.#logger.error("S3からの添付ファイル削除に失敗", {
          todoId: input.todoId,
          attachmentId: attachment.id,
          storageKey: attachment.storageKey,
          error: deleteResult.error,
        });
        return deleteResult;
      }

      this.#logger.debug("添付ファイルをS3から削除", {
        todoId: input.todoId,
        attachmentId: attachment.id,
        storageKey: attachment.storageKey,
      });
    }

    // TODOをDBから削除
    const removeResult = await this.#todoRepository.remove({
      id: input.todoId,
    });

    if (!removeResult.success) {
      this.#logger.error("TODO削除に失敗", removeResult.error);
      return removeResult;
    }

    this.#logger.info("TODO削除完了", {
      todoId: input.todoId,
      attachmentsCount: todo.attachments.length,
    });

    return {
      success: true,
      data: undefined,
    };
  }
}
