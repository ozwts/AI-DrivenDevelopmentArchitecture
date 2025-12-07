import { UnexpectedError, NotFoundError } from "@/util/error-util";
import type { TodoRepository } from "@/domain/model/todo/todo.repository";
import type { FetchNow } from "@/application/port/fetch-now";
import type { Logger } from "@/application/port/logger";
import {
  Attachment,
  type AttachmentStatus,
} from "@/domain/model/todo/attachment.entity";
import { Result } from "@/util/result";
import { dateToIsoString } from "@/util/date-util";
import type { UseCase } from "../interfaces";

export type UpdateAttachmentStatusUseCaseInput = {
  todoId: string;
  attachmentId: string;
  status: AttachmentStatus;
};

export type UpdateAttachmentStatusUseCaseOutput = Attachment;

export type UpdateAttachmentStatusUseCaseException =
  | UnexpectedError
  | NotFoundError;

export type UpdateAttachmentStatusUseCaseResult = Result<
  UpdateAttachmentStatusUseCaseOutput,
  UpdateAttachmentStatusUseCaseException
>;

export type UpdateAttachmentStatusUseCaseProps = {
  readonly todoRepository: TodoRepository;
  readonly fetchNow: FetchNow;
  readonly logger: Logger;
};

export type UpdateAttachmentStatusUseCase = UseCase<
  UpdateAttachmentStatusUseCaseInput,
  UpdateAttachmentStatusUseCaseOutput,
  UpdateAttachmentStatusUseCaseException
>;

export class UpdateAttachmentStatusUseCaseImpl
  implements UpdateAttachmentStatusUseCase
{
  readonly #props: UpdateAttachmentStatusUseCaseProps;

  constructor(props: UpdateAttachmentStatusUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: UpdateAttachmentStatusUseCaseInput,
  ): Promise<UpdateAttachmentStatusUseCaseResult> {
    const { todoRepository, fetchNow, logger } = this.#props;

    logger.debug("use-case: update-attachment-status-use-case", {
      todoId: input.todoId,
      attachmentId: input.attachmentId,
      status: input.status,
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
    const attachmentIndex = todo.attachments.findIndex(
      (a) => a.id === input.attachmentId,
    );

    if (attachmentIndex === -1) {
      const notFoundError = new NotFoundError("添付ファイルが見つかりません");
      logger.error("添付ファイルが見つかりません", {
        todoId: input.todoId,
        attachmentId: input.attachmentId,
      });
      return Result.err(notFoundError);
    }

    const now = dateToIsoString(fetchNow());

    // Attachmentのステータスを更新（UPLOADEDへの遷移のみサポート）
    const attachment = todo.attachments[attachmentIndex];
    const updatedAttachment = attachment.markAsUploaded(now);

    // Todoを更新（replaceAttachmentで該当の添付ファイルを置換）
    const updatedTodo = todo.replaceAttachment(updatedAttachment, now);

    // 保存
    const saveResult = await todoRepository.save({ todo: updatedTodo });

    if (saveResult.isErr()) {
      logger.error("TODO保存に失敗", saveResult.error);
      return Result.err(saveResult.error);
    }

    logger.info("添付ファイルステータス更新完了", {
      todoId: input.todoId,
      attachmentId: input.attachmentId,
      status: input.status,
    });

    return Result.ok(updatedAttachment);
  }
}
