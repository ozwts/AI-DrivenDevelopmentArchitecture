import type { Logger } from "@/application/port/logger";
import { UnexpectedError, NotFoundError } from "@/util/error-util";
import type { ProjectRepository } from "@/domain/model/project/project.repository";
import type { Project } from "@/domain/model/project/project.entity";
import type { FetchNow } from "@/application/port/fetch-now";
import { Result } from "@/util/result";
import { dateToIsoString } from "@/util/date-util";
import type { UseCase } from "../interfaces";

export type UpdateProjectUseCaseInput = {
  projectId: string;
  name?: string;
  description?: string;
  color?: string;
};

export type UpdateProjectUseCaseOutput = Project;

export type UpdateProjectUseCaseException = UnexpectedError | NotFoundError;

export type UpdateProjectUseCaseResult = Result<
  UpdateProjectUseCaseOutput,
  UpdateProjectUseCaseException
>;

export type UpdateProjectUseCaseProps = {
  readonly projectRepository: ProjectRepository;
  readonly logger: Logger;
  readonly fetchNow: FetchNow;
};

export type UpdateProjectUseCase = UseCase<
  UpdateProjectUseCaseInput,
  UpdateProjectUseCaseOutput,
  UpdateProjectUseCaseException
>;

export class UpdateProjectUseCaseImpl implements UpdateProjectUseCase {
  readonly #props: UpdateProjectUseCaseProps;

  constructor(props: UpdateProjectUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: UpdateProjectUseCaseInput,
  ): Promise<UpdateProjectUseCaseResult> {
    const { projectRepository, logger, fetchNow } = this.#props;

    logger.debug("use-case: update-project-use-case", {
      projectId: input.projectId,
    });

    // 既存のプロジェクトを取得
    const findResult = await projectRepository.findById({
      id: input.projectId,
    });

    if (findResult.isErr()) {
      logger.error("プロジェクトの取得に失敗", findResult.error);
      return Result.err(findResult.error);
    }

    if (findResult.data === undefined) {
      const notFoundError = new NotFoundError(
        "プロジェクトが見つかりませんでした",
      );
      logger.error("プロジェクトが存在しません", {
        projectId: input.projectId,
      });
      return Result.err(notFoundError);
    }

    const now = dateToIsoString(fetchNow());

    // Result.map()によるメソッドチェーンでプロジェクトを更新
    const updatedResult = Result.ok(findResult.data)
      .map((p: Project) =>
        "name" in input && input.name !== undefined
          ? p.rename(input.name, now)
          : p,
      )
      .map((p: Project) =>
        "description" in input ? p.clarify(input.description, now) : p,
      )
      .map((p: Project) =>
        "color" in input && input.color !== undefined
          ? p.recolor(input.color, now)
          : p,
      );

    if (updatedResult.isErr()) {
      return updatedResult;
    }

    const saveResult = await projectRepository.save({
      project: updatedResult.data,
    });

    if (saveResult.isErr()) {
      logger.error("プロジェクトの保存に失敗", saveResult.error);
      return Result.err(saveResult.error);
    }

    logger.info("プロジェクト更新成功", {
      projectId: updatedResult.data.id,
    });

    return Result.ok(updatedResult.data);
  }
}
