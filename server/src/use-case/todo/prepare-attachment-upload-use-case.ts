import {
  UnexpectedError,
  NotFoundError,
  ValidationError,
} from "@/util/error-util";
import type { TodoRepository } from "@/domain/model/todo/todo.repository";
import type { StorageClient } from "@/domain/support/storage-client";
import type { FetchNow } from "@/domain/support/fetch-now";
import type { Logger } from "@/domain/support/logger";
import { Result } from "@/util/result";
import {
  Attachment,
  AttachmentStatus,
} from "@/domain/model/todo/attachment.entity";
import { dateToIsoString } from "@/util/date-util";
import type { UseCase } from "../interfaces";

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
  readonly todoRepository: TodoRepository;
  readonly storageClient: StorageClient;
  readonly fetchNow: FetchNow;
  readonly logger: Logger;
};

export type PrepareAttachmentUploadUseCase = UseCase<
  PrepareAttachmentUploadUseCaseInput,
  PrepareAttachmentUploadUseCaseOutput,
  PrepareAttachmentUploadUseCaseException
>;

export class PrepareAttachmentUploadUseCaseImpl
  implements PrepareAttachmentUploadUseCase
{
  readonly #props: PrepareAttachmentUploadUseCaseProps;

  constructor(props: PrepareAttachmentUploadUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: PrepareAttachmentUploadUseCaseInput,
  ): Promise<PrepareAttachmentUploadUseCaseResult> {
    const { todoRepository, storageClient, fetchNow, logger } = this.#props;

    logger.debug("use-case: prepare-attachment-upload-use-case", {
      todoId: input.todoId,
      fileName: input.fileName,
    });

    // バリデーション
    if (
      input.fileName === undefined ||
      input.fileName === "" ||
      input.fileName.trim().length === 0
    ) {
      const validationError = new ValidationError(
        "ファイル名を入力してください",
      );
      logger.error("バリデーションエラー", validationError);
      return Result.err(validationError);
    }

    if (input.fileSize <= 0) {
      const validationError = new ValidationError("ファイルサイズが不正です");
      logger.error("バリデーションエラー", validationError);
      return Result.err(validationError);
    }

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
    const now = dateToIsoString(fetchNow());

    // 新しいAttachmentを作成
    const attachmentId = todoRepository.attachmentId();
    const storageKey = `attachments/${input.todoId}/${attachmentId}/${input.fileName}`;

    const attachment = Attachment.from({
      id: attachmentId,
      fileName: input.fileName,
      storageKey,
      contentType: input.contentType,
      fileSize: input.fileSize,
      status: AttachmentStatus.prepared(),
      uploadedBy: input.uploadedBy,
      createdAt: now,
      updatedAt: now,
    });

    // Presigned URLを生成
    const urlResult = await storageClient.generatePresignedUploadUrl({
      key: storageKey,
      contentType: input.contentType,
      expiresIn: 1800, // 30分
    });

    if (urlResult.isErr()) {
      logger.error("Presigned URL生成に失敗", urlResult.error);
      return Result.err(urlResult.error);
    }

    // TodoにAttachmentを追加
    const updatedTodo = todo.attach(attachment, now);

    // 保存
    const saveResult = await todoRepository.save({ todo: updatedTodo });

    if (saveResult.isErr()) {
      logger.error("TODO保存に失敗", saveResult.error);
      return Result.err(saveResult.error);
    }

    logger.info("アップロード準備完了", {
      todoId: input.todoId,
      attachmentId,
    });

    return Result.ok({
      attachmentId,
      uploadUrl: urlResult.data,
    });
  }
}
