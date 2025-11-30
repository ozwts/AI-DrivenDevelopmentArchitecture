import type { Logger } from "@/domain/support/logger";
import { Result } from "@/util/result";
import type { UseCase } from "../interfaces";
import { UnexpectedError, NotFoundError } from "@/util/error-util";
import type { TodoRepository } from "@/domain/model/todo/todo.repository";
import type { UserRepository } from "@/domain/model/user/user.repository";
import {
  Todo,
  TodoStatus,
  type TodoPriority,
} from "@/domain/model/todo/todo.entity";
import type { FetchNow } from "@/domain/support/fetch-now";
import { dateToIsoString } from "@/util/date-util";

export type RegisterTodoUseCaseInput = {
  userSub: string;
  title: string;
  description?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  dueDate?: string;
  projectId?: string;
  assigneeUserId?: string;
};

export type RegisterTodoUseCaseOutput = Todo;

export type RegisterTodoUseCaseException = UnexpectedError | NotFoundError;

export type RegisterTodoUseCaseResult = Result<
  RegisterTodoUseCaseOutput,
  RegisterTodoUseCaseException
>;

export type RegisterTodoUseCaseProps = {
  readonly todoRepository: TodoRepository;
  readonly userRepository: UserRepository;
  readonly logger: Logger;
  readonly fetchNow: FetchNow;
};

export type RegisterTodoUseCase = UseCase<
  RegisterTodoUseCaseInput,
  RegisterTodoUseCaseOutput,
  RegisterTodoUseCaseException
>;

export class RegisterTodoUseCaseImpl implements RegisterTodoUseCase {
  readonly #props: RegisterTodoUseCaseProps;

  constructor(props: RegisterTodoUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: RegisterTodoUseCaseInput,
  ): Promise<RegisterTodoUseCaseResult> {
    const { todoRepository, userRepository, logger, fetchNow } = this.#props;

    logger.debug("use-case: register-todo-use-case");

    const {
      userSub,
      title,
      description,
      status,
      priority,
      dueDate,
      projectId,
      assigneeUserId,
    } = input;

    // userSubからユーザーIDを取得
    const userResult = await userRepository.findBySub({ sub: userSub });
    if (userResult.isErr()) {
      logger.error("ユーザー情報の取得に失敗しました", userResult.error);
      return Result.err(userResult.error);
    }

    if (userResult.data === undefined) {
      const notFoundError = new NotFoundError("ユーザーが見つかりません");
      logger.error("ユーザーが見つかりません", { userSub });
      return Result.err(notFoundError);
    }

    const creatorUserId = userResult.data.id;

    const now = dateToIsoString(fetchNow());

    // 担当者の決定: assigneeUserIdが指定されていない場合は作成者を担当者とする
    const finalAssigneeUserId = assigneeUserId ?? creatorUserId;

    // TODOの登録（デフォルト値を適用）
    const newTodo = Todo.from({
      id: todoRepository.todoId(),
      title,
      description,
      status: status ?? TodoStatus.todo(),
      priority: priority ?? "MEDIUM",
      dueDate,
      projectId,
      assigneeUserId: finalAssigneeUserId,
      attachments: [],
      createdAt: now,
      updatedAt: now,
    });

    const saveResult = await todoRepository.save({ todo: newTodo });

    if (saveResult.isErr()) {
      logger.error("TODOの保存に失敗", saveResult.error);
      return Result.err(saveResult.error);
    }

    logger.info("TODO登録成功", {
      todoId: newTodo.id,
      title: newTodo.title,
    });

    return Result.ok(newTodo);
  }
}
