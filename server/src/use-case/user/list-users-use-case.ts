import type { Logger } from "@/domain/support/logger";
import type { UserRepository } from "@/domain/model/user/user.repository";
import type { User } from "@/domain/model/user/user.entity";
import { Result } from "@/util/result";
import { UnexpectedError } from "@/util/error-util";
import type { UseCase } from "../interfaces";

export type ListUsersUseCaseInput = Record<string, never>;

export type ListUsersUseCaseOutput = User[];

export type ListUsersUseCaseException = UnexpectedError;

export type ListUsersUseCaseResult = Result<
  ListUsersUseCaseOutput,
  ListUsersUseCaseException
>;

export type ListUsersUseCaseProps = {
  readonly userRepository: UserRepository;
  readonly logger: Logger;
};

export type ListUsersUseCase = UseCase<
  ListUsersUseCaseInput,
  ListUsersUseCaseOutput,
  ListUsersUseCaseException
>;

/**
 * ユーザー一覧を取得するユースケース
 *
 * すべてのユーザーを取得します。
 */
export class ListUsersUseCaseImpl implements ListUsersUseCase {
  readonly #props: ListUsersUseCaseProps;

  constructor(props: ListUsersUseCaseProps) {
    this.#props = props;
  }

  async execute(): Promise<ListUsersUseCaseResult> {
    const { userRepository, logger } = this.#props;

    logger.debug("use-case: list-users-use-case");

    // リポジトリから全ユーザーを取得
    const findAllResult = await userRepository.findAll();

    if (findAllResult.isErr()) {
      logger.error("ユーザー一覧の取得に失敗", findAllResult.error);
      return Result.err(findAllResult.error);
    }

    return Result.ok(findAllResult.data);
  }
}
