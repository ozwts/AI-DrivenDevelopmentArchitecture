import { UnexpectedError } from "@/util/error-util";
import type { ProjectRepository } from "@/domain/model/project/project.repository";
import type { Project } from "@/domain/model/project/project.entity";
import { Result } from "@/util/result";
import type { UseCase } from "../interfaces";
import type { Logger } from "@/application/port/logger";

export type ListProjectsUseCaseInput = Record<string, never>;

export type ListProjectsUseCaseOutput = readonly Project[];

export type ListProjectsUseCaseException = UnexpectedError;

export type ListProjectsUseCaseResult = Result<
  ListProjectsUseCaseOutput,
  ListProjectsUseCaseException
>;

export type ListProjectsUseCaseProps = {
  readonly projectRepository: ProjectRepository;
  readonly logger: Logger;
};

export type ListProjectsUseCase = UseCase<
  ListProjectsUseCaseInput,
  ListProjectsUseCaseOutput,
  ListProjectsUseCaseException
>;

export class ListProjectsUseCaseImpl implements ListProjectsUseCase {
  readonly #props: ListProjectsUseCaseProps;

  constructor(props: ListProjectsUseCaseProps) {
    this.#props = props;
  }

  async execute(): Promise<ListProjectsUseCaseResult> {
    const { projectRepository, logger } = this.#props;

    logger.debug("ユースケース: プロジェクト一覧取得を開始");

    const result = await projectRepository.findAll();
    if (result.isErr()) {
      logger.error("プロジェクト一覧の取得に失敗", result.error);
      return Result.err(result.error);
    }

    logger.debug("プロジェクト一覧取得完了", { count: result.data.length });

    return Result.ok(result.data);
  }
}
