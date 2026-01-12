import type { Logger } from "@/application/port/logger";
import type { FetchNow } from "@/application/port/fetch-now";
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
  ConflictError,
} from "@/util/error-util";
import { dateToIsoString } from "@/util/date-util";
import type { UseCase } from "../interfaces";

export type ChangeMemberRoleUseCaseInput = {
  readonly projectId: string;
  readonly targetMemberId: string;
  readonly newRole: "OWNER" | "MEMBER";
  readonly currentUserId: string;
};

export type ChangeMemberRoleWithUser = {
  readonly member: ProjectMember;
  readonly user: User;
};

export type ChangeMemberRoleUseCaseOutput = ChangeMemberRoleWithUser;

export type ChangeMemberRoleUseCaseException =
  | NotFoundError
  | ForbiddenError
  | ConflictError
  | UnexpectedError;

export type ChangeMemberRoleUseCaseResult = Result<
  ChangeMemberRoleUseCaseOutput,
  ChangeMemberRoleUseCaseException
>;

export type ChangeMemberRoleUseCaseProps = {
  readonly projectMemberRepository: ProjectMemberRepository;
  readonly projectRepository: ProjectRepository;
  readonly userRepository: UserRepository;
  readonly logger: Logger;
  readonly fetchNow: FetchNow;
};

export type ChangeMemberRoleUseCase = UseCase<
  ChangeMemberRoleUseCaseInput,
  ChangeMemberRoleUseCaseOutput,
  ChangeMemberRoleUseCaseException
>;

/**
 * メンバーロールを変更するユースケース
 *
 * メンバーをオーナーに昇格、またはオーナーをメンバーに降格します。
 * オーナーのみがロール変更を実行できます。
 * 最後のオーナーは降格できません。
 */
export class ChangeMemberRoleUseCaseImpl implements ChangeMemberRoleUseCase {
  readonly #props: ChangeMemberRoleUseCaseProps;

  constructor(props: ChangeMemberRoleUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: ChangeMemberRoleUseCaseInput,
  ): Promise<ChangeMemberRoleUseCaseResult> {
    const {
      projectMemberRepository,
      projectRepository,
      userRepository,
      logger,
      fetchNow,
    } = this.#props;
    const { projectId, targetMemberId, newRole, currentUserId } = input;

    logger.debug("ユースケース: メンバーロール変更を開始", {
      projectId,
      targetMemberId,
      newRole,
    });

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
      return Result.err(
        new ForbiddenError("Only owner can change member roles"),
      );
    }

    // 対象メンバーを取得
    const targetMemberResult = await projectMemberRepository.findById({
      id: targetMemberId,
    });
    if (targetMemberResult.isErr()) {
      logger.error("メンバー情報の取得に失敗", targetMemberResult.error);
      return Result.err(targetMemberResult.error);
    }
    if (targetMemberResult.data === undefined) {
      logger.warn("対象メンバーが見つかりません", { projectId, targetMemberId });
      return Result.err(new NotFoundError("Member not found"));
    }

    const targetMember = targetMemberResult.data;

    // メンバーが指定されたプロジェクトに所属しているか確認
    if (targetMember.projectId !== projectId) {
      logger.warn("メンバーが指定プロジェクトに所属していません", {
        projectId,
        targetMemberId,
        memberProjectId: targetMember.projectId,
      });
      return Result.err(new NotFoundError("Member not found"));
    }

    const now = dateToIsoString(fetchNow());

    // ユーザー情報を取得
    const userResult = await userRepository.findById({ id: targetMember.userId });
    if (userResult.isErr()) {
      logger.error("ユーザー情報の取得に失敗", userResult.error);
      return Result.err(userResult.error);
    }
    if (userResult.data === undefined) {
      logger.warn("ユーザーが見つかりません", { userId: targetMember.userId });
      return Result.err(new NotFoundError("User not found"));
    }
    const user = userResult.data;

    // 昇格の場合
    if (newRole === "OWNER") {
      if (targetMember.isOwner()) {
        logger.warn("既にオーナーです", { projectId, targetMemberId });
        return Result.err(new ConflictError("Member is already an owner"));
      }
      const promotedMember = targetMember.promote(now);
      const saveResult = await projectMemberRepository.save({
        projectMember: promotedMember,
      });
      if (saveResult.isErr()) {
        logger.error("メンバーの保存に失敗", saveResult.error);
        return Result.err(saveResult.error);
      }
      logger.info("メンバーを昇格しました", { projectId, targetMemberId });
      return Result.ok({ member: promotedMember, user });
    }

    // 降格の場合
    if (targetMember.isMember()) {
      logger.warn("既にメンバーです", { projectId, targetMemberId });
      return Result.err(new ConflictError("Member is already a member"));
    }

    // 最後のオーナーかどうか確認
    const ownerCountResult =
      await projectMemberRepository.countOwnersByProjectId({ projectId });
    if (ownerCountResult.isErr()) {
      logger.error("オーナー数の取得に失敗", ownerCountResult.error);
      return Result.err(ownerCountResult.error);
    }
    if (ownerCountResult.data <= 1) {
      logger.warn("最後のオーナーは降格できません", { projectId, targetMemberId });
      return Result.err(
        new ConflictError("Cannot demote the last owner of the project"),
      );
    }

    const demotedMember = targetMember.demote(now);
    const saveResult = await projectMemberRepository.save({
      projectMember: demotedMember,
    });
    if (saveResult.isErr()) {
      logger.error("メンバーの保存に失敗", saveResult.error);
      return Result.err(saveResult.error);
    }

    logger.info("メンバーを降格しました", { projectId, targetMemberId });
    return Result.ok({ member: demotedMember, user });
  }
}
