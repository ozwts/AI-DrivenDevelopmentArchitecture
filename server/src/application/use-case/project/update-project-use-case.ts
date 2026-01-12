import type { Logger } from "@/application/port/logger";
import {
  UnexpectedError,
  NotFoundError,
  ForbiddenError,
} from "@/util/error-util";
import type { ProjectRepository } from "@/domain/model/project/project.repository";
import type { ProjectMemberRepository } from "@/domain/model/project-member/project-member.repository";
import type { Project } from "@/domain/model/project/project.entity";
import type { MemberRole } from "@/domain/model/project-member/member-role.vo";
import type { FetchNow } from "@/application/port/fetch-now";
import { Result } from "@/util/result";
import { dateToIsoString } from "@/util/date-util";
import type { UseCase } from "../interfaces";

export type UpdateProjectUseCaseInput = {
  projectId: string;
  currentUserId: string;
  name?: string;
  description?: string;
  color?: string;
};

export type UpdateProjectUseCaseOutput = {
  project: Project;
  myRole: MemberRole;
};

export type UpdateProjectUseCaseException =
  | UnexpectedError
  | NotFoundError
  | ForbiddenError;

export type UpdateProjectUseCaseResult = Result<
  UpdateProjectUseCaseOutput,
  UpdateProjectUseCaseException
>;

export type UpdateProjectUseCaseProps = {
  readonly projectRepository: ProjectRepository;
  readonly projectMemberRepository: ProjectMemberRepository;
  readonly logger: Logger;
  readonly fetchNow: FetchNow;
};

export type UpdateProjectUseCase = UseCase<
  UpdateProjectUseCaseInput,
  UpdateProjectUseCaseOutput,
  UpdateProjectUseCaseException
>;

export class UpdateProjectUseCaseImpl implements UpdateProjectUseCase {
  readonly #props: UpdateProjectUseCaseProps;

  constructor(props: UpdateProjectUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: UpdateProjectUseCaseInput,
  ): Promise<UpdateProjectUseCaseResult> {
    const { projectRepository, projectMemberRepository, logger, fetchNow } =
      this.#props;
    const { projectId, currentUserId } = input;

    logger.debug("ユースケース: プロジェクト更新を開始", { projectId });

    // 既存のプロジェクトを取得
    const findResult = await projectRepository.findById({ id: projectId });

    if (findResult.isErr()) {
      logger.error("プロジェクトの取得に失敗", findResult.error);
      return Result.err(findResult.error);
    }

    if (findResult.data === undefined) {
      const notFoundError = new NotFoundError(
        "プロジェクトが見つかりませんでした",
      );
      logger.error("プロジェクトが存在しません", { projectId });
      return Result.err(notFoundError);
    }

    // 現在のユーザーがオーナーかどうか確認
    const memberResult = await projectMemberRepository.findByProjectIdAndUserId({
      projectId,
      userId: currentUserId,
    });
    if (memberResult.isErr()) {
      logger.error("メンバー情報の取得に失敗", memberResult.error);
      return Result.err(memberResult.error);
    }
    if (memberResult.data?.role.isOwner() !== true) {
      logger.warn("プロジェクト更新権限がありません", {
        projectId,
        currentUserId,
      });
      return Result.err(
        new ForbiddenError("Only project owner can update the project"),
      );
    }

    const now = dateToIsoString(fetchNow());

    // Result.map()によるメソッドチェーンでプロジェクトを更新
    const updatedResult = Result.ok(findResult.data)
      .map((p: Project) =>
        "name" in input && input.name !== undefined
          ? p.rename(input.name, now)
          : p,
      )
      .map((p: Project) =>
        "description" in input ? p.clarify(input.description, now) : p,
      )
      .map((p: Project) =>
        "color" in input && input.color !== undefined
          ? p.recolor(input.color, now)
          : p,
      );

    if (updatedResult.isErr()) {
      logger.error("プロジェクトの更新に失敗", updatedResult.error);
      return Result.err(new UnexpectedError());
    }

    const saveResult = await projectRepository.save({
      project: updatedResult.data,
    });

    if (saveResult.isErr()) {
      logger.error("プロジェクトの保存に失敗", saveResult.error);
      return Result.err(saveResult.error);
    }

    logger.info("プロジェクト更新成功", { projectId: updatedResult.data.id });

    return Result.ok({
      project: updatedResult.data,
      myRole: memberResult.data.role,
    });
  }
}
