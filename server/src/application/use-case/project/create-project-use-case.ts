import type { Logger } from "@/application/port/logger";
import { Result } from "@/util/result";
import type { UseCase } from "../interfaces";
import { UnexpectedError } from "@/util/error-util";
import type { ProjectRepository } from "@/domain/model/project/project.repository";
import type { ProjectMemberRepository } from "@/domain/model/project-member/project-member.repository";
import { Project } from "@/domain/model/project/project.entity";
import { ProjectMember } from "@/domain/model/project-member/project-member.entity";
import { MemberRole } from "@/domain/model/project-member/member-role.vo";
import type { FetchNow } from "@/application/port/fetch-now";
import { dateToIsoString } from "@/util/date-util";

export type CreateProjectUseCaseInput = {
  name: string;
  description?: string;
  color: string;
  currentUserId: string;
};

export type CreateProjectUseCaseOutput = Project;

export type CreateProjectUseCaseException = UnexpectedError;

export type CreateProjectUseCaseResult = Result<
  CreateProjectUseCaseOutput,
  CreateProjectUseCaseException
>;

export type CreateProjectUseCaseProps = {
  readonly projectRepository: ProjectRepository;
  readonly projectMemberRepository: ProjectMemberRepository;
  readonly logger: Logger;
  readonly fetchNow: FetchNow;
};

export type CreateProjectUseCase = UseCase<
  CreateProjectUseCaseInput,
  CreateProjectUseCaseOutput,
  CreateProjectUseCaseException
>;

export class CreateProjectUseCaseImpl implements CreateProjectUseCase {
  readonly #props: CreateProjectUseCaseProps;

  constructor(props: CreateProjectUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: CreateProjectUseCaseInput,
  ): Promise<CreateProjectUseCaseResult> {
    const { projectRepository, projectMemberRepository, logger, fetchNow } =
      this.#props;

    logger.debug("ユースケース: プロジェクト作成を開始");

    const { name, description, color, currentUserId } = input;

    const now = dateToIsoString(fetchNow());

    // プロジェクトの登録
    const newProject = Project.from({
      id: projectRepository.projectId(),
      name,
      description,
      color,
      createdAt: now,
      updatedAt: now,
    });

    const saveResult = await projectRepository.save({
      project: newProject,
    });

    if (saveResult.isErr()) {
      logger.error("プロジェクトの保存に失敗", saveResult.error);
      return Result.err(saveResult.error);
    }

    // 作成者をオーナーとして登録
    const ownerMember = ProjectMember.from({
      id: projectMemberRepository.projectMemberId(),
      projectId: newProject.id,
      userId: currentUserId,
      role: MemberRole.owner(),
      createdAt: now,
      updatedAt: now,
    });

    const saveMemberResult = await projectMemberRepository.save({
      projectMember: ownerMember,
    });

    if (saveMemberResult.isErr()) {
      logger.error("オーナーメンバーの保存に失敗", saveMemberResult.error);
      return Result.err(saveMemberResult.error);
    }

    logger.info("プロジェクト登録成功", {
      projectId: newProject.id,
      name: newProject.name,
      ownerId: currentUserId,
    });

    return Result.ok(newProject);
  }
}
