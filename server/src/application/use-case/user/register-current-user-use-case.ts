import type { Logger } from "@/application/port/logger";
import type { AuthClient } from "@/application/port/auth-client";
import { Result } from "@/util/result";
import type { UseCase } from "../interfaces";
import { UnexpectedError, ConflictError } from "@/util/error-util";
import type { UserRepository } from "@/domain/model/user/user.repository";
import { User } from "@/domain/model/user/user.entity";
import type { FetchNow } from "@/application/port/fetch-now";
import { dateToIsoString } from "@/util/date-util";

export type RegisterCurrentUserUseCaseInput = {
  sub: string;
};

export type RegisterCurrentUserUseCaseOutput = User;

export type RegisterCurrentUserUseCaseException =
  | ConflictError
  | UnexpectedError;

export type RegisterCurrentUserUseCaseResult = Result<
  RegisterCurrentUserUseCaseOutput,
  RegisterCurrentUserUseCaseException
>;

export type RegisterCurrentUserUseCaseProps = {
  readonly userRepository: UserRepository;
  readonly authClient: AuthClient;
  readonly logger: Logger;
  readonly fetchNow: FetchNow;
};

export type RegisterCurrentUserUseCase = UseCase<
  RegisterCurrentUserUseCaseInput,
  RegisterCurrentUserUseCaseOutput,
  RegisterCurrentUserUseCaseException
>;

/**
 * 現在のユーザー登録ユースケース
 *
 * 認証トークンから取得したsubを使用して、現在のユーザーを新規登録する。
 * このユースケースは、認証されたユーザーが自分のアカウントを登録する際に使用される。
 *
 * ビジネスルール:
 * - 同じsubを持つユーザーがすでに存在する場合はConflictErrorを返す
 * - ユーザー名はメールアドレスから自動生成される
 * - ユーザーIDはリポジトリで生成される
 */
export class RegisterCurrentUserUseCaseImpl
  implements RegisterCurrentUserUseCase
{
  readonly #props: RegisterCurrentUserUseCaseProps;

  constructor(props: RegisterCurrentUserUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: RegisterCurrentUserUseCaseInput,
  ): Promise<RegisterCurrentUserUseCaseResult> {
    const { userRepository, authClient, logger, fetchNow } = this.#props;

    logger.debug("ユースケース: 現在のユーザーの登録を開始", {
      input,
    });

    const { sub } = input;

    // Cognitoからユーザー情報を取得（email, email_verified）
    let email: string;
    let emailVerified: boolean;

    try {
      const cognitoUser = await authClient.getUserById(sub);
      logger.info("Cognitoユーザー情報取得成功", {
        email: cognitoUser.email,
        emailVerified: cognitoUser.emailVerified,
      });

      if (cognitoUser.email === undefined || cognitoUser.email === "") {
        logger.error("Cognitoユーザーにemailが設定されていません", { sub });
        return Result.err(new UnexpectedError());
      }

      email = cognitoUser.email;
      emailVerified = cognitoUser.emailVerified ?? false;
    } catch (error) {
      logger.error("Cognitoからのユーザー情報取得に失敗", {
        sub,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.err(new UnexpectedError());
    }

    // subで既存ユーザーを検索
    const findResult = await userRepository.findBySub({ sub });

    if (findResult.isErr()) {
      logger.error("ユーザーの検索に失敗", findResult.error);
      return Result.err(findResult.error);
    }

    // すでに同じsubのユーザーが存在する場合はConflictError
    if (findResult.data !== undefined) {
      const conflictError = new ConflictError(
        "このユーザーはすでに登録されています",
      );
      logger.warn("ユーザーがすでに存在します", { sub });
      return Result.err(conflictError);
    }

    const now = dateToIsoString(fetchNow());
    const userId = userRepository.userId();

    // メールアドレスからユーザー名を生成
    const name = User.generateNameFromEmail(email);

    // 新しいUserエンティティを作成
    const newUser = User.from({
      id: userId,
      sub,
      name,
      email,
      emailVerified,
      createdAt: now,
      updatedAt: now,
    });

    // リポジトリに保存
    const saveResult = await userRepository.save({ user: newUser });

    if (saveResult.isErr()) {
      logger.error("ユーザーの保存に失敗", saveResult.error);
      return Result.err(saveResult.error);
    }

    logger.info("現在のユーザーを登録しました", {
      userId: newUser.id,
      sub: newUser.sub,
      name: newUser.name,
      email: newUser.email,
      emailVerified: newUser.emailVerified,
    });

    return Result.ok(newUser);
  }
}
