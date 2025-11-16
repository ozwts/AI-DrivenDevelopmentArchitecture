import type { Result } from "@/util/result";
import type { UnexpectedError } from "@/util/error-util";
import type { ProjectRepository } from "@/domain/model/project/project-repository";
import type { Project } from "@/domain/model/project/project";

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
  projectRepository: ProjectRepository;
};

export type GetProjectUseCase = {
  execute(input: GetProjectUseCaseInput): Promise<GetProjectUseCaseResult>;
};

export class GetProjectUseCaseImpl implements GetProjectUseCase {
  readonly #projectRepository: ProjectRepository;

  constructor({ projectRepository }: GetProjectUseCaseProps) {
    this.#projectRepository = projectRepository;
  }

  async execute(
    input: GetProjectUseCaseInput,
  ): Promise<GetProjectUseCaseResult> {
    return this.#projectRepository.findById({ id: input.projectId });
  }
}
