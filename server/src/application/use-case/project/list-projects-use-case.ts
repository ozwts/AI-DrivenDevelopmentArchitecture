import { UnexpectedError } from "@/util/error-util";
import type { ProjectRepository } from "@/domain/model/project/project.repository";
import type { ProjectMemberRepository } from "@/domain/model/project-member/project-member.repository";
import type { Project } from "@/domain/model/project/project.entity";
import type { MemberRole } from "@/domain/model/project-member/member-role.vo";
import { Result } from "@/util/result";
import type { UseCase } from "../interfaces";
import type { Logger } from "@/application/port/logger";

export type ProjectWithRole = {
  project: Project;
  myRole: MemberRole;
};

export type ListProjectsUseCaseInput = {
  currentUserId: string;
};

export type ListProjectsUseCaseOutput = readonly ProjectWithRole[];

export type ListProjectsUseCaseException = UnexpectedError;

export type ListProjectsUseCaseResult = Result<
  ListProjectsUseCaseOutput,
  ListProjectsUseCaseException
>;

export type ListProjectsUseCaseProps = {
  readonly projectRepository: ProjectRepository;
  readonly projectMemberRepository: ProjectMemberRepository;
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

  async execute(
    input: ListProjectsUseCaseInput,
  ): Promise<ListProjectsUseCaseResult> {
    const { projectRepository, projectMemberRepository, logger } = this.#props;
    const { currentUserId } = input;

    logger.debug("ユースケース: プロジェクト一覧取得を開始", { currentUserId });

    // ユーザーのメンバーシップ一覧を取得
    const membershipsResult =
      await projectMemberRepository.findByUserId({ userId: currentUserId });
    if (membershipsResult.isErr()) {
      logger.error("メンバーシップ一覧の取得に失敗", membershipsResult.error);
      return Result.err(membershipsResult.error);
    }

    const memberships = membershipsResult.data;
    if (memberships.length === 0) {
      logger.debug("プロジェクト一覧取得完了（メンバーシップなし）");
      return Result.ok([]);
    }

    // メンバーシップからプロジェクトIDとロールのマップを作成
    const roleByProjectId = new Map(
      memberships.map((m) => [m.projectId, m.role]),
    );

    // プロジェクトを取得
    const projectIds = Array.from(roleByProjectId.keys());
    const projectsResult = await projectRepository.findByIds({ ids: projectIds });
    if (projectsResult.isErr()) {
      logger.error("プロジェクト一覧の取得に失敗", projectsResult.error);
      return Result.err(projectsResult.error);
    }

    // プロジェクトとロールを結合
    const projectsWithRoles: ProjectWithRole[] = projectsResult.data.flatMap(
      (project) => {
        const myRole = roleByProjectId.get(project.id);
        if (myRole === undefined) {
          return [];
        }
        return [{ project, myRole }];
      },
    );

    logger.debug("プロジェクト一覧取得完了", {
      count: projectsWithRoles.length,
    });

    return Result.ok(projectsWithRoles);
  }
}
