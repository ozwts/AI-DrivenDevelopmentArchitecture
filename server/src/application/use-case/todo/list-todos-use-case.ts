import { UnexpectedError } from "@/util/error-util";
import type { TodoRepository } from "@/domain/model/todo/todo.repository";
import type { Todo, TodoStatus } from "@/domain/model/todo/todo.entity";
import { Result } from "@/util/result";
import type { UseCase } from "../interfaces";

export type ListTodosUseCaseInput = {
  status?: TodoStatus;
  projectId?: string;
};

export type ListTodosUseCaseOutput = readonly Todo[];

export type ListTodosUseCaseException = UnexpectedError;

export type ListTodosUseCaseResult = Result<
  ListTodosUseCaseOutput,
  ListTodosUseCaseException
>;

export type ListTodosUseCaseProps = {
  readonly todoRepository: TodoRepository;
};

export type ListTodosUseCase = UseCase<
  ListTodosUseCaseInput,
  ListTodosUseCaseOutput,
  ListTodosUseCaseException
>;

export class ListTodosUseCaseImpl implements ListTodosUseCase {
  readonly #props: ListTodosUseCaseProps;

  constructor(props: ListTodosUseCaseProps) {
    this.#props = props;
  }

  async execute(input: ListTodosUseCaseInput): Promise<ListTodosUseCaseResult> {
    const { todoRepository } = this.#props;

    // projectIdが指定されている場合はfindByProjectId
    if (input.projectId !== undefined) {
      const result = await todoRepository.findByProjectId({
        projectId: input.projectId,
      });
      if (result.isErr()) {
        return Result.err(result.error);
      }
      return Result.ok(result.data);
    }

    // statusが指定されている場合はfindByStatus
    if (input.status !== undefined) {
      const result = await todoRepository.findByStatus({
        status: input.status,
      });
      if (result.isErr()) {
        return Result.err(result.error);
      }
      return Result.ok(result.data);
    }

    // どちらも指定されていない場合はfindAll
    const result = await todoRepository.findAll();
    if (result.isErr()) {
      return Result.err(result.error);
    }
    return Result.ok(result.data);
  }
}
