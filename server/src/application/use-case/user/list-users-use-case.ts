import type { Logger } from "@/application/port/logger";
import type { UserRepository } from "@/domain/model/user/user.repository";
import type { User } from "@/domain/model/user/user.entity";
import { Result } from "@/util/result";
import { UnexpectedError } from "@/util/error-util";
import type { UseCase } from "../interfaces";

export type ListUsersUseCaseInput = {
  readonly name?: string;
};

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

  async execute(input: ListUsersUseCaseInput): Promise<ListUsersUseCaseResult> {
    const { userRepository, logger } = this.#props;
    const { name } = input;

    logger.debug("ユースケース: ユーザー一覧取得を開始", { name });

    // nameが指定されている場合は名前で検索、それ以外は全ユーザーを取得
    const result =
      name !== undefined && name !== ""
        ? await userRepository.findByNameContains({ name })
        : await userRepository.findAll();

    if (result.isErr()) {
      logger.error("ユーザー一覧の取得に失敗", result.error);
      return Result.err(result.error);
    }

    logger.debug("ユーザー一覧取得完了", {
      count: result.data.length,
    });

    return Result.ok(result.data);
  }
}
