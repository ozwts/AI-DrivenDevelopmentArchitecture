import type { Logger } from "@/domain/support/logger";
import type { UserRepository } from "@/domain/model/user/user.repository";
import type { User } from "@/domain/model/user/user.entity";
import { Result } from "@/util/result";
import { NotFoundError, UnexpectedError } from "@/util/error-util";
import type { UseCase } from "../interfaces";

export type GetCurrentUserUseCaseInput = {
  sub: string;
};

export type GetCurrentUserUseCaseOutput = User;

export type GetCurrentUserUseCaseException = NotFoundError | UnexpectedError;

export type GetCurrentUserUseCaseResult = Result<
  GetCurrentUserUseCaseOutput,
  GetCurrentUserUseCaseException
>;

export type GetCurrentUserUseCaseProps = {
  readonly userRepository: UserRepository;
  readonly logger: Logger;
};

export type GetCurrentUserUseCase = UseCase<
  GetCurrentUserUseCaseInput,
  GetCurrentUserUseCaseOutput,
  GetCurrentUserUseCaseException
>;

/**
 * 現在ログインしているユーザーを取得するユースケース
 *
 * Cognito User Subを使用してユーザーを検索します。
 */
export class GetCurrentUserUseCaseImpl implements GetCurrentUserUseCase {
  readonly #props: GetCurrentUserUseCaseProps;

  constructor(props: GetCurrentUserUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: GetCurrentUserUseCaseInput,
  ): Promise<GetCurrentUserUseCaseResult> {
    const { userRepository, logger } = this.#props;
    const { sub } = input;

    logger.debug("use-case: get-current-user-use-case", { sub });

    // Cognito Subでユーザーを検索
    const findResult = await userRepository.findBySub({ sub });

    if (findResult.isErr()) {
      logger.error("ユーザーの取得に失敗", findResult.error);
      return Result.err(findResult.error);
    }

    if (findResult.data === undefined) {
      const notFoundError = new NotFoundError("ユーザーが見つかりません");
      logger.info("ユーザーが見つかりませんでした", { sub });
      return Result.err(notFoundError);
    }

    return Result.ok(findResult.data);
  }
}
