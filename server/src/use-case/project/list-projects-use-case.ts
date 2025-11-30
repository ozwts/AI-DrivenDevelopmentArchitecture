import type { Result } from "@/util/result";
import type { UnexpectedError } from "@/util/error-util";
import type { ProjectRepository } from "@/domain/model/project/project.repository";
import type { Project } from "@/domain/model/project/project";

export type ListProjectsUseCaseInput = Record<string, never>;

export type ListProjectsUseCaseOutput = Project[];

export type ListProjectsUseCaseException = UnexpectedError;

export type ListProjectsUseCaseResult = Result<
  ListProjectsUseCaseOutput,
  ListProjectsUseCaseException
>;

export type ListProjectsUseCaseProps = {
  projectRepository: ProjectRepository;
};

export type ListProjectsUseCase = {
  execute(input: ListProjectsUseCaseInput): Promise<ListProjectsUseCaseResult>;
};

export class ListProjectsUseCaseImpl implements ListProjectsUseCase {
  readonly #projectRepository: ProjectRepository;

  constructor({ projectRepository }: ListProjectsUseCaseProps) {
    this.#projectRepository = projectRepository;
  }

  async execute(): Promise<ListProjectsUseCaseResult> {
    return this.#projectRepository.findAll();
  }
}
