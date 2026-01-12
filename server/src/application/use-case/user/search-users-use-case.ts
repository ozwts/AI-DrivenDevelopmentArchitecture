import type { Logger } from "@/application/port/logger";
import type { UserRepository } from "@/domain/model/user/user.repository";
import type { User } from "@/domain/model/user/user.entity";
import { Result } from "@/util/result";
import { UnexpectedError } from "@/util/error-util";
import type { UseCase } from "../interfaces";

export type SearchUsersUseCaseInput = {
  readonly keyword: string;
  readonly currentUserId: string;
};

export type SearchUsersUseCaseOutput = User[];

export type SearchUsersUseCaseException = UnexpectedError;

export type SearchUsersUseCaseResult = Result<
  SearchUsersUseCaseOutput,
  SearchUsersUseCaseException
>;

export type SearchUsersUseCaseProps = {
  readonly userRepository: UserRepository;
  readonly logger: Logger;
};

export type SearchUsersUseCase = UseCase<
  SearchUsersUseCaseInput,
  SearchUsersUseCaseOutput,
  SearchUsersUseCaseException
>;

/**
 * ユーザーを検索するユースケース
 *
 * キーワードで名前またはメールアドレスを部分一致検索します。
 * 自分自身は検索結果から除外されます。
 * 検索キーワードが空の場合、空の一覧を返します。
 */
export class SearchUsersUseCaseImpl implements SearchUsersUseCase {
  readonly #props: SearchUsersUseCaseProps;

  constructor(props: SearchUsersUseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: SearchUsersUseCaseInput,
  ): Promise<SearchUsersUseCaseResult> {
    const { userRepository, logger } = this.#props;
    const { keyword, currentUserId } = input;

    logger.debug("ユースケース: ユーザー検索を開始", { keyword });

    // 検索キーワードが空の場合、空の一覧を返す
    if (keyword.trim() === "") {
      logger.debug("検索キーワードが空のため、空の一覧を返す");
      return Result.ok([]);
    }

    // リポジトリから全ユーザーを取得
    const findAllResult = await userRepository.findAll();

    if (findAllResult.isErr()) {
      logger.error("ユーザー一覧の取得に失敗", findAllResult.error);
      return Result.err(findAllResult.error);
    }

    // キーワードで名前またはメールアドレスを部分一致検索
    // 自分自身は検索結果から除外
    const lowerKeyword = keyword.toLowerCase();
    const filteredUsers = findAllResult.data.filter((user) => {
      // 自分自身を除外
      if (user.id === currentUserId) {
        return false;
      }

      // 名前またはメールアドレスの部分一致検索
      const nameMatch = user.name.toLowerCase().includes(lowerKeyword);
      const emailMatch = user.email.toLowerCase().includes(lowerKeyword);

      return nameMatch || emailMatch;
    });

    logger.debug("ユーザー検索完了", {
      keyword,
      count: filteredUsers.length,
    });

    return Result.ok(filteredUsers);
  }
}
