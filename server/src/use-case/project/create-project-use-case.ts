import type { Logger } from "@/domain/support/logger";
import type { Result } from "@/util/result";
import type { UseCase } from "../interfaces";
import { UnexpectedError, ValidationError } from "@/util/error-util";
import type { ProjectRepository } from "@/domain/model/project/project.repository";
import { Project } from "@/domain/model/project/project";
import type { FetchNow } from "@/domain/support/fetch-now";
import { dateToIsoString } from "@/util/date-util";

export type CreateProjectUseCaseInput = {
  name: string;
  description?: string;
  color: string;
};

export type CreateProjectUseCaseOutput = Project;

export type CreateProjectUseCaseException = UnexpectedError | ValidationError;

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
  readonly #projectRepository: ProjectRepository;

  readonly #logger: Logger;

  readonly #fetchNow: FetchNow;

  constructor({
    projectRepository,
    logger,
    fetchNow,
  }: CreateProjectUseCaseProps) {
    this.#projectRepository = projectRepository;
    this.#logger = logger;
    this.#fetchNow = fetchNow;
  }

  async execute(
    input: CreateProjectUseCaseInput,
  ): Promise<CreateProjectUseCaseResult> {
    this.#logger.debug("use-case: create-project-use-case");

    const { name, description, color } = input;

    // バリデーション: プロジェクト名
    if (name.length === 0 || name.trim().length === 0) {
      const validationError = new ValidationError(
        "プロジェクト名を入力してください",
      );
      this.#logger.error("バリデーションエラー", validationError);
      return {
        success: false,
        error: validationError,
      };
    }

    const now = dateToIsoString(this.#fetchNow());

    // プロジェクトの登録
    const newProject = new Project({
      id: this.#projectRepository.projectId(),
      name,
      description,
      color,
      createdAt: now,
      updatedAt: now,
    });

    const saveResult = await this.#projectRepository.save({
      project: newProject,
    });

    if (!saveResult.success) {
      this.#logger.error("プロジェクトの保存に失敗", saveResult.error);
      return {
        success: false,
        error: saveResult.error,
      };
    }

    this.#logger.info("プロジェクト登録成功", {
      projectId: newProject.id,
      name: newProject.name,
    });

    return {
      success: true,
      data: newProject,
    };
  }
}
