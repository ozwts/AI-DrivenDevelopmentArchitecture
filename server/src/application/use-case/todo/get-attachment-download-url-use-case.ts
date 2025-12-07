import { UnexpectedError, NotFoundError } from "@/util/error-util";
import type { TodoRepository } from "@/domain/model/todo/todo.repository";
import type { StorageClient } from "@/application/port/storage-client";
import type { Logger } from "@/application/port/logger";
import { Result } from "@/util/result";
import type { UseCase } from "../interfaces";

export type GetAttachmentDownloadUrlUseCaseInput = {
  todoId: string;
  attachmentId: string;
};

export type GetAttachmentDownloadUrlUseCaseOutput = {
  downloadUrl: string;
  fileName: string;
  contentType: string;
  fileSize: number;
};

export type GetAttachmentDownloadUrlUseCaseException =
  | UnexpectedError
  | NotFoundError;

export type GetAttachmentDownloadUrlUseCaseResult = Result<
  GetAttachmentDownloadUrlUseCaseOutput,
  GetAttachmentDownloadUrlUseCaseException
>;

export type GetAttachmentDownloadUrlUseCaseProps = {
  readonly todoRepository: TodoRepository;
  readonly storageClient: StorageClient;
  readonly logger: Logger;
};

export type GetAttachmentDownloadUrlUseCase = UseCase<
  GetAttachmentDownloadUrlUseCaseInput,
  GetAttachmentDownloadUrlUseCaseOutput,
  GetAttachmentDownloadUrlUseCaseException
>;

export class GetAttachmentDownloadUrlUseCaseImpl
  implements GetAttachmentDownloadUrlUseCase
{
  readonly #props: GetAttachmentDownloadUrlUseCaseProps;

  constructor(props: GetAttachmentDownloadUrlUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: GetAttachmentDownloadUrlUseCaseInput,
  ): Promise<GetAttachmentDownloadUrlUseCaseResult> {
    const { todoRepository, storageClient, logger } = this.#props;

    logger.debug("use-case: get-attachment-download-url-use-case", {
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
      const notFoundError = new NotFoundError("TODOが見つかりません");
      logger.error("TODOが見つかりません", { todoId: input.todoId });
      return Result.err(notFoundError);
    }

    const todo = todoResult.data;

    // Attachmentを検索
    const attachment = todo.attachments.find(
      (a) => a.id === input.attachmentId,
    );

    if (attachment === undefined) {
      const notFoundError = new NotFoundError("添付ファイルが見つかりません");
      logger.error("添付ファイルが見つかりません", {
        todoId: input.todoId,
        attachmentId: input.attachmentId,
      });
      return Result.err(notFoundError);
    }

    // Presigned URLを生成
    const urlResult = await storageClient.generatePresignedDownloadUrl({
      key: attachment.storageKey,
      expiresIn: 1800, // 30分
    });

    if (urlResult.isErr()) {
      logger.error("Presigned URL生成に失敗", urlResult.error);
      return Result.err(urlResult.error);
    }

    logger.info("ダウンロードURL生成完了", {
      todoId: input.todoId,
      attachmentId: input.attachmentId,
    });

    return Result.ok({
      downloadUrl: urlResult.data,
      fileName: attachment.fileName,
      contentType: attachment.contentType,
      fileSize: attachment.fileSize,
    });
  }
}
