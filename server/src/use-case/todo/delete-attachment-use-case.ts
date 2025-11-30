import { UnexpectedError, NotFoundError } from "@/util/error-util";
import type { TodoRepository } from "@/domain/model/todo/todo.repository";
import type { StorageClient } from "@/domain/support/storage-client";
import type { FetchNow } from "@/domain/support/fetch-now";
import type { Logger } from "@/domain/support/logger";
import { Result } from "@/util/result";
import { dateToIsoString } from "@/util/date-util";
import type { UseCase } from "../interfaces";

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
  readonly todoRepository: TodoRepository;
  readonly storageClient: StorageClient;
  readonly fetchNow: FetchNow;
  readonly logger: Logger;
};

export type DeleteAttachmentUseCase = UseCase<
  DeleteAttachmentUseCaseInput,
  DeleteAttachmentUseCaseOutput,
  DeleteAttachmentUseCaseException
>;

export class DeleteAttachmentUseCaseImpl implements DeleteAttachmentUseCase {
  readonly #props: DeleteAttachmentUseCaseProps;

  constructor(props: DeleteAttachmentUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: DeleteAttachmentUseCaseInput,
  ): Promise<DeleteAttachmentUseCaseResult> {
    const { todoRepository, storageClient, fetchNow, logger } = this.#props;

    logger.debug("use-case: delete-attachment-use-case", {
      todoId: input.todoId,
      attachmentId: input.attachmentId,
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
      logger.error("TODOが見つかりません", { todoId: input.todoId });
      return Result.err(new NotFoundError("TODOが見つかりません"));
    }

    const todo = todoResult.data;

    // Attachmentを検索
    const attachment = todo.attachments.find(
      (a) => a.id === input.attachmentId,
    );

    if (attachment === undefined) {
      logger.error("添付ファイルが見つかりません", {
        todoId: input.todoId,
        attachmentId: input.attachmentId,
      });
      return Result.err(new NotFoundError("添付ファイルが見つかりません"));
    }

    // S3からファイルを削除
    const deleteResult = await storageClient.deleteObject({
      key: attachment.storageKey,
    });

    if (deleteResult.isErr()) {
      logger.error("S3オブジェクト削除に失敗", deleteResult.error);
      return Result.err(deleteResult.error);
    }

    const now = dateToIsoString(fetchNow());

    // Todoから添付ファイルを削除
    const updatedTodo = todo.detach(input.attachmentId, now);

    // 保存
    const saveResult = await todoRepository.save({ todo: updatedTodo });

    if (saveResult.isErr()) {
      logger.error("TODO保存に失敗", saveResult.error);
      return Result.err(saveResult.error);
    }

    logger.info("添付ファイル削除完了", {
      todoId: input.todoId,
      attachmentId: input.attachmentId,
    });

    return Result.ok(undefined);
  }
}
