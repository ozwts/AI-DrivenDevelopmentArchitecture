import type { Result } from "@/util/result";
import type { UnexpectedError } from "@/util/error-util";
import type { TodoRepository } from "@/domain/model/todo/todo-repository";
import type { Todo, TodoStatus } from "@/domain/model/todo/todo";

export type ListTodosUseCaseInput = {
  status?: TodoStatus;
  projectId?: string;
};

export type ListTodosUseCaseOutput = Result<Todo[], UnexpectedError>;

export type ListTodosUseCase = {
  execute(input: ListTodosUseCaseInput): Promise<ListTodosUseCaseOutput>;
};

export type ListTodosUseCaseProps = {
  todoRepository: TodoRepository;
};

export class ListTodosUseCaseImpl implements ListTodosUseCase {
  readonly #todoRepository: TodoRepository;

  constructor({ todoRepository }: ListTodosUseCaseProps) {
    this.#todoRepository = todoRepository;
  }

  async execute(input: ListTodosUseCaseInput): Promise<ListTodosUseCaseOutput> {
    // projectIdが指定されている場合はfindByProjectId
    if (input.projectId !== undefined) {
      return this.#todoRepository.findByProjectId({
        projectId: input.projectId,
      });
    }

    // statusが指定されている場合はfindByStatus
    if (input.status !== undefined) {
      return this.#todoRepository.findByStatus({ status: input.status });
    }

    // どちらも指定されていない場合はfindAll
    return this.#todoRepository.findAll();
  }
}
