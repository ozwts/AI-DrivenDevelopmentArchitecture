import type { Logger } from "@/application/port/logger";
import type { ProjectMemberRepository } from "@/domain/model/project-member/project-member.repository";
import type { ProjectRepository } from "@/domain/model/project/project.repository";
import type { UserRepository } from "@/domain/model/user/user.repository";
import type { ProjectMember } from "@/domain/model/project-member/project-member.entity";
import type { User } from "@/domain/model/user/user.entity";
import { Result } from "@/util/result";
import {
  UnexpectedError,
  NotFoundError,
  ForbiddenError,
} from "@/util/error-util";
import type { UseCase } from "../interfaces";

export type ListMembersUseCaseInput = {
  readonly projectId: string;
  readonly currentUserId: string;
};

export type MemberWithUser = {
  readonly member: ProjectMember;
  readonly user: User;
};

export type ListMembersUseCaseOutput = MemberWithUser[];

export type ListMembersUseCaseException =
  | NotFoundError
  | ForbiddenError
  | UnexpectedError;

export type ListMembersUseCaseResult = Result<
  ListMembersUseCaseOutput,
  ListMembersUseCaseException
>;

export type ListMembersUseCaseProps = {
  readonly projectMemberRepository: ProjectMemberRepository;
  readonly projectRepository: ProjectRepository;
  readonly userRepository: UserRepository;
  readonly logger: Logger;
};

export type ListMembersUseCase = UseCase<
  ListMembersUseCaseInput,
  ListMembersUseCaseOutput,
  ListMembersUseCaseException
>;

/**
 * プロジェクトメンバー一覧を取得するユースケース
 *
 * 指定したプロジェクトのメンバー一覧を取得します。
 * プロジェクトのメンバーのみが一覧を取得できます。
 */
export class ListMembersUseCaseImpl implements ListMembersUseCase {
  readonly #props: ListMembersUseCaseProps;

  constructor(props: ListMembersUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: ListMembersUseCaseInput,
  ): Promise<ListMembersUseCaseResult> {
    const { projectMemberRepository, projectRepository, userRepository, logger } =
      this.#props;
    const { projectId, currentUserId } = input;

    logger.debug("ユースケース: メンバー一覧取得を開始", { projectId });

    // プロジェクトの存在確認
    const projectResult = await projectRepository.findById({ id: projectId });
    if (projectResult.isErr()) {
      logger.error("プロジェクトの取得に失敗", projectResult.error);
      return Result.err(projectResult.error);
    }
    if (projectResult.data === undefined) {
      logger.warn("プロジェクトが見つかりません", { projectId });
      return Result.err(new NotFoundError("Project not found"));
    }

    // 現在のユーザーがメンバーかどうか確認
    const currentMemberResult =
      await projectMemberRepository.findByProjectIdAndUserId({
        projectId,
        userId: currentUserId,
      });
    if (currentMemberResult.isErr()) {
      logger.error("メンバー情報の取得に失敗", currentMemberResult.error);
      return Result.err(currentMemberResult.error);
    }
    if (currentMemberResult.data === undefined) {
      logger.warn("メンバーではありません", { currentUserId, projectId });
      return Result.err(
        new ForbiddenError("Only members can view member list"),
      );
    }

    // メンバー一覧を取得
    const membersResult = await projectMemberRepository.findByProjectId({
      projectId,
    });
    if (membersResult.isErr()) {
      logger.error("メンバー一覧の取得に失敗", membersResult.error);
      return Result.err(membersResult.error);
    }

    // 各メンバーのユーザー情報を取得
    const membersWithUsers: MemberWithUser[] = [];
    for (const member of membersResult.data) {
      const userResult = await userRepository.findById({ id: member.userId });
      if (userResult.isErr()) {
        logger.error("ユーザー情報の取得に失敗", userResult.error);
        return Result.err(userResult.error);
      }
      if (userResult.data !== undefined) {
        membersWithUsers.push({ member, user: userResult.data });
      }
    }

    logger.debug("メンバー一覧取得成功", {
      projectId,
      count: membersWithUsers.length,
    });

    return Result.ok(membersWithUsers);
  }
}
