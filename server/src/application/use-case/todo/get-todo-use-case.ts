import { UnexpectedError, NotFoundError } from "@/util/error-util";
import type { TodoRepository } from "@/domain/model/todo/todo.repository";
import type { Todo } from "@/domain/model/todo/todo.entity";
import { Result } from "@/util/result";
import type { UseCase } from "../interfaces";
import type { Logger } from "@/application/port/logger";

export type GetTodoUseCaseInput = {
  todoId: string;
};

export type GetTodoUseCaseOutput = Todo;

export type GetTodoUseCaseException = UnexpectedError | NotFoundError;

export type GetTodoUseCaseResult = Result<
  GetTodoUseCaseOutput,
  GetTodoUseCaseException
>;

export type GetTodoUseCaseProps = {
  readonly todoRepository: TodoRepository;
  readonly logger: Logger;
};

export type GetTodoUseCase = UseCase<
  GetTodoUseCaseInput,
  GetTodoUseCaseOutput,
  GetTodoUseCaseException
>;

export class GetTodoUseCaseImpl implements GetTodoUseCase {
  readonly #props: GetTodoUseCaseProps;

  constructor(props: GetTodoUseCaseProps) {
    this.#props = props;
  }

  async execute(input: GetTodoUseCaseInput): Promise<GetTodoUseCaseResult> {
    const { todoRepository, logger } = this.#props;

    logger.debug("ユースケース: TODO取得を開始", { todoId: input.todoId });

    const result = await todoRepository.findById({ id: input.todoId });

    if (result.isErr()) {
      logger.error("TODOの取得に失敗", result.error);
      return Result.err(result.error);
    }

    if (result.data === undefined) {
      logger.warn("TODOが見つかりませんでした", { todoId: input.todoId });
      return Result.err(new NotFoundError("TODOが見つかりません"));
    }

    logger.debug("TODO取得完了", { todoId: result.data.id });

    return Result.ok(result.data);
  }
}
