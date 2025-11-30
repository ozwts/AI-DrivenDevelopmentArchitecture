import { UnexpectedError } from "@/util/error-util";
import type { ProjectRepository } from "@/domain/model/project/project.repository";
import type { Project } from "@/domain/model/project/project.entity";
import { Result } from "@/util/result";
import type { UseCase } from "../interfaces";

export type GetProjectUseCaseInput = {
  projectId: string;
};

export type GetProjectUseCaseOutput = Project | undefined;

export type GetProjectUseCaseException = UnexpectedError;

export type GetProjectUseCaseResult = Result<
  GetProjectUseCaseOutput,
  GetProjectUseCaseException
>;

export type GetProjectUseCaseProps = {
  readonly projectRepository: ProjectRepository;
};

export type GetProjectUseCase = UseCase<
  GetProjectUseCaseInput,
  GetProjectUseCaseOutput,
  GetProjectUseCaseException
>;

export class GetProjectUseCaseImpl implements GetProjectUseCase {
  readonly #props: GetProjectUseCaseProps;

  constructor(props: GetProjectUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: GetProjectUseCaseInput,
  ): Promise<GetProjectUseCaseResult> {
    const { projectRepository } = this.#props;

    const result = await projectRepository.findById({ id: input.projectId });
    if (result.isErr()) {
      return Result.err(result.error);
    }
    return Result.ok(result.data);
  }
}
