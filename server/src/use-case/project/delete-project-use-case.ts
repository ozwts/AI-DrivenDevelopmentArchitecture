/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import type { Logger } from "@/domain/support/logger";
import type { Result } from "@/util/result";
import { UnexpectedError, ValidationError } from "@/util/error-util";
import type { ProjectRepository } from "@/domain/model/project/project.repository";
import type { TodoRepository } from "@/domain/model/todo/todo.repository";
import type { UnitOfWorkRunner } from "@/domain/support/unit-of-work";

export type DeleteProjectUseCaseInput = {
  projectId: string;
};

export type DeleteProjectUseCaseOutput = void;

export type DeleteProjectUseCaseException = UnexpectedError | ValidationError;

export type DeleteProjectUseCaseResult = Result<
  DeleteProjectUseCaseOutput,
  DeleteProjectUseCaseException
>;

/**
 * Unit of Work内で使用可能なリポジトリコンテキスト
 */
export type DeleteProjectUoWContext = {
  projectRepository: ProjectRepository;
  todoRepository: TodoRepository;
};

export type DeleteProjectUseCaseProps = {
  logger: Logger;
  uowRunner: UnitOfWorkRunner<DeleteProjectUoWContext>;
};

export type DeleteProjectUseCase = {
  execute(
    input: DeleteProjectUseCaseInput,
  ): Promise<DeleteProjectUseCaseResult>;
};

export class DeleteProjectUseCaseImpl implements DeleteProjectUseCase {
  readonly #logger: Logger;

  readonly #uowRunner: UnitOfWorkRunner<DeleteProjectUoWContext>;

  constructor({ logger, uowRunner }: DeleteProjectUseCaseProps) {
    this.#logger = logger;
    this.#uowRunner = uowRunner;
  }

  async execute(
    input: DeleteProjectUseCaseInput,
  ): Promise<DeleteProjectUseCaseResult> {
    this.#logger.debug("use-case: delete-project-use-case", {
      projectId: input.projectId,
    });

    try {
      // Unit of Work内でトランザクション実行
      await this.#uowRunner.run(async (uow) => {
        // プロジェクトが存在するか確認
        const findResult = await uow.projectRepository.findById({
          id: input.projectId,
        });

        if (!findResult.success) {
          this.#logger.error("プロジェクトの取得に失敗", findResult.error);
          throw findResult.error;
        }

        if (findResult.data === undefined) {
          const notFoundError = new ValidationError(
            "プロジェクトが見つかりませんでした",
          );
          this.#logger.error("プロジェクトが存在しません", {
            projectId: input.projectId,
          });
          throw notFoundError;
        }

        // プロジェクトに紐づくTODOをすべて取得
        const todosResult = await uow.todoRepository.findByProjectId({
          projectId: input.projectId,
        });

        if (!todosResult.success) {
          this.#logger.error(
            "プロジェクトに紐づくTODOの取得に失敗",
            todosResult.error,
          );
          throw todosResult.error;
        }

        this.#logger.info("プロジェクトに紐づくTODOを削除します", {
          projectId: input.projectId,
          todoCount: todosResult.data.length,
        });

        // プロジェクトに紐づくすべてのTODO削除をUnit Of Workのサンプルとして実装。
        // DynamoDBにはトランザクションが100件までの制限があるため、トランザクション処理の要否はよく検討すること
        for (const todo of todosResult.data) {
          const removeResult = await uow.todoRepository.remove({ id: todo.id });
          if (!removeResult.success) {
            this.#logger.error("TODOの削除に失敗", {
              todoId: todo.id,
              error: removeResult.error,
            });
            throw removeResult.error;
          }
        }

        // プロジェクトを削除
        const deleteResult = await uow.projectRepository.remove({
          id: input.projectId,
        });

        if (!deleteResult.success) {
          this.#logger.error("プロジェクトの削除に失敗", deleteResult.error);
          throw deleteResult.error;
        }

        this.#logger.info("プロジェクト削除成功", {
          projectId: input.projectId,
          deletedTodoCount: todosResult.data.length,
        });
      });

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      this.#logger.error("プロジェクト削除に失敗しました", error as Error);

      // ValidationErrorの場合はそのまま返す
      if (error instanceof ValidationError) {
        return {
          success: false,
          error,
        };
      }

      // UnexpectedErrorの場合もそのまま返す
      if (error instanceof UnexpectedError) {
        return {
          success: false,
          error,
        };
      }

      // その他のエラーはUnexpectedErrorとして返す
      return {
        success: false,
        error: new UnexpectedError(),
      };
    }
  }
}
