import type { Logger } from "@/application/port/logger";
import { Result } from "@/util/result";
import type { UseCase } from "../interfaces";
import { NotFoundError, UnexpectedError } from "@/util/error-util";
import type { ProjectRepository } from "@/domain/model/project/project.repository";
import type { UserRepository } from "@/domain/model/user/user.repository";
import { Project } from "@/domain/model/project/project.entity";
import { ProjectMember } from "@/domain/model/project/project-member.entity";
import { MemberRole } from "@/domain/model/project/member-role.vo";
import type { FetchNow } from "@/application/port/fetch-now";
import { dateToIsoString } from "@/util/date-util";

export type CreateProjectUseCaseInput = {
  name: string;
  description?: string;
  color: string;
  ownerSub: string;
};

export type CreateProjectUseCaseOutput = Project;

export type CreateProjectUseCaseException = NotFoundError | UnexpectedError;

export type CreateProjectUseCaseResult = Result<
  CreateProjectUseCaseOutput,
  CreateProjectUseCaseException
>;

export type CreateProjectUseCaseProps = {
  readonly projectRepository: ProjectRepository;
  readonly userRepository: UserRepository;
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
    const { projectRepository, userRepository, logger, fetchNow } = this.#props;

    logger.debug("ユースケース: プロジェクト作成を開始");

    const { name, description, color, ownerSub } = input;

    // オーナーとなるユーザーを検索
    const userResult = await userRepository.findBySub({ sub: ownerSub });
    if (userResult.isErr()) {
      logger.error("ユーザーの取得に失敗", userResult.error);
      return Result.err(userResult.error);
    }

    if (userResult.data === undefined) {
      logger.debug("ユーザーが見つかりませんでした", { ownerSub });
      return Result.err(new NotFoundError("ユーザーが見つかりませんでした"));
    }

    const now = dateToIsoString(fetchNow());

    // 作成者をオーナーとして追加
    const ownerMember = ProjectMember.from({
      id: projectRepository.projectMemberId(),
      userId: userResult.data.id,
      role: MemberRole.owner(),
      joinedAt: now,
    });

    // プロジェクトの登録（作成者をオーナーとして設定）
    const newProject = Project.from({
      id: projectRepository.projectId(),
      name,
      description,
      color,
      createdAt: now,
      updatedAt: now,
      members: [ownerMember],
    });

    const saveResult = await projectRepository.save({
      project: newProject,
    });

    if (saveResult.isErr()) {
      logger.error("プロジェクトの保存に失敗", saveResult.error);
      return Result.err(saveResult.error);
    }

    logger.info("プロジェクト登録成功", {
      projectId: newProject.id,
      name: newProject.name,
      ownerUserId: userResult.data.id,
    });

    return Result.ok(newProject);
  }
}
