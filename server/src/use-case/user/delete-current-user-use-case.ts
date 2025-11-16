import type { Logger } from "@/domain/support/logger";
import type { Result } from "@/util/result";
import type { UseCase } from "../interfaces";
import { UnexpectedError, NotFoundError } from "@/util/error-util";
import type { UserRepository } from "@/domain/model/user/user-repository";
import type { AuthClient } from "@/domain/support/auth-client";

export type DeleteCurrentUserUseCaseInput = {
  sub: string;
};

export type DeleteCurrentUserUseCaseOutput = void;

export type DeleteCurrentUserUseCaseException = UnexpectedError | NotFoundError;

export type DeleteCurrentUserUseCaseResult = Result<
  DeleteCurrentUserUseCaseOutput,
  DeleteCurrentUserUseCaseException
>;

export type DeleteCurrentUserUseCaseProps = {
  readonly userRepository: UserRepository;
  readonly authClient: AuthClient;
  readonly logger: Logger;
};

export type DeleteCurrentUserUseCase = UseCase<
  DeleteCurrentUserUseCaseInput,
  DeleteCurrentUserUseCaseOutput,
  DeleteCurrentUserUseCaseException
>;

/**
 * 現在のユーザー削除ユースケース
 *
 * 認証トークンから取得したsubを使用して、現在のユーザーを削除する。
 * ハンドラーを簡素化するため、ユーザー検索をユースケース内で実行する。
 *
 * Cognitoからユーザーを削除した後、DBからユーザーを削除する。
 */
export class DeleteCurrentUserUseCaseImpl implements DeleteCurrentUserUseCase {
  readonly #userRepository: UserRepository;

  readonly #authClient: AuthClient;

  readonly #logger: Logger;

  constructor({
    userRepository,
    authClient,
    logger,
  }: DeleteCurrentUserUseCaseProps) {
    this.#userRepository = userRepository;
    this.#authClient = authClient;
    this.#logger = logger;
  }

  async execute(
    input: DeleteCurrentUserUseCaseInput,
  ): Promise<DeleteCurrentUserUseCaseResult> {
    this.#logger.debug("ユースケース: 現在のユーザーの削除を開始", { input });

    const { sub } = input;

    // subでユーザーを検索
    const findResult = await this.#userRepository.findBySub({ sub });

    if (!findResult.success) {
      this.#logger.error("ユーザーの取得に失敗", findResult.error);
      return {
        success: false,
        error: findResult.error,
      };
    }

    if (findResult.data === undefined) {
      const notFoundError = new NotFoundError("ユーザーが見つかりません");
      this.#logger.info("ユーザーが見つかりませんでした", { sub });
      return {
        success: false,
        error: notFoundError,
      };
    }

    const user = findResult.data;

    // Cognitoからユーザーを削除
    this.#logger.debug("Cognitoからユーザーを削除します", {
      userId: user.id,
      sub: user.sub,
    });

    const deleteAuthResult = await this.#authClient.deleteUser(user.sub);

    if (!deleteAuthResult.success) {
      this.#logger.error("Cognitoからのユーザー削除に失敗", {
        error: deleteAuthResult.error,
        userId: user.id,
        sub: user.sub,
      });
      return {
        success: false,
        error: deleteAuthResult.error,
      };
    }

    this.#logger.debug("Cognitoからのユーザー削除に成功", {
      userId: user.id,
      sub: user.sub,
    });

    // DBからユーザーを削除
    const removeResult = await this.#userRepository.remove({ id: user.id });

    if (!removeResult.success) {
      this.#logger.error("DBからのユーザー削除に失敗", removeResult.error);
      return {
        success: false,
        error: removeResult.error,
      };
    }

    this.#logger.info("現在のユーザーを削除しました", {
      userId: user.id,
      sub: user.sub,
    });

    return {
      success: true,
      data: undefined,
    };
  }
}
