import type { Logger } from "@/application/port/logger";
import type { FetchNow } from "@/application/port/fetch-now";
import { Result } from "@/util/result";
import type { UseCase } from "../interfaces";
import {
  ForbiddenError,
  NotFoundError,
  UnexpectedError,
  ValidationError,
} from "@/util/error-util";
import type { ProjectRepository } from "@/domain/model/project/project.repository";
import type { UserRepository } from "@/domain/model/user/user.repository";
import type { Project } from "@/domain/model/project/project.entity";
import { dateToIsoString } from "@/util/date-util";

export type RemoveMemberUseCaseInput = {
  projectId: string;
  targetUserId: string;
  operatorSub: string;
};

export type RemoveMemberUseCaseOutput = Project;

export type RemoveMemberUseCaseException =
  | NotFoundError
  | ForbiddenError
  | ValidationError
  | UnexpectedError;

export type RemoveMemberUseCaseResult = Result<
  RemoveMemberUseCaseOutput,
  RemoveMemberUseCaseException
>;

export type RemoveMemberUseCaseProps = {
  readonly projectRepository: ProjectRepository;
  readonly userRepository: UserRepository;
  readonly logger: Logger;
  readonly fetchNow: FetchNow;
};

export type RemoveMemberUseCase = UseCase<
  RemoveMemberUseCaseInput,
  RemoveMemberUseCaseOutput,
  RemoveMemberUseCaseException
>;

export class RemoveMemberUseCaseImpl implements RemoveMemberUseCase {
  readonly #props: RemoveMemberUseCaseProps;

  constructor(props: RemoveMemberUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: RemoveMemberUseCaseInput,
  ): Promise<RemoveMemberUseCaseResult> {
    const { projectRepository, userRepository, logger, fetchNow } = this.#props;
    const { projectId, targetUserId, operatorSub } = input;

    logger.debug("ユースケース: メンバー削除を開始", {
      projectId,
      targetUserId,
      operatorSub,
    });

    // 1. 操作者を検索
    const operatorResult = await userRepository.findBySub({ sub: operatorSub });
    if (operatorResult.isErr()) {
      logger.error("操作者の取得に失敗", operatorResult.error);
      return Result.err(operatorResult.error);
    }

    if (operatorResult.data === undefined) {
      logger.debug("操作者が見つかりませんでした", { operatorSub });
      return Result.err(new NotFoundError("操作者が見つかりませんでした"));
    }

    const operatorUserId = operatorResult.data.id;

    // 2. プロジェクトの取得
    const projectResult = await projectRepository.findById({ id: projectId });
    if (projectResult.isErr()) {
      logger.error("プロジェクトの取得に失敗", projectResult.error);
      return Result.err(projectResult.error);
    }

    if (projectResult.data === undefined) {
      logger.debug("プロジェクトが見つかりませんでした", { projectId });
      return Result.err(
        new NotFoundError("プロジェクトが見つかりませんでした"),
      );
    }

    const project = projectResult.data;

    // 3. 操作者がオーナーか確認
    const operatorMember = project.findMemberByUserId(operatorUserId);
    if (operatorMember === undefined) {
      logger.debug("操作者がプロジェクトのメンバーではありません", {
        projectId,
        operatorUserId,
      });
      return Result.err(
        new ForbiddenError("オーナーのみがメンバーを削除できます"),
      );
    }
    if (!operatorMember.isOwner()) {
      logger.debug("操作者がオーナーではありません", {
        projectId,
        operatorUserId,
      });
      return Result.err(
        new ForbiddenError("オーナーのみがメンバーを削除できます"),
      );
    }

    // 4. 削除対象のメンバーを検索
    const targetMember = project.findMemberByUserId(targetUserId);

    // 5. メンバーが存在しない場合はスキップ（冪等）
    if (targetMember === undefined) {
      logger.debug("削除対象のメンバーは既に存在しません", {
        projectId,
        targetUserId,
      });
      return Result.ok(project);
    }

    // 6. オーナーは削除不可
    if (targetMember.isOwner()) {
      logger.debug("オーナーは削除できません", {
        projectId,
        targetUserId,
      });
      return Result.err(new ValidationError("オーナーは削除できません"));
    }

    // 7. メンバーを削除
    const now = dateToIsoString(fetchNow());
    const updatedProject = project.removeMember(targetMember.id, now);

    // 8. 保存
    const saveResult = await projectRepository.save({ project: updatedProject });
    if (saveResult.isErr()) {
      logger.error("プロジェクトの保存に失敗", saveResult.error);
      return Result.err(saveResult.error);
    }

    logger.info("メンバー削除成功", {
      projectId,
      targetUserId,
      memberId: targetMember.id,
    });

    return Result.ok(updatedProject);
  }
}
