import { UnexpectedError, NotFoundError, ForbiddenError } from "@/util/error-util";
import type { ProjectRepository } from "@/domain/model/project/project.repository";
import type { ProjectMemberRepository } from "@/domain/model/project-member/project-member.repository";
import type { Project } from "@/domain/model/project/project.entity";
import type { MemberRole } from "@/domain/model/project-member/member-role.vo";
import { Result } from "@/util/result";
import type { UseCase } from "../interfaces";
import type { Logger } from "@/application/port/logger";

export type GetProjectUseCaseInput = {
  projectId: string;
  currentUserId: string;
};

export type GetProjectUseCaseOutput = {
  project: Project;
  myRole: MemberRole;
};

export type GetProjectUseCaseException =
  | NotFoundError
  | ForbiddenError
  | UnexpectedError;

export type GetProjectUseCaseResult = Result<
  GetProjectUseCaseOutput,
  GetProjectUseCaseException
>;

export type GetProjectUseCaseProps = {
  readonly projectRepository: ProjectRepository;
  readonly projectMemberRepository: ProjectMemberRepository;
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
    const { projectRepository, projectMemberRepository, logger } = this.#props;
    const { projectId, currentUserId } = input;

    logger.debug("ユースケース: プロジェクト取得を開始", { projectId });

    // プロジェクトの取得
    const projectResult = await projectRepository.findById({ id: projectId });
    if (projectResult.isErr()) {
      logger.error("プロジェクトの取得に失敗", projectResult.error);
      return Result.err(projectResult.error);
    }

    if (projectResult.data === undefined) {
      logger.debug("プロジェクトが見つかりませんでした", { projectId });
      return Result.err(new NotFoundError("Project not found"));
    }

    // 現在のユーザーのメンバー情報を取得
    const memberResult = await projectMemberRepository.findByProjectIdAndUserId({
      projectId,
      userId: currentUserId,
    });
    if (memberResult.isErr()) {
      logger.error("メンバー情報の取得に失敗", memberResult.error);
      return Result.err(memberResult.error);
    }

    if (memberResult.data === undefined) {
      logger.warn("プロジェクトのメンバーではありません", {
        projectId,
        currentUserId,
      });
      return Result.err(
        new ForbiddenError("You are not a member of this project"),
      );
    }

    logger.debug("プロジェクト取得完了", { projectId });

    return Result.ok({
      project: projectResult.data,
      myRole: memberResult.data.role,
    });
  }
}
