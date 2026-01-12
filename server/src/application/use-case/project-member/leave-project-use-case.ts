import type { Logger } from "@/application/port/logger";
import type { ProjectMemberRepository } from "@/domain/model/project-member/project-member.repository";
import type { ProjectRepository } from "@/domain/model/project/project.repository";
import { Result } from "@/util/result";
import {
  UnexpectedError,
  NotFoundError,
  ConflictError,
} from "@/util/error-util";
import type { UseCase } from "../interfaces";

export type LeaveProjectUseCaseInput = {
  readonly projectId: string;
  readonly currentUserId: string;
};

export type LeaveProjectUseCaseOutput = void;

export type LeaveProjectUseCaseException =
  | NotFoundError
  | ConflictError
  | UnexpectedError;

export type LeaveProjectUseCaseResult = Result<
  LeaveProjectUseCaseOutput,
  LeaveProjectUseCaseException
>;

export type LeaveProjectUseCaseProps = {
  readonly projectMemberRepository: ProjectMemberRepository;
  readonly projectRepository: ProjectRepository;
  readonly logger: Logger;
};

export type LeaveProjectUseCase = UseCase<
  LeaveProjectUseCaseInput,
  LeaveProjectUseCaseOutput,
  LeaveProjectUseCaseException
>;

/**
 * プロジェクトから脱退するユースケース
 *
 * 現在のユーザーがプロジェクトから脱退します。
 * 最後のオーナーは脱退できません。
 */
export class LeaveProjectUseCaseImpl implements LeaveProjectUseCase {
  readonly #props: LeaveProjectUseCaseProps;

  constructor(props: LeaveProjectUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: LeaveProjectUseCaseInput,
  ): Promise<LeaveProjectUseCaseResult> {
    const { projectMemberRepository, projectRepository, logger } = this.#props;
    const { projectId, currentUserId } = input;

    logger.debug("ユースケース: プロジェクト脱退を開始", {
      projectId,
      currentUserId,
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

    // 現在のユーザーのメンバー情報を取得
    const memberResult =
      await projectMemberRepository.findByProjectIdAndUserId({
        projectId,
        userId: currentUserId,
      });
    if (memberResult.isErr()) {
      logger.error("メンバー情報の取得に失敗", memberResult.error);
      return Result.err(memberResult.error);
    }
    if (memberResult.data === undefined) {
      logger.warn("メンバーではありません", { projectId, currentUserId });
      return Result.err(new NotFoundError("Not a member of this project"));
    }

    const member = memberResult.data;

    // オーナーの場合、最後のオーナーかどうか確認
    if (member.isOwner()) {
      const ownerCountResult =
        await projectMemberRepository.countOwnersByProjectId({ projectId });
      if (ownerCountResult.isErr()) {
        logger.error("オーナー数の取得に失敗", ownerCountResult.error);
        return Result.err(ownerCountResult.error);
      }
      if (ownerCountResult.data <= 1) {
        logger.warn("最後のオーナーは脱退できません", {
          projectId,
          currentUserId,
        });
        return Result.err(
          new ConflictError(
            "Cannot leave as the last owner. Please promote another member to owner first.",
          ),
        );
      }
    }

    // 脱退実行
    const removeResult = await projectMemberRepository.remove({
      id: member.id,
    });
    if (removeResult.isErr()) {
      logger.error("メンバーの削除に失敗", removeResult.error);
      return Result.err(removeResult.error);
    }

    logger.info("プロジェクト脱退成功", {
      projectId,
      currentUserId,
      memberId: member.id,
    });

    return Result.ok(undefined);
  }
}
