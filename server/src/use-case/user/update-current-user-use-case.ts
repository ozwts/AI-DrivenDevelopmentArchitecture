import type { Logger } from "@/domain/support/logger";
import type { AuthClient } from "@/domain/support/auth-client";
import { Result } from "@/util/result";
import type { UseCase } from "../interfaces";
import { UnexpectedError, NotFoundError } from "@/util/error-util";
import type { UserRepository } from "@/domain/model/user/user.repository";
import type { User } from "@/domain/model/user/user.entity";
import type { FetchNow } from "@/domain/support/fetch-now";
import { dateToIsoString } from "@/util/date-util";

export type UpdateCurrentUserUseCaseInput = {
  sub: string;
  name?: string;
};

export type UpdateCurrentUserUseCaseOutput = User;

export type UpdateCurrentUserUseCaseException = UnexpectedError | NotFoundError;

export type UpdateCurrentUserUseCaseResult = Result<
  UpdateCurrentUserUseCaseOutput,
  UpdateCurrentUserUseCaseException
>;

export type UpdateCurrentUserUseCaseProps = {
  readonly userRepository: UserRepository;
  readonly authClient: AuthClient;
  readonly logger: Logger;
  readonly fetchNow: FetchNow;
};

export type UpdateCurrentUserUseCase = UseCase<
  UpdateCurrentUserUseCaseInput,
  UpdateCurrentUserUseCaseOutput,
  UpdateCurrentUserUseCaseException
>;

/**
 * 現在のユーザー更新ユースケース
 *
 * 認証トークンから取得したsubを使用して、現在のユーザー情報を更新する。
 * ハンドラーを簡素化するため、ユーザー検索をユースケース内で実行する。
 *
 * - sub: 認証トークンから取得したCognito User Sub
 * - name: ユーザーがリクエストボディで編集可能
 * - email, emailVerified: Cognitoトークンから自動的に同期される
 */
export class UpdateCurrentUserUseCaseImpl implements UpdateCurrentUserUseCase {
  readonly #props: UpdateCurrentUserUseCaseProps;

  constructor(props: UpdateCurrentUserUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: UpdateCurrentUserUseCaseInput,
  ): Promise<UpdateCurrentUserUseCaseResult> {
    const { userRepository, authClient, logger, fetchNow } = this.#props;

    logger.debug("ユースケース: 現在のユーザー情報の更新を開始", {
      input,
    });

    const { sub } = input;

    // subでユーザーを検索
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

    // Cognitoからユーザー情報を取得（email, email_verified）
    // 更新時はオプショナル（取得失敗してもエラーにしない）
    let email: string | undefined;
    let emailVerified: boolean | undefined;

    try {
      const cognitoUser = await authClient.getUserById(sub);
      email = cognitoUser.email;
      emailVerified = cognitoUser.emailVerified;
      logger.info("Cognitoユーザー情報取得成功", {
        email,
        emailVerified,
      });
    } catch (error) {
      logger.warn("Cognitoからのユーザー情報取得に失敗（続行）", {
        sub,
        error: error instanceof Error ? error.message : String(error),
      });
      // 取得失敗してもエラーにせず続行（既存のemail情報を保持）
    }

    const now = dateToIsoString(fetchNow());

    // Result.map()によるメソッドチェーンでユーザー情報を更新
    // name: リクエストボディから（ユーザー入力）
    // email, emailVerified: Cognitoから（AuthClient経由）
    const updatedResult = Result.ok(findResult.data)
      .map((u: User) =>
        "name" in input && input.name !== undefined
          ? u.rename(input.name, now)
          : u,
      )
      .map((u: User) =>
        email !== undefined && emailVerified !== undefined
          ? u.verifyEmail(email, emailVerified, now)
          : u,
      );

    if (updatedResult.isErr()) {
      return updatedResult;
    }

    const saveResult = await userRepository.save({ user: updatedResult.data });

    if (saveResult.isErr()) {
      logger.error("ユーザーの保存に失敗", saveResult.error);
      return Result.err(saveResult.error);
    }

    logger.info("現在のユーザー情報を更新しました", {
      userId: updatedResult.data.id,
      sub: updatedResult.data.sub,
      name: updatedResult.data.name,
      email: updatedResult.data.email,
      emailVerified: updatedResult.data.emailVerified,
    });

    return Result.ok(updatedResult.data);
  }
}
