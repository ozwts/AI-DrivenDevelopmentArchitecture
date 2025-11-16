import type { Result } from "@/util/result";
import type { UnexpectedError, NotFoundError } from "@/util/error-util";
import type { TodoRepository } from "@/domain/model/todo/todo-repository";
import type { Todo, TodoStatus, TodoPriority } from "@/domain/model/todo/todo";
import type { FetchNow } from "@/domain/support/fetch-now";

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

export type UpdateTodoUseCaseOutput = Result<
  Todo,
  UnexpectedError | NotFoundError
>;

export type UpdateTodoUseCase = {
  execute(input: UpdateTodoUseCaseInput): Promise<UpdateTodoUseCaseOutput>;
};

export type UpdateTodoUseCaseProps = {
  todoRepository: TodoRepository;
  fetchNow: FetchNow;
};

export class UpdateTodoUseCaseImpl implements UpdateTodoUseCase {
  readonly #todoRepository: TodoRepository;

  readonly #fetchNow: FetchNow;

  constructor({ todoRepository, fetchNow }: UpdateTodoUseCaseProps) {
    this.#todoRepository = todoRepository;
    this.#fetchNow = fetchNow;
  }

  async execute(
    input: UpdateTodoUseCaseInput,
  ): Promise<UpdateTodoUseCaseOutput> {
    // 既存のTODOを取得
    const todoResult = await this.#todoRepository.findById({
      id: input.todoId,
    });

    if (!todoResult.success) {
      return todoResult;
    }

    if (todoResult.data === undefined) {
      return {
        success: false,
        error: {
          name: "NotFoundError",
          message: "TODOが見つかりません",
        } as NotFoundError,
      };
    }

    // TODOを更新
    const updatedTodo = todoResult.data.update({
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate,
      projectId: input.projectId,
      assigneeUserId: input.assigneeUserId,
      updatedAt: this.#fetchNow().toISOString(),
    });

    // 保存
    const saveResult = await this.#todoRepository.save({ todo: updatedTodo });

    if (!saveResult.success) {
      return saveResult;
    }

    return {
      success: true,
      data: updatedTodo,
    };
  }
}
