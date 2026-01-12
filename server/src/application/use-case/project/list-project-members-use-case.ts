import { NotFoundError, UnexpectedError } from "@/util/error-util";
import type { ProjectRepository } from "@/domain/model/project/project.repository";
import type { ProjectMember } from "@/domain/model/project/project-member.entity";
import type { UserRepository } from "@/domain/model/user/user.repository";
import type { User } from "@/domain/model/user/user.entity";
import { Result } from "@/util/result";
import type { UseCase } from "../interfaces";
import type { Logger } from "@/application/port/logger";

export type ListProjectMembersUseCaseInput = {
  projectId: string;
};

export type MemberWithUser = {
  member: ProjectMember;
  user: User;
};

export type ListProjectMembersUseCaseOutput = MemberWithUser[];

export type ListProjectMembersUseCaseException = NotFoundError | UnexpectedError;

export type ListProjectMembersUseCaseResult = Result<
  ListProjectMembersUseCaseOutput,
  ListProjectMembersUseCaseException
>;

export type ListProjectMembersUseCaseProps = {
  readonly projectRepository: ProjectRepository;
  readonly userRepository: UserRepository;
  readonly logger: Logger;
};

export type ListProjectMembersUseCase = UseCase<
  ListProjectMembersUseCaseInput,
  ListProjectMembersUseCaseOutput,
  ListProjectMembersUseCaseException
>;

export class ListProjectMembersUseCaseImpl
  implements ListProjectMembersUseCase
{
  readonly #props: ListProjectMembersUseCaseProps;

  constructor(props: ListProjectMembersUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: ListProjectMembersUseCaseInput,
  ): Promise<ListProjectMembersUseCaseResult> {
    const { projectRepository, userRepository, logger } = this.#props;

    logger.debug("ユースケース: プロジェクトメンバー一覧取得を開始", {
      projectId: input.projectId,
    });

    const projectResult = await projectRepository.findById({
      id: input.projectId,
    });
    if (projectResult.isErr()) {
      logger.error("プロジェクトの取得に失敗", projectResult.error);
      return Result.err(projectResult.error);
    }

    if (projectResult.data === undefined) {
      logger.debug("プロジェクトが見つかりませんでした", {
        projectId: input.projectId,
      });
      return Result.err(
        new NotFoundError("プロジェクトが見つかりませんでした"),
      );
    }

    const members = projectResult.data.members;

    // メンバーのユーザー情報を取得
    const userIds = members.map((m) => m.userId);
    const usersResult = await userRepository.findByIds({ ids: userIds });
    if (usersResult.isErr()) {
      logger.error("ユーザー情報の取得に失敗", usersResult.error);
      return Result.err(usersResult.error);
    }

    const usersMap = new Map(usersResult.data.map((u) => [u.id, u]));

    // メンバーとユーザー情報を結合
    const membersWithUsers: MemberWithUser[] = [];
    for (const member of members) {
      const user = usersMap.get(member.userId);
      if (user === undefined) {
        logger.error("メンバーに対応するユーザーが見つかりません", {
          memberId: member.id,
          userId: member.userId,
        });
        return Result.err(
          new UnexpectedError("メンバーに対応するユーザーが見つかりません"),
        );
      }
      membersWithUsers.push({ member, user });
    }

    logger.debug("プロジェクトメンバー一覧取得完了", {
      projectId: input.projectId,
      memberCount: membersWithUsers.length,
    });

    return Result.ok(membersWithUsers);
  }
}
