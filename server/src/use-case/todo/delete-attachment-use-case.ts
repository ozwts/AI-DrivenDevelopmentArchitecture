import type { Result } from "@/util/result";
import type { UnexpectedError, NotFoundError } from "@/util/error-util";
import type { TodoRepository } from "@/domain/model/todo/todo.repository";
import type { StorageClient } from "@/domain/support/storage-client";
import type { FetchNow } from "@/domain/support/fetch-now";
import type { Logger } from "@/domain/support/logger";
import { dateToIsoString } from "@/util/date-util";

export type DeleteAttachmentUseCaseInput = {
  todoId: string;
  attachmentId: string;
};

export type DeleteAttachmentUseCaseOutput = void;

export type DeleteAttachmentUseCaseException = UnexpectedError | NotFoundError;

export type DeleteAttachmentUseCaseResult = Result<
  DeleteAttachmentUseCaseOutput,
  DeleteAttachmentUseCaseException
>;

export type DeleteAttachmentUseCaseProps = {
  todoRepository: TodoRepository;
  storageClient: StorageClient;
  fetchNow: FetchNow;
  logger: Logger;
};

export type DeleteAttachmentUseCase = {
  execute(
    input: DeleteAttachmentUseCaseInput,
  ): Promise<DeleteAttachmentUseCaseResult>;
};

export class DeleteAttachmentUseCaseImpl implements DeleteAttachmentUseCase {
  readonly #todoRepository: TodoRepository;

  readonly #storageClient: StorageClient;

  readonly #fetchNow: FetchNow;

  readonly #logger: Logger;

  constructor({
    todoRepository,
    storageClient,
    fetchNow,
    logger,
  }: DeleteAttachmentUseCaseProps) {
    this.#todoRepository = todoRepository;
    this.#storageClient = storageClient;
    this.#fetchNow = fetchNow;
    this.#logger = logger;
  }

  async execute(
    input: DeleteAttachmentUseCaseInput,
  ): Promise<DeleteAttachmentUseCaseResult> {
    this.#logger.debug("use-case: delete-attachment-use-case", {
      todoId: input.todoId,
      attachmentId: input.attachmentId,
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
      const notFoundError: NotFoundError = {
        name: "NotFoundError",
        message: "TODOが見つかりません",
      };
      this.#logger.error("TODOが見つかりません", { todoId: input.todoId });
      return {
        success: false,
        error: notFoundError,
      };
    }

    const todo = todoResult.data;

    // Attachmentを検索
    const attachment = todo.attachments.find(
      (a) => a.id === input.attachmentId,
    );

    if (attachment === undefined) {
      const notFoundError: NotFoundError = {
        name: "NotFoundError",
        message: "添付ファイルが見つかりません",
      };
      this.#logger.error("添付ファイルが見つかりません", {
        todoId: input.todoId,
        attachmentId: input.attachmentId,
      });
      return {
        success: false,
        error: notFoundError,
      };
    }

    // S3からファイルを削除
    const deleteResult = await this.#storageClient.deleteObject({
      key: attachment.storageKey,
    });

    if (!deleteResult.success) {
      this.#logger.error("S3オブジェクト削除に失敗", deleteResult.error);
      return deleteResult;
    }

    const now = dateToIsoString(this.#fetchNow());

    // Todoから添付ファイルを削除
    const updatedTodo = todo.removeAttachment(input.attachmentId, now);

    // 保存
    const saveResult = await this.#todoRepository.save({ todo: updatedTodo });

    if (!saveResult.success) {
      this.#logger.error("TODO保存に失敗", saveResult.error);
      return saveResult;
    }

    this.#logger.info("添付ファイル削除完了", {
      todoId: input.todoId,
      attachmentId: input.attachmentId,
    });

    return {
      success: true,
      data: undefined,
    };
  }
}
