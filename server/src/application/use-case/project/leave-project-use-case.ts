import type { Logger } from "@/application/port/logger";
import type { FetchNow } from "@/application/port/fetch-now";
import { Result } from "@/util/result";
import type { UseCase } from "../interfaces";
import {
  NotFoundError,
  UnexpectedError,
  ValidationError,
} from "@/util/error-util";
import type { ProjectRepository } from "@/domain/model/project/project.repository";
import type { UserRepository } from "@/domain/model/user/user.repository";
import { dateToIsoString } from "@/util/date-util";

export type LeaveProjectUseCaseInput = {
  projectId: string;
  userSub: string;
};

export type LeaveProjectUseCaseOutput = void;

export type LeaveProjectUseCaseException =
  | NotFoundError
  | ValidationError
  | UnexpectedError;

export type LeaveProjectUseCaseResult = Result<
  LeaveProjectUseCaseOutput,
  LeaveProjectUseCaseException
>;

export type LeaveProjectUseCaseProps = {
  readonly projectRepository: ProjectRepository;
  readonly userRepository: UserRepository;
  readonly logger: Logger;
  readonly fetchNow: FetchNow;
};

export type LeaveProjectUseCase = UseCase<
  LeaveProjectUseCaseInput,
  LeaveProjectUseCaseOutput,
  LeaveProjectUseCaseException
>;

export class LeaveProjectUseCaseImpl implements LeaveProjectUseCase {
  readonly #props: LeaveProjectUseCaseProps;

  constructor(props: LeaveProjectUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: LeaveProjectUseCaseInput,
  ): Promise<LeaveProjectUseCaseResult> {
    const { projectRepository, userRepository, logger, fetchNow } = this.#props;
    const { projectId, userSub } = input;

    logger.debug("ユースケース: プロジェクト脱退を開始", {
      projectId,
      userSub,
    });

    // 1. ユーザーを検索
    const userResult = await userRepository.findBySub({ sub: userSub });
    if (userResult.isErr()) {
      logger.error("ユーザーの取得に失敗", userResult.error);
      return Result.err(userResult.error);
    }

    if (userResult.data === undefined) {
      logger.debug("ユーザーが見つかりませんでした", { userSub });
      return Result.err(new NotFoundError("ユーザーが見つかりませんでした"));
    }

    const userId = userResult.data.id;

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

    // 3. メンバーか確認
    const member = project.findMemberByUserId(userId);
    if (member === undefined) {
      logger.debug("プロジェクトのメンバーではありません", {
        projectId,
        userId,
      });
      return Result.err(
        new NotFoundError("プロジェクトのメンバーではありません"),
      );
    }

    // 4. オーナーは脱退不可
    if (member.isOwner()) {
      logger.debug("オーナーは脱退できません", {
        projectId,
        userId,
      });
      return Result.err(new ValidationError("オーナーは脱退できません"));
    }

    // 5. メンバーを削除
    const now = dateToIsoString(fetchNow());
    const updatedProject = project.removeMember(member.id, now);

    // 6. 保存
    const saveResult = await projectRepository.save({ project: updatedProject });
    if (saveResult.isErr()) {
      logger.error("プロジェクトの保存に失敗", saveResult.error);
      return Result.err(saveResult.error);
    }

    logger.info("プロジェクト脱退成功", {
      projectId,
      userId,
      memberId: member.id,
    });

    return Result.ok(undefined);
  }
}
