import { UnexpectedError } from "@/util/error-util";
import type { ProjectRepository } from "@/domain/model/project/project.repository";
import type { Project } from "@/domain/model/project/project.entity";
import { Result } from "@/util/result";
import type { UseCase } from "../interfaces";
import type { Logger } from "@/application/port/logger";

export type GetProjectUseCaseInput = {
  projectId: string;
};

export type GetProjectUseCaseOutput = Project | undefined;

export type GetProjectUseCaseException = UnexpectedError;

export type GetProjectUseCaseResult = Result<
  GetProjectUseCaseOutput,
  GetProjectUseCaseException
>;

export type GetProjectUseCaseProps = {
  readonly projectRepository: ProjectRepository;
  readonly logger: Logger;
};

export type GetProjectUseCase = UseCase<
  GetProjectUseCaseInput,
  GetProjectUseCaseOutput,
  GetProjectUseCaseException
>;

export class GetProjectUseCaseImpl implements GetProjectUseCase {
  readonly #props: GetProjectUseCaseProps;

  constructor(props: GetProjectUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: GetProjectUseCaseInput,
  ): Promise<GetProjectUseCaseResult> {
    const { projectRepository, logger } = this.#props;

    logger.debug("ユースケース: プロジェクト取得を開始", {
      projectId: input.projectId,
    });

    const result = await projectRepository.findById({ id: input.projectId });
    if (result.isErr()) {
      logger.error("プロジェクトの取得に失敗", result.error);
      return Result.err(result.error);
    }

    if (result.data !== undefined) {
      logger.debug("プロジェクト取得完了", { projectId: result.data.id });
    } else {
      logger.debug("プロジェクトが見つかりませんでした", {
        projectId: input.projectId,
      });
    }

    return Result.ok(result.data);
  }
}
