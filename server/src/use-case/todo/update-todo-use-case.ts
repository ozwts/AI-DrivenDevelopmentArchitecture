import { UnexpectedError, NotFoundError } from "@/util/error-util";
import type { TodoRepository } from "@/domain/model/todo/todo.repository";
import type {
  Todo,
  TodoStatus,
  TodoPriority,
} from "@/domain/model/todo/todo.entity";
import type { FetchNow } from "@/domain/support/fetch-now";
import type { Logger } from "@/domain/support/logger";
import { Result } from "@/util/result";
import { dateToIsoString } from "@/util/date-util";
import type { UseCase } from "../interfaces";

export type UpdateTodoUseCaseInput = {
  todoId: string;
  title?: string;
  description?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  dueDate?: string;
  projectId?: string;
  assigneeUserId?: string;
};

export type UpdateTodoUseCaseOutput = Todo;

export type UpdateTodoUseCaseException = UnexpectedError | NotFoundError;

export type UpdateTodoUseCaseResult = Result<
  UpdateTodoUseCaseOutput,
  UpdateTodoUseCaseException
>;

export type UpdateTodoUseCaseProps = {
  readonly todoRepository: TodoRepository;
  readonly fetchNow: FetchNow;
  readonly logger: Logger;
};

export type UpdateTodoUseCase = UseCase<
  UpdateTodoUseCaseInput,
  UpdateTodoUseCaseOutput,
  UpdateTodoUseCaseException
>;

export class UpdateTodoUseCaseImpl implements UpdateTodoUseCase {
  readonly #props: UpdateTodoUseCaseProps;

  constructor(props: UpdateTodoUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: UpdateTodoUseCaseInput,
  ): Promise<UpdateTodoUseCaseResult> {
    const { todoRepository, fetchNow, logger } = this.#props;

    logger.debug("use-case: update-todo-use-case", {
      todoId: input.todoId,
    });

    // 既存のTODOを取得
    const todoResult = await todoRepository.findById({
      id: input.todoId,
    });

    if (todoResult.isErr()) {
      logger.error("TODOの取得に失敗", todoResult.error);
      return Result.err(todoResult.error);
    }

    if (todoResult.data === undefined) {
      const notFoundError = new NotFoundError("TODOが見つかりません");
      logger.error("TODOが存在しません", { todoId: input.todoId });
      return Result.err(notFoundError);
    }

    // Result.map()によるメソッドチェーンでTODOを更新
    const now = dateToIsoString(fetchNow());

    const updatedResult = Result.ok(todoResult.data)
      .map((t: Todo) =>
        "title" in input && input.title !== undefined
          ? t.retitle(input.title, now)
          : t,
      )
      .map((t: Todo) =>
        "description" in input ? t.clarify(input.description, now) : t,
      )
      .map((t: Todo) => {
        if (!("status" in input) || input.status === undefined) return t;
        if (input.status.isTodo()) return t.reopen(now);
        if (input.status.isInProgress()) return t.start(now);
        if (input.status.isCompleted()) return t.complete(now);
        return t;
      })
      .map((t: Todo) =>
        "priority" in input && input.priority !== undefined
          ? t.prioritize(input.priority, now)
          : t,
      )
      .map((t: Todo) =>
        "dueDate" in input ? t.reschedule(input.dueDate, now) : t,
      )
      .map((t: Todo) =>
        "projectId" in input ? t.moveToProject(input.projectId, now) : t,
      )
      .map((t: Todo) =>
        "assigneeUserId" in input && input.assigneeUserId !== undefined
          ? t.assign(input.assigneeUserId, now)
          : t,
      );

    if (updatedResult.isErr()) {
      return updatedResult;
    }

    // 保存
    const saveResult = await todoRepository.save({ todo: updatedResult.data });

    if (saveResult.isErr()) {
      logger.error("TODOの保存に失敗", saveResult.error);
      return Result.err(saveResult.error);
    }

    logger.info("TODO更新成功", {
      todoId: updatedResult.data.id,
    });

    return Result.ok(updatedResult.data);
  }
}
