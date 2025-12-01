import type { Logger } from "@/domain/support/logger";
import { Result as ResultUtil, type Result } from "@/util/result";
import { NotFoundError, UnexpectedError } from "@/util/error-util";
import type { ProjectRepository } from "@/domain/model/project/project.repository";
import type { TodoRepository } from "@/domain/model/todo/todo.repository";
import type { UnitOfWorkRunner } from "@/domain/support/unit-of-work";
import type { UseCase } from "../interfaces";

export type DeleteProjectUseCaseInput = {
  projectId: string;
};

export type DeleteProjectUseCaseOutput = void;

export type DeleteProjectUseCaseException = UnexpectedError | NotFoundError;

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
  readonly logger: Logger;
  readonly uowRunner: UnitOfWorkRunner<DeleteProjectUoWContext>;
};

export type DeleteProjectUseCase = UseCase<
  DeleteProjectUseCaseInput,
  DeleteProjectUseCaseOutput,
  DeleteProjectUseCaseException
>;

export class DeleteProjectUseCaseImpl implements DeleteProjectUseCase {
  readonly #props: DeleteProjectUseCaseProps;

  constructor(props: DeleteProjectUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: DeleteProjectUseCaseInput,
  ): Promise<DeleteProjectUseCaseResult> {
    const { logger, uowRunner } = this.#props;

    logger.debug("use-case: delete-project-use-case", {
      projectId: input.projectId,
    });

    // Unit of Work内でトランザクション実行（Result型で返す）
    return uowRunner.run<void, DeleteProjectUseCaseException>(async (uow) => {
      // プロジェクトが存在するか確認
      const findResult = await uow.projectRepository.findById({
        id: input.projectId,
      });

      if (findResult.isErr()) {
        logger.error("プロジェクトの取得に失敗", findResult.error);
        return ResultUtil.err(findResult.error);
      }

      if (findResult.data === undefined) {
        logger.error("プロジェクトが存在しません", {
          projectId: input.projectId,
        });
        return ResultUtil.err(
          new NotFoundError("プロジェクトが見つかりませんでした"),
        );
      }

      // プロジェクトに紐づくTODOをすべて取得
      const todosResult = await uow.todoRepository.findByProjectId({
        projectId: input.projectId,
      });

      if (todosResult.isErr()) {
        logger.error("プロジェクトに紐づくTODOの取得に失敗", todosResult.error);
        return ResultUtil.err(todosResult.error);
      }

      logger.info("プロジェクトに紐づくTODOを削除します", {
        projectId: input.projectId,
        todoCount: todosResult.data.length,
      });

      // プロジェクトに紐づくすべてのTODO削除をUnit Of Workのサンプルとして実装。
      // DynamoDBにはトランザクションが100件までの制限があるため、トランザクション処理の要否はよく検討すること
      for (const todo of todosResult.data) {
        const removeResult = await uow.todoRepository.remove({ id: todo.id });
        if (removeResult.isErr()) {
          logger.error("TODOの削除に失敗", {
            todoId: todo.id,
            error: removeResult.error,
          });
          return ResultUtil.err(removeResult.error);
        }
      }

      // プロジェクトを削除
      const deleteResult = await uow.projectRepository.remove({
        id: input.projectId,
      });

      if (deleteResult.isErr()) {
        logger.error("プロジェクトの削除に失敗", deleteResult.error);
        return ResultUtil.err(deleteResult.error);
      }

      logger.info("プロジェクト削除成功", {
        projectId: input.projectId,
        deletedTodoCount: todosResult.data.length,
      });

      return ResultUtil.ok(undefined);
    });
  }
}
