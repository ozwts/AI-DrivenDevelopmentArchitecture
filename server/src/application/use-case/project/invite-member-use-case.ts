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
import type { ProjectMember } from "@/domain/model/project/project-member.entity";
import { ProjectMember as ProjectMemberEntity } from "@/domain/model/project/project-member.entity";
import type { User } from "@/domain/model/user/user.entity";
import { MemberRole } from "@/domain/model/project/member-role.vo";
import { dateToIsoString } from "@/util/date-util";

export type InviteMemberUseCaseInput = {
  projectId: string;
  inviteeUserId: string;
  operatorSub: string;
};

export type MemberWithUser = {
  member: ProjectMember;
  user: User;
};

export type InviteMemberUseCaseOutput = MemberWithUser;

export type InviteMemberUseCaseException =
  | NotFoundError
  | ForbiddenError
  | ValidationError
  | UnexpectedError;

export type InviteMemberUseCaseResult = Result<
  InviteMemberUseCaseOutput,
  InviteMemberUseCaseException
>;

export type InviteMemberUseCaseProps = {
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

export class InviteMemberUseCaseImpl implements InviteMemberUseCase {
  readonly #props: InviteMemberUseCaseProps;

  constructor(props: InviteMemberUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: InviteMemberUseCaseInput,
  ): Promise<InviteMemberUseCaseResult> {
    const { projectRepository, userRepository, logger, fetchNow } = this.#props;
    const { projectId, inviteeUserId, operatorSub } = input;

    logger.debug("ユースケース: メンバー招待を開始", {
      projectId,
      inviteeUserId,
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
        new ForbiddenError("オーナーのみがメンバーを招待できます"),
      );
    }
    if (!operatorMember.isOwner()) {
      logger.debug("操作者がオーナーではありません", {
        projectId,
        operatorUserId,
      });
      return Result.err(
        new ForbiddenError("オーナーのみがメンバーを招待できます"),
      );
    }

    // 4. 招待するユーザーの存在確認
    const userResult = await userRepository.findById({ id: inviteeUserId });
    if (userResult.isErr()) {
      logger.error("ユーザーの取得に失敗", userResult.error);
      return Result.err(userResult.error);
    }

    if (userResult.data === undefined) {
      logger.debug("招待するユーザーが見つかりませんでした", { inviteeUserId });
      return Result.err(
        new NotFoundError("招待するユーザーが見つかりませんでした"),
      );
    }

    // 5. 既にメンバーでないか確認
    if (project.hasMember(inviteeUserId)) {
      logger.debug("既にプロジェクトのメンバーです", {
        projectId,
        inviteeUserId,
      });
      return Result.err(
        new ValidationError("既にプロジェクトのメンバーです"),
      );
    }

    // 6. 新しいメンバーを作成
    const now = dateToIsoString(fetchNow());
    const newMember = ProjectMemberEntity.from({
      id: projectRepository.projectMemberId(),
      userId: inviteeUserId,
      role: MemberRole.member(),
      joinedAt: now,
    });

    // 7. プロジェクトにメンバーを追加
    const updatedProject = project.addMember(newMember, now);

    // 8. 保存
    const saveResult = await projectRepository.save({ project: updatedProject });
    if (saveResult.isErr()) {
      logger.error("プロジェクトの保存に失敗", saveResult.error);
      return Result.err(saveResult.error);
    }

    logger.info("メンバー招待成功", {
      projectId,
      inviteeUserId,
      memberId: newMember.id,
    });

    // 招待されたユーザー情報はuserResult.dataから取得済み
    return Result.ok({ member: newMember, user: userResult.data });
  }
}
