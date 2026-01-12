import type { Logger } from "@/application/port/logger";
import type { ProjectMemberRepository } from "@/domain/model/project-member/project-member.repository";
import type { ProjectRepository } from "@/domain/model/project/project.repository";
import { Result } from "@/util/result";
import {
  UnexpectedError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "@/util/error-util";
import type { UseCase } from "../interfaces";

export type RemoveMemberUseCaseInput = {
  readonly projectId: string;
  readonly targetMemberId: string;
  readonly currentUserId: string;
};

export type RemoveMemberUseCaseOutput = void;

export type RemoveMemberUseCaseException =
  | NotFoundError
  | ForbiddenError
  | ConflictError
  | UnexpectedError;

export type RemoveMemberUseCaseResult = Result<
  RemoveMemberUseCaseOutput,
  RemoveMemberUseCaseException
>;

export type RemoveMemberUseCaseProps = {
  readonly projectMemberRepository: ProjectMemberRepository;
  readonly projectRepository: ProjectRepository;
  readonly logger: Logger;
};

export type RemoveMemberUseCase = UseCase<
  RemoveMemberUseCaseInput,
  RemoveMemberUseCaseOutput,
  RemoveMemberUseCaseException
>;

/**
 * メンバーを削除するユースケース
 *
 * プロジェクトからメンバーを削除します。
 * オーナーのみが削除を実行できます。
 * 最後のオーナーは削除できません。
 */
export class RemoveMemberUseCaseImpl implements RemoveMemberUseCase {
  readonly #props: RemoveMemberUseCaseProps;

  constructor(props: RemoveMemberUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: RemoveMemberUseCaseInput,
  ): Promise<RemoveMemberUseCaseResult> {
    const { projectMemberRepository, projectRepository, logger } = this.#props;
    const { projectId, targetMemberId, currentUserId } = input;

    logger.debug("ユースケース: メンバー削除を開始", { projectId, targetMemberId });

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
      return Result.err(new ForbiddenError("Only owner can remove members"));
    }

    // 削除対象のメンバーを取得
    const targetMemberResult = await projectMemberRepository.findById({
      id: targetMemberId,
    });
    if (targetMemberResult.isErr()) {
      logger.error("メンバー情報の取得に失敗", targetMemberResult.error);
      return Result.err(targetMemberResult.error);
    }
    if (targetMemberResult.data === undefined) {
      // 既に存在しない場合は成功として扱う（冪等性）
      logger.info("メンバーが既に存在しません（冪等）", {
        projectId,
        targetMemberId,
      });
      return Result.ok(undefined);
    }

    // メンバーが指定されたプロジェクトに所属しているか確認
    if (targetMemberResult.data.projectId !== projectId) {
      // 異なるプロジェクトのメンバーは存在しないとして扱う
      logger.info("メンバーが指定プロジェクトに所属していません（冪等）", {
        projectId,
        targetMemberId,
        memberProjectId: targetMemberResult.data.projectId,
      });
      return Result.ok(undefined);
    }

    // 削除対象がオーナーの場合、他にオーナーがいるか確認
    if (targetMemberResult.data.isOwner()) {
      const ownerCountResult =
        await projectMemberRepository.countOwnersByProjectId({ projectId });
      if (ownerCountResult.isErr()) {
        logger.error("オーナー数の取得に失敗", ownerCountResult.error);
        return Result.err(ownerCountResult.error);
      }
      if (ownerCountResult.data <= 1) {
        logger.warn("最後のオーナーは削除できません", { projectId, targetMemberId });
        return Result.err(
          new ConflictError("Cannot remove the last owner of the project"),
        );
      }
    }

    // 削除実行
    const removeResult = await projectMemberRepository.remove({
      id: targetMemberResult.data.id,
    });
    if (removeResult.isErr()) {
      logger.error("メンバーの削除に失敗", removeResult.error);
      return Result.err(removeResult.error);
    }

    logger.info("メンバー削除成功", {
      projectId,
      targetMemberId,
      memberId: targetMemberResult.data.id,
    });

    return Result.ok(undefined);
  }
}
