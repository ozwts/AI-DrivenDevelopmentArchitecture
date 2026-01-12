import type { Logger } from "@/application/port/logger";
import { Result } from "@/util/result";
import type { UseCase } from "../interfaces";
import { UnexpectedError } from "@/util/error-util";
import type { UserRepository } from "@/domain/model/user/user.repository";
import type { User } from "@/domain/model/user/user.entity";

export type SearchUsersUseCaseInput = {
  name: string;
};

export type SearchUsersUseCaseOutput = User[];

export type SearchUsersUseCaseException = UnexpectedError;

export type SearchUsersUseCaseResult = Result<
  SearchUsersUseCaseOutput,
  SearchUsersUseCaseException
>;

export type SearchUsersUseCaseProps = {
  readonly userRepository: UserRepository;
  readonly logger: Logger;
};

export type SearchUsersUseCase = UseCase<
  SearchUsersUseCaseInput,
  SearchUsersUseCaseOutput,
  SearchUsersUseCaseException
>;

export class SearchUsersUseCaseImpl implements SearchUsersUseCase {
  readonly #props: SearchUsersUseCaseProps;

  constructor(props: SearchUsersUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: SearchUsersUseCaseInput,
  ): Promise<SearchUsersUseCaseResult> {
    const { userRepository, logger } = this.#props;
    const { name } = input;

    logger.debug("ユースケース: ユーザー検索を開始", { name });

    const result = await userRepository.findByNameContains({ name });
    if (result.isErr()) {
      logger.error("ユーザー検索に失敗", result.error);
      return Result.err(result.error);
    }

    logger.debug("ユーザー検索完了", {
      name,
      count: result.data.length,
    });

    return Result.ok(result.data);
  }
}
