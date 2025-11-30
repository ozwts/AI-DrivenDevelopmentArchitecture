import type { Logger } from "@/domain/support/logger";
import type { Result } from "@/util/result";
import type { UseCase } from "../interfaces";
import { UnexpectedError, ConflictError } from "@/util/error-util";
import type { UserRepository } from "@/domain/model/user/user.repository";
import { User } from "@/domain/model/user/user";
import type { FetchNow } from "@/domain/support/fetch-now";
import { dateToIsoString } from "@/util/date-util";

export type RegisterCurrentUserUseCaseInput = {
  sub: string;
  email: string;
  emailVerified: boolean;
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
  readonly #userRepository: UserRepository;

  readonly #logger: Logger;

  readonly #fetchNow: FetchNow;

  constructor({
    userRepository,
    logger,
    fetchNow,
  }: RegisterCurrentUserUseCaseProps) {
    this.#userRepository = userRepository;
    this.#logger = logger;
    this.#fetchNow = fetchNow;
  }

  async execute(
    input: RegisterCurrentUserUseCaseInput,
  ): Promise<RegisterCurrentUserUseCaseResult> {
    this.#logger.debug("ユースケース: 現在のユーザーの登録を開始", {
      input,
    });

    const { sub, email, emailVerified } = input;

    // subで既存ユーザーを検索
    const findResult = await this.#userRepository.findBySub({ sub });

    if (!findResult.success) {
      this.#logger.error("ユーザーの検索に失敗", findResult.error);
      return {
        success: false,
        error: findResult.error,
      };
    }

    // すでに同じsubのユーザーが存在する場合はConflictError
    if (findResult.data !== undefined) {
      const conflictError = new ConflictError(
        "このユーザーはすでに登録されています",
      );
      this.#logger.info("ユーザーがすでに存在します", { sub });
      return {
        success: false,
        error: conflictError,
      };
    }

    const now = dateToIsoString(this.#fetchNow());
    const userId = this.#userRepository.userId();

    // メールアドレスからユーザー名を生成
    const name = User.generateNameFromEmail(email);

    // 新しいUserエンティティを作成
    const newUser = new User({
      id: userId,
      sub,
      name,
      email,
      emailVerified,
      createdAt: now,
      updatedAt: now,
    });

    // リポジトリに保存
    const saveResult = await this.#userRepository.save({ user: newUser });

    if (!saveResult.success) {
      this.#logger.error("ユーザーの保存に失敗", saveResult.error);
      return {
        success: false,
        error: saveResult.error,
      };
    }

    this.#logger.info("現在のユーザーを登録しました", {
      userId: newUser.id,
      sub: newUser.sub,
      name: newUser.name,
      email: newUser.email,
      emailVerified: newUser.emailVerified,
    });

    return {
      success: true,
      data: newUser,
    };
  }
}
