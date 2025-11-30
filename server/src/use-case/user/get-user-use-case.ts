import type { Logger } from "@/domain/support/logger";
import { Result } from "@/util/result";
import type { UseCase } from "../interfaces";
import { UnexpectedError, NotFoundError } from "@/util/error-util";
import type { UserRepository } from "@/domain/model/user/user.repository";
import type { User } from "@/domain/model/user/user.entity";

export type GetUserUseCaseInput = {
  id: string;
};

export type GetUserUseCaseOutput = User;

export type GetUserUseCaseException = UnexpectedError | NotFoundError;

export type GetUserUseCaseResult = Result<
  GetUserUseCaseOutput,
  GetUserUseCaseException
>;

export type GetUserUseCaseProps = {
  readonly userRepository: UserRepository;
  readonly logger: Logger;
};

export type GetUserUseCase = UseCase<
  GetUserUseCaseInput,
  GetUserUseCaseOutput,
  GetUserUseCaseException
>;

/**
 * ユーザー取得ユースケース
 *
 * IDでユーザーを取得する。
 */
export class GetUserUseCaseImpl implements GetUserUseCase {
  readonly #props: GetUserUseCaseProps;

  constructor(props: GetUserUseCaseProps) {
    this.#props = props;
  }

  async execute(input: GetUserUseCaseInput): Promise<GetUserUseCaseResult> {
    const { userRepository, logger } = this.#props;

    logger.debug("use-case: get-user-use-case", { input });

    const { id } = input;

    const findResult = await userRepository.findById({ id });

    if (findResult.isErr()) {
      logger.error("ユーザーの取得に失敗", findResult.error);
      return Result.err(findResult.error);
    }

    if (findResult.data === undefined) {
      const notFoundError = new NotFoundError("ユーザーが見つかりません");
      logger.info("ユーザーが見つかりませんでした", { id });
      return Result.err(notFoundError);
    }

    logger.debug("ユーザー取得成功", {
      userId: findResult.data.id,
      email: findResult.data.email,
    });

    return Result.ok(findResult.data);
  }
}
