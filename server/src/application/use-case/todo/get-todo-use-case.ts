import { UnexpectedError, NotFoundError } from "@/util/error-util";
import type { TodoRepository } from "@/domain/model/todo/todo.repository";
import type { Todo } from "@/domain/model/todo/todo.entity";
import { Result } from "@/util/result";
import type { UseCase } from "../interfaces";

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
    const { todoRepository } = this.#props;

    const result = await todoRepository.findById({ id: input.todoId });

    if (result.isErr()) {
      return Result.err(result.error);
    }

    if (result.data === undefined) {
      return Result.err(new NotFoundError("TODOが見つかりません"));
    }

    return Result.ok(result.data);
  }
}
