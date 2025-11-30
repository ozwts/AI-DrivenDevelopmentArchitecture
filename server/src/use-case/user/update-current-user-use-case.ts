import type { Logger } from "@/domain/support/logger";
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
  email?: string;
  emailVerified?: boolean;
};

export type UpdateCurrentUserUseCaseOutput = User;

export type UpdateCurrentUserUseCaseException = UnexpectedError | NotFoundError;

export type UpdateCurrentUserUseCaseResult = Result<
  UpdateCurrentUserUseCaseOutput,
  UpdateCurrentUserUseCaseException
>;

export type UpdateCurrentUserUseCaseProps = {
  readonly userRepository: UserRepository;
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
    const { userRepository, logger, fetchNow } = this.#props;

    logger.debug("ユースケース: 現在のユーザー情報の更新を開始", {
      input,
    });

    const { sub, name, email, emailVerified } = input;

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

    const now = dateToIsoString(fetchNow());

    // ユーザー情報を更新（個別メソッドを組み合わせる）
    // name: リクエストボディから（ユーザー入力）
    // email, emailVerified: トークンから（Cognito情報）
    let updatedUser = findResult.data;
    if (name !== undefined) {
      updatedUser = updatedUser.rename(name, now);
    }
    if (email !== undefined && emailVerified !== undefined) {
      updatedUser = updatedUser.verifyEmail(email, emailVerified, now);
    }

    const saveResult = await userRepository.save({ user: updatedUser });

    if (saveResult.isErr()) {
      logger.error("ユーザーの保存に失敗", saveResult.error);
      return Result.err(saveResult.error);
    }

    logger.info("現在のユーザー情報を更新しました", {
      userId: updatedUser.id,
      sub: updatedUser.sub,
      name: updatedUser.name,
      email: updatedUser.email,
      emailVerified: updatedUser.emailVerified,
    });

    return Result.ok(updatedUser);
  }
}
