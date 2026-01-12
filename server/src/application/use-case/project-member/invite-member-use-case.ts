import type { Logger } from "@/application/port/logger";
import type { FetchNow } from "@/application/port/fetch-now";
import type { ProjectMemberRepository } from "@/domain/model/project-member/project-member.repository";
import type { ProjectRepository } from "@/domain/model/project/project.repository";
import type { UserRepository } from "@/domain/model/user/user.repository";
import { ProjectMember } from "@/domain/model/project-member/project-member.entity";
import type { User } from "@/domain/model/user/user.entity";
import { MemberRole } from "@/domain/model/project-member/member-role.vo";
import { Result } from "@/util/result";
import {
  UnexpectedError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from "@/util/error-util";
import { dateToIsoString } from "@/util/date-util";
import type { UseCase } from "../interfaces";

export type InviteMemberUseCaseInput = {
  readonly projectId: string;
  readonly userId: string;
  readonly role?: "OWNER" | "MEMBER";
  readonly currentUserId: string;
};

export type InviteMemberWithUser = {
  readonly member: ProjectMember;
  readonly user: User;
};

export type InviteMemberUseCaseOutput = InviteMemberWithUser;

export type InviteMemberUseCaseException =
  | NotFoundError
  | ConflictError
  | ForbiddenError
  | UnexpectedError;

export type InviteMemberUseCaseResult = Result<
  InviteMemberUseCaseOutput,
  InviteMemberUseCaseException
>;

export type InviteMemberUseCaseProps = {
  readonly projectMemberRepository: ProjectMemberRepository;
  readonly projectRepository: ProjectRepository;
  readonly userRepository: UserRepository;
  readonly logger: Logger;
  readonly fetchNow: FetchNow;
};

export type InviteMemberUseCase = UseCase<
  InviteMemberUseCaseInput,
  InviteMemberUseCaseOutput,
  InviteMemberUseCaseException
>;

/**
 * メンバーを招待するユースケース
 *
 * プロジェクトに新しいメンバーを追加します。
 * オーナーのみが招待を実行できます。
 */
export class InviteMemberUseCaseImpl implements InviteMemberUseCase {
  readonly #props: InviteMemberUseCaseProps;

  constructor(props: InviteMemberUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: InviteMemberUseCaseInput,
  ): Promise<InviteMemberUseCaseResult> {
    const {
      projectMemberRepository,
      projectRepository,
      userRepository,
      logger,
      fetchNow,
    } = this.#props;
    const { projectId, userId, role, currentUserId } = input;

    logger.debug("ユースケース: メンバー招待を開始", { projectId, userId });

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

    // 現在のユーザーがオーナーかどうか確認
    const currentMemberResult =
      await projectMemberRepository.findByProjectIdAndUserId({
        projectId,
        userId: currentUserId,
      });
    if (currentMemberResult.isErr()) {
      logger.error("メンバー情報の取得に失敗", currentMemberResult.error);
      return Result.err(currentMemberResult.error);
    }
    if (currentMemberResult.data?.isOwner() !== true) {
      logger.warn("オーナー権限がありません", { currentUserId, projectId });
      return Result.err(new ForbiddenError("Only owner can invite members"));
    }

    // 招待するユーザーの存在確認
    const userResult = await userRepository.findById({ id: userId });
    if (userResult.isErr()) {
      logger.error("ユーザーの取得に失敗", userResult.error);
      return Result.err(userResult.error);
    }
    if (userResult.data === undefined) {
      logger.warn("ユーザーが見つかりません", { userId });
      return Result.err(new NotFoundError("User not found"));
    }

    // 既にメンバーかどうか確認
    const existingMemberResult =
      await projectMemberRepository.findByProjectIdAndUserId({
        projectId,
        userId,
      });
    if (existingMemberResult.isErr()) {
      logger.error("メンバー情報の取得に失敗", existingMemberResult.error);
      return Result.err(existingMemberResult.error);
    }
    if (existingMemberResult.data !== undefined) {
      logger.warn("既にメンバーです", { userId, projectId });
      return Result.err(new ConflictError("User is already a member"));
    }

    // メンバーロールの決定
    const memberRole = role === "OWNER" ? MemberRole.owner() : MemberRole.member();

    const now = dateToIsoString(fetchNow());

    // 新しいメンバーを作成
    const newMember = ProjectMember.from({
      id: projectMemberRepository.projectMemberId(),
      projectId,
      userId,
      role: memberRole,
      createdAt: now,
      updatedAt: now,
    });

    // 保存
    const saveResult = await projectMemberRepository.save({
      projectMember: newMember,
    });
    if (saveResult.isErr()) {
      logger.error("メンバーの保存に失敗", saveResult.error);
      return Result.err(saveResult.error);
    }

    logger.info("メンバー招待成功", {
      projectId,
      userId,
      memberId: newMember.id,
      role: memberRole.role,
    });

    return Result.ok({ member: newMember, user: userResult.data });
  }
}
