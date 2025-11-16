import type { Logger } from "@/domain/support/logger";
import type { Result } from "@/util/result";
import { UnexpectedError, ValidationError } from "@/util/error-util";
import type { ProjectRepository } from "@/domain/model/project/project-repository";
import type { Project } from "@/domain/model/project/project";
import { ProjectColor } from "@/domain/model/project/project-color";
import type { FetchNow } from "@/domain/support/fetch-now";
import { dateToIsoString } from "@/util/date-util";

export type UpdateProjectUseCaseInput = {
  projectId: string;
  name?: string;
  description?: string;
  color?: string;
};

export type UpdateProjectUseCaseOutput = Project;

export type UpdateProjectUseCaseException = UnexpectedError | ValidationError;

export type UpdateProjectUseCaseResult = Result<
  UpdateProjectUseCaseOutput,
  UpdateProjectUseCaseException
>;

export type UpdateProjectUseCaseProps = {
  projectRepository: ProjectRepository;
  logger: Logger;
  fetchNow: FetchNow;
};

export type UpdateProjectUseCase = {
  execute(
    input: UpdateProjectUseCaseInput,
  ): Promise<UpdateProjectUseCaseResult>;
};

export class UpdateProjectUseCaseImpl implements UpdateProjectUseCase {
  readonly #projectRepository: ProjectRepository;

  readonly #logger: Logger;

  readonly #fetchNow: FetchNow;

  constructor({
    projectRepository,
    logger,
    fetchNow,
  }: UpdateProjectUseCaseProps) {
    this.#projectRepository = projectRepository;
    this.#logger = logger;
    this.#fetchNow = fetchNow;
  }

  async execute(
    input: UpdateProjectUseCaseInput,
  ): Promise<UpdateProjectUseCaseResult> {
    this.#logger.debug("use-case: update-project-use-case", {
      projectId: input.projectId,
    });

    // 既存のプロジェクトを取得
    const findResult = await this.#projectRepository.findById({
      id: input.projectId,
    });

    if (!findResult.success) {
      this.#logger.error("プロジェクトの取得に失敗", findResult.error);
      return {
        success: false,
        error: findResult.error,
      };
    }

    if (findResult.data === undefined) {
      const notFoundError = new ValidationError(
        "プロジェクトが見つかりませんでした",
      );
      this.#logger.error("プロジェクトが存在しません", {
        projectId: input.projectId,
      });
      return {
        success: false,
        error: notFoundError,
      };
    }

    // カラーコードのバリデーション（更新がある場合のみ）
    let colorValue: ProjectColor | undefined;
    if (input.color !== undefined) {
      const colorResult = ProjectColor.fromString(input.color);
      if (!colorResult.success) {
        this.#logger.error(
          "カラーコードバリデーションエラー",
          colorResult.error,
        );
        return {
          success: false,
          error: colorResult.error,
        };
      }
      colorValue = colorResult.data;
    }

    const now = dateToIsoString(this.#fetchNow());

    // プロジェクトを更新
    const updatedProject = findResult.data.update({
      name: input.name,
      description: input.description,
      color: colorValue,
      updatedAt: now,
    });

    const saveResult = await this.#projectRepository.save({
      project: updatedProject,
    });

    if (!saveResult.success) {
      this.#logger.error("プロジェクトの保存に失敗", saveResult.error);
      return {
        success: false,
        error: saveResult.error,
      };
    }

    this.#logger.info("プロジェクト更新成功", {
      projectId: updatedProject.id,
    });

    return {
      success: true,
      data: updatedProject,
    };
  }
}
