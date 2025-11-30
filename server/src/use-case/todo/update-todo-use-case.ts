import { UnexpectedError, NotFoundError } from "@/util/error-util";
import type { TodoRepository } from "@/domain/model/todo/todo.repository";
import type {
  Todo,
  TodoStatus,
  TodoPriority,
} from "@/domain/model/todo/todo.entity";
import type { FetchNow } from "@/domain/support/fetch-now";
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
    const { todoRepository, fetchNow } = this.#props;

    // 既存のTODOを取得
    const todoResult = await todoRepository.findById({
      id: input.todoId,
    });

    if (todoResult.isErr()) {
      return Result.err(todoResult.error);
    }

    if (todoResult.data === undefined) {
      return Result.err(new NotFoundError("TODOが見つかりません"));
    }

    // TODOを更新（個別メソッドを組み合わせる）
    const now = dateToIsoString(fetchNow());
    let updatedTodo = todoResult.data;
    if (input.title !== undefined) {
      updatedTodo = updatedTodo.retitle(input.title, now);
    }
    if (input.description !== undefined) {
      updatedTodo = updatedTodo.clarify(input.description, now);
    }
    if (input.status !== undefined) {
      // ステータスに応じたメソッドを呼び出す
      if (input.status.isTodo()) {
        updatedTodo = updatedTodo.reopen(now);
      } else if (input.status.isInProgress()) {
        updatedTodo = updatedTodo.start(now);
      } else if (input.status.isCompleted()) {
        updatedTodo = updatedTodo.complete(now);
      }
    }
    if (input.priority !== undefined) {
      updatedTodo = updatedTodo.prioritize(input.priority, now);
    }
    if (input.dueDate !== undefined) {
      updatedTodo = updatedTodo.reschedule(input.dueDate, now);
    }
    if (input.projectId !== undefined) {
      updatedTodo = updatedTodo.moveToProject(input.projectId, now);
    }
    if (input.assigneeUserId !== undefined) {
      updatedTodo = updatedTodo.assign(input.assigneeUserId, now);
    }

    // 保存
    const saveResult = await todoRepository.save({ todo: updatedTodo });

    if (saveResult.isErr()) {
      return Result.err(saveResult.error);
    }

    return Result.ok(updatedTodo);
  }
}
