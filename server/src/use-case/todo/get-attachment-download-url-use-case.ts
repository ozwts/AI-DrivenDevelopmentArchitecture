import type { Result } from "@/util/result";
import type { UnexpectedError, NotFoundError } from "@/util/error-util";
import type { TodoRepository } from "@/domain/model/todo/todo-repository";
import type { StorageClient } from "@/domain/support/storage-client";
import type { Logger } from "@/domain/support/logger";

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
  todoRepository: TodoRepository;
  storageClient: StorageClient;
  logger: Logger;
};

export type GetAttachmentDownloadUrlUseCase = {
  execute(
    input: GetAttachmentDownloadUrlUseCaseInput,
  ): Promise<GetAttachmentDownloadUrlUseCaseResult>;
};

export class GetAttachmentDownloadUrlUseCaseImpl
  implements GetAttachmentDownloadUrlUseCase
{
  readonly #todoRepository: TodoRepository;

  readonly #storageClient: StorageClient;

  readonly #logger: Logger;

  constructor({
    todoRepository,
    storageClient,
    logger,
  }: GetAttachmentDownloadUrlUseCaseProps) {
    this.#todoRepository = todoRepository;
    this.#storageClient = storageClient;
    this.#logger = logger;
  }

  async execute(
    input: GetAttachmentDownloadUrlUseCaseInput,
  ): Promise<GetAttachmentDownloadUrlUseCaseResult> {
    this.#logger.debug("use-case: get-attachment-download-url-use-case", {
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

    // Presigned URLを生成
    const urlResult = await this.#storageClient.generatePresignedDownloadUrl({
      key: attachment.storageKey,
      expiresIn: 1800, // 30分
    });

    if (!urlResult.success) {
      this.#logger.error("Presigned URL生成に失敗", urlResult.error);
      return urlResult;
    }

    this.#logger.info("ダウンロードURL生成完了", {
      todoId: input.todoId,
      attachmentId: input.attachmentId,
    });

    return {
      success: true,
      data: {
        downloadUrl: urlResult.data,
        fileName: attachment.fileName,
        contentType: attachment.contentType,
        fileSize: attachment.fileSize,
      },
    };
  }
}
