import { UnexpectedError } from "@/util/error-util";
import type { TodoRepository } from "@/domain/model/todo/todo.repository";
import type { Todo, TodoStatus } from "@/domain/model/todo/todo.entity";
import { Result } from "@/util/result";
import type { UseCase } from "../interfaces";
import type { Logger } from "@/application/port/logger";

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
  readonly logger: Logger;
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
    const { todoRepository, logger } = this.#props;

    logger.debug("ユースケース: TODO一覧取得を開始", { input });

    // projectIdが指定されている場合はfindByProjectId
    if (input.projectId !== undefined) {
      const result = await todoRepository.findByProjectId({
        projectId: input.projectId,
      });
      if (result.isErr()) {
        logger.error("TODO一覧の取得に失敗", result.error);
        return Result.err(result.error);
      }
      logger.debug("TODO一覧取得完了", { count: result.data.length });
      return Result.ok(result.data);
    }

    // statusが指定されている場合はfindByStatus
    if (input.status !== undefined) {
      const result = await todoRepository.findByStatus({
        status: input.status,
      });
      if (result.isErr()) {
        logger.error("TODO一覧の取得に失敗", result.error);
        return Result.err(result.error);
      }
      logger.debug("TODO一覧取得完了", { count: result.data.length });
      return Result.ok(result.data);
    }

    // どちらも指定されていない場合はfindAll
    const result = await todoRepository.findAll();
    if (result.isErr()) {
      logger.error("TODO一覧の取得に失敗", result.error);
      return Result.err(result.error);
    }
    logger.debug("TODO一覧取得完了", { count: result.data.length });
    return Result.ok(result.data);
  }
}
