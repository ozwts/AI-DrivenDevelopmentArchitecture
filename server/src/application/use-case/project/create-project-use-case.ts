import type { Logger } from "@/application/port/logger";
import { Result } from "@/util/result";
import type { UseCase } from "../interfaces";
import { UnexpectedError } from "@/util/error-util";
import type { ProjectRepository } from "@/domain/model/project/project.repository";
import { Project } from "@/domain/model/project/project.entity";
import type { FetchNow } from "@/application/port/fetch-now";
import { dateToIsoString } from "@/util/date-util";

export type CreateProjectUseCaseInput = {
  name: string;
  description?: string;
  color: string;
};

export type CreateProjectUseCaseOutput = Project;

export type CreateProjectUseCaseException = UnexpectedError;

export type CreateProjectUseCaseResult = Result<
  CreateProjectUseCaseOutput,
  CreateProjectUseCaseException
>;

export type CreateProjectUseCaseProps = {
  readonly projectRepository: ProjectRepository;
  readonly logger: Logger;
  readonly fetchNow: FetchNow;
};

export type CreateProjectUseCase = UseCase<
  CreateProjectUseCaseInput,
  CreateProjectUseCaseOutput,
  CreateProjectUseCaseException
>;

export class CreateProjectUseCaseImpl implements CreateProjectUseCase {
  readonly #props: CreateProjectUseCaseProps;

  constructor(props: CreateProjectUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: CreateProjectUseCaseInput,
  ): Promise<CreateProjectUseCaseResult> {
    const { projectRepository, logger, fetchNow } = this.#props;

    logger.debug("use-case: create-project-use-case");

    const { name, description, color } = input;

    const now = dateToIsoString(fetchNow());

    // プロジェクトの登録
    const newProject = Project.from({
      id: projectRepository.projectId(),
      name,
      description,
      color,
      createdAt: now,
      updatedAt: now,
    });

    const saveResult = await projectRepository.save({
      project: newProject,
    });

    if (saveResult.isErr()) {
      logger.error("プロジェクトの保存に失敗", saveResult.error);
      return Result.err(saveResult.error);
    }

    logger.info("プロジェクト登録成功", {
      projectId: newProject.id,
      name: newProject.name,
    });

    return Result.ok(newProject);
  }
}
