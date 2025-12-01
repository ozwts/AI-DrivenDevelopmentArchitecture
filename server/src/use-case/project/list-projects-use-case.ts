import { UnexpectedError } from "@/util/error-util";
import type { ProjectRepository } from "@/domain/model/project/project.repository";
import type { Project } from "@/domain/model/project/project.entity";
import { Result } from "@/util/result";
import type { UseCase } from "../interfaces";

export type ListProjectsUseCaseInput = Record<string, never>;

export type ListProjectsUseCaseOutput = readonly Project[];

export type ListProjectsUseCaseException = UnexpectedError;

export type ListProjectsUseCaseResult = Result<
  ListProjectsUseCaseOutput,
  ListProjectsUseCaseException
>;

export type ListProjectsUseCaseProps = {
  readonly projectRepository: ProjectRepository;
};

export type ListProjectsUseCase = UseCase<
  ListProjectsUseCaseInput,
  ListProjectsUseCaseOutput,
  ListProjectsUseCaseException
>;

export class ListProjectsUseCaseImpl implements ListProjectsUseCase {
  readonly #props: ListProjectsUseCaseProps;

  constructor(props: ListProjectsUseCaseProps) {
    this.#props = props;
  }

  async execute(): Promise<ListProjectsUseCaseResult> {
    const { projectRepository } = this.#props;

    const result = await projectRepository.findAll();
    if (result.isErr()) {
      return Result.err(result.error);
    }
    return Result.ok(result.data);
  }
}
