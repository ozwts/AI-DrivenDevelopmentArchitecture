import type { Logger } from "@/domain/support/logger";
import type { Result } from "@/util/result";
import type { UseCase } from "../interfaces";
import { UnexpectedError, NotFoundError } from "@/util/error-util";
import type { UserRepository } from "@/domain/model/user/user-repository";
import type { User } from "@/domain/model/user/user";

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
  readonly #userRepository: UserRepository;

  readonly #logger: Logger;

  constructor({ userRepository, logger }: GetUserUseCaseProps) {
    this.#userRepository = userRepository;
    this.#logger = logger;
  }

  async execute(input: GetUserUseCaseInput): Promise<GetUserUseCaseResult> {
    this.#logger.debug("use-case: get-user-use-case", { input });

    const { id } = input;

    const findResult = await this.#userRepository.findById({ id });

    if (!findResult.success) {
      this.#logger.error("ユーザーの取得に失敗", findResult.error);
      return {
        success: false,
        error: findResult.error,
      };
    }

    if (findResult.data === undefined) {
      const notFoundError = new NotFoundError("ユーザーが見つかりません");
      this.#logger.info("ユーザーが見つかりませんでした", { id });
      return {
        success: false,
        error: notFoundError,
      };
    }

    this.#logger.debug("ユーザー取得成功", {
      userId: findResult.data.id,
      email: findResult.data.email,
    });

    return {
      success: true,
      data: findResult.data,
    };
  }
}
