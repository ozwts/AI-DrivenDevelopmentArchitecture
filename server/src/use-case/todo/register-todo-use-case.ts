import type { Logger } from "@/domain/support/logger";
import type { Result } from "@/util/result";
import type { UseCase } from "../interfaces";
import {
  UnexpectedError,
  ValidationError,
  NotFoundError,
} from "@/util/error-util";
import type { TodoRepository } from "@/domain/model/todo/todo-repository";
import type { UserRepository } from "@/domain/model/user/user-repository";
import {
  Todo,
  type TodoStatus,
  type TodoPriority,
} from "@/domain/model/todo/todo";
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

export type RegisterTodoUseCaseException =
  | UnexpectedError
  | ValidationError
  | NotFoundError;

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
  readonly #todoRepository: TodoRepository;

  readonly #userRepository: UserRepository;

  readonly #logger: Logger;

  readonly #fetchNow: FetchNow;

  constructor({
    todoRepository,
    userRepository,
    logger,
    fetchNow,
  }: RegisterTodoUseCaseProps) {
    this.#todoRepository = todoRepository;
    this.#userRepository = userRepository;
    this.#logger = logger;
    this.#fetchNow = fetchNow;
  }

  async execute(
    input: RegisterTodoUseCaseInput,
  ): Promise<RegisterTodoUseCaseResult> {
    this.#logger.debug("use-case: register-todo-use-case");

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

    // バリデーション
    if (title.length === 0 || title.trim().length === 0) {
      const validationError = new ValidationError(
        "TODOタイトルを入力してください",
      );
      this.#logger.error("バリデーションエラー", validationError);
      return {
        success: false,
        error: validationError,
      };
    }

    // userSubからユーザーIDを取得
    const userResult = await this.#userRepository.findBySub({ sub: userSub });
    if (!userResult.success) {
      this.#logger.error("ユーザー情報の取得に失敗しました", userResult.error);
      return {
        success: false,
        error: userResult.error,
      };
    }

    if (userResult.data === undefined) {
      const notFoundError = new NotFoundError("ユーザーが見つかりません");
      this.#logger.error("ユーザーが見つかりません", { userSub });
      return {
        success: false,
        error: notFoundError,
      };
    }

    const creatorUserId = userResult.data.id;

    const now = dateToIsoString(this.#fetchNow());

    // 担当者の決定: assigneeUserIdが指定されていない場合は作成者を担当者とする
    const finalAssigneeUserId = assigneeUserId ?? creatorUserId;

    // TODOの登録
    const newTodo = new Todo({
      id: this.#todoRepository.todoId(),
      title,
      description,
      status,
      priority,
      dueDate,
      projectId,
      assigneeUserId: finalAssigneeUserId,
      attachments: [],
      createdAt: now,
      updatedAt: now,
    });

    const saveResult = await this.#todoRepository.save({ todo: newTodo });

    if (!saveResult.success) {
      this.#logger.error("TODOの保存に失敗", saveResult.error);
      return {
        success: false,
        error: saveResult.error,
      };
    }

    this.#logger.info("TODO登録成功", {
      todoId: newTodo.id,
      title: newTodo.title,
    });

    return {
      success: true,
      data: newTodo,
    };
  }
}
