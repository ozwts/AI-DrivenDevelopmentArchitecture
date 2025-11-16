import type { Result } from "@/util/result";
import type { UnexpectedError, NotFoundError } from "@/util/error-util";
import type { TodoRepository } from "@/domain/model/todo/todo-repository";
import type { FetchNow } from "@/domain/support/fetch-now";
import type { Logger } from "@/domain/support/logger";
import type { AttachmentStatus } from "@/domain/model/attachment/attachment";
import { dateToIsoString } from "@/util/date-util";

export type UpdateAttachmentStatusUseCaseInput = {
  todoId: string;
  attachmentId: string;
  status: AttachmentStatus;
};

export type UpdateAttachmentStatusUseCaseOutput = void;

export type UpdateAttachmentStatusUseCaseException =
  | UnexpectedError
  | NotFoundError;

export type UpdateAttachmentStatusUseCaseResult = Result<
  UpdateAttachmentStatusUseCaseOutput,
  UpdateAttachmentStatusUseCaseException
>;

export type UpdateAttachmentStatusUseCaseProps = {
  todoRepository: TodoRepository;
  fetchNow: FetchNow;
  logger: Logger;
};

export type UpdateAttachmentStatusUseCase = {
  execute(
    input: UpdateAttachmentStatusUseCaseInput,
  ): Promise<UpdateAttachmentStatusUseCaseResult>;
};

export class UpdateAttachmentStatusUseCaseImpl
  implements UpdateAttachmentStatusUseCase
{
  readonly #todoRepository: TodoRepository;

  readonly #fetchNow: FetchNow;

  readonly #logger: Logger;

  constructor({
    todoRepository,
    fetchNow,
    logger,
  }: UpdateAttachmentStatusUseCaseProps) {
    this.#todoRepository = todoRepository;
    this.#fetchNow = fetchNow;
    this.#logger = logger;
  }

  async execute(
    input: UpdateAttachmentStatusUseCaseInput,
  ): Promise<UpdateAttachmentStatusUseCaseResult> {
    this.#logger.debug("use-case: update-attachment-status-use-case", {
      todoId: input.todoId,
      attachmentId: input.attachmentId,
      status: input.status,
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
    const attachmentIndex = todo.attachments.findIndex(
      (a) => a.id === input.attachmentId,
    );

    if (attachmentIndex === -1) {
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

    const now = dateToIsoString(this.#fetchNow());

    // Attachmentのステータスを更新
    const attachment = todo.attachments[attachmentIndex];
    const updatedAttachment = attachment.changeStatus(input.status, now);

    // Attachmentsリストを更新
    const updatedAttachments = [...todo.attachments];
    updatedAttachments[attachmentIndex] = updatedAttachment;

    // Todoを更新
    const updatedTodo = todo.update({
      attachments: updatedAttachments,
      updatedAt: now,
    });

    // 保存
    const saveResult = await this.#todoRepository.save({ todo: updatedTodo });

    if (!saveResult.success) {
      this.#logger.error("TODO保存に失敗", saveResult.error);
      return saveResult;
    }

    this.#logger.info("添付ファイルステータス更新完了", {
      todoId: input.todoId,
      attachmentId: input.attachmentId,
      status: input.status,
    });

    return {
      success: true,
      data: undefined,
    };
  }
}
