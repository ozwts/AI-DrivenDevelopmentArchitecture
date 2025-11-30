import type { Result } from "@/util/result";
import type { UnexpectedError, NotFoundError } from "@/util/error-util";
import type { TodoRepository } from "@/domain/model/todo/todo.repository";
import type { Todo } from "@/domain/model/todo/todo";

export type GetTodoUseCaseInput = {
  todoId: string;
};

export type GetTodoUseCaseOutput = Result<
  Todo,
  UnexpectedError | NotFoundError
>;

export type GetTodoUseCase = {
  execute(input: GetTodoUseCaseInput): Promise<GetTodoUseCaseOutput>;
};

export type GetTodoUseCaseProps = {
  todoRepository: TodoRepository;
};

export class GetTodoUseCaseImpl implements GetTodoUseCase {
  readonly #todoRepository: TodoRepository;

  constructor({ todoRepository }: GetTodoUseCaseProps) {
    this.#todoRepository = todoRepository;
  }

  async execute(input: GetTodoUseCaseInput): Promise<GetTodoUseCaseOutput> {
    const result = await this.#todoRepository.findById({ id: input.todoId });

    if (!result.success) {
      return result;
    }

    if (result.data === undefined) {
      return {
        success: false,
        error: {
          name: "NotFoundError",
          message: "TODOが見つかりません",
        } as NotFoundError,
      };
    }

    return {
      success: true,
      data: result.data,
    };
  }
}
