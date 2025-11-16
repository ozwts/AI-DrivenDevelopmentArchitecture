import type { Result } from "@/util/result";
import type {
  UnexpectedError,
  NotFoundError,
  ValidationError,
} from "@/util/error-util";
import type { TodoRepository } from "@/domain/model/todo/todo-repository";
import type { StorageClient } from "@/domain/support/storage-client";
import type { FetchNow } from "@/domain/support/fetch-now";
import type { Logger } from "@/domain/support/logger";
import { Attachment } from "@/domain/model/attachment/attachment";
import { dateToIsoString } from "@/util/date-util";

export type PrepareAttachmentUploadUseCaseInput = {
  todoId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  uploadedBy: string;
};

export type PrepareAttachmentUploadUseCaseOutput = {
  attachmentId: string;
  uploadUrl: string;
};

export type PrepareAttachmentUploadUseCaseException =
  | UnexpectedError
  | NotFoundError
  | ValidationError;

export type PrepareAttachmentUploadUseCaseResult = Result<
  PrepareAttachmentUploadUseCaseOutput,
  PrepareAttachmentUploadUseCaseException
>;

export type PrepareAttachmentUploadUseCaseProps = {
  todoRepository: TodoRepository;
  storageClient: StorageClient;
  fetchNow: FetchNow;
  logger: Logger;
};

export type PrepareAttachmentUploadUseCase = {
  execute(
    input: PrepareAttachmentUploadUseCaseInput,
  ): Promise<PrepareAttachmentUploadUseCaseResult>;
};

export class PrepareAttachmentUploadUseCaseImpl
  implements PrepareAttachmentUploadUseCase
{
  readonly #todoRepository: TodoRepository;

  readonly #storageClient: StorageClient;

  readonly #fetchNow: FetchNow;

  readonly #logger: Logger;

  constructor({
    todoRepository,
    storageClient,
    fetchNow,
    logger,
  }: PrepareAttachmentUploadUseCaseProps) {
    this.#todoRepository = todoRepository;
    this.#storageClient = storageClient;
    this.#fetchNow = fetchNow;
    this.#logger = logger;
  }

  async execute(
    input: PrepareAttachmentUploadUseCaseInput,
  ): Promise<PrepareAttachmentUploadUseCaseResult> {
    this.#logger.debug("use-case: prepare-attachment-upload-use-case", {
      todoId: input.todoId,
      fileName: input.fileName,
    });

    // バリデーション
    if (
      input.fileName === undefined ||
      input.fileName === "" ||
      input.fileName.trim().length === 0
    ) {
      const validationError: ValidationError = {
        name: "ValidationError",
        message: "ファイル名を入力してください",
      };
      this.#logger.error("バリデーションエラー", validationError);
      return {
        success: false,
        error: validationError,
      };
    }

    if (input.fileSize <= 0) {
      const validationError: ValidationError = {
        name: "ValidationError",
        message: "ファイルサイズが不正です",
      };
      this.#logger.error("バリデーションエラー", validationError);
      return {
        success: false,
        error: validationError,
      };
    }

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
    const now = dateToIsoString(this.#fetchNow());

    // 新しいAttachmentを作成
    const attachmentId = this.#todoRepository.attachmentId();
    const storageKey = `attachments/${input.todoId}/${attachmentId}/${input.fileName}`;

    const attachment = new Attachment({
      id: attachmentId,
      fileName: input.fileName,
      storageKey,
      contentType: input.contentType,
      fileSize: input.fileSize,
      status: "PREPARED",
      uploadedBy: input.uploadedBy,
      createdAt: now,
      updatedAt: now,
    });

    // Presigned URLを生成
    const urlResult = await this.#storageClient.generatePresignedUploadUrl({
      key: storageKey,
      contentType: input.contentType,
      expiresIn: 1800, // 30分
    });

    if (!urlResult.success) {
      this.#logger.error("Presigned URL生成に失敗", urlResult.error);
      return urlResult;
    }

    // TodoにAttachmentを追加
    const updatedTodo = todo.update({
      attachments: [...todo.attachments, attachment],
      updatedAt: now,
    });

    // 保存
    const saveResult = await this.#todoRepository.save({ todo: updatedTodo });

    if (!saveResult.success) {
      this.#logger.error("TODO保存に失敗", saveResult.error);
      return saveResult;
    }

    this.#logger.info("アップロード準備完了", {
      todoId: input.todoId,
      attachmentId,
    });

    return {
      success: true,
      data: {
        attachmentId,
        uploadUrl: urlResult.data,
      },
    };
  }
}
