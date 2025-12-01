import { z } from "zod";
import {
  type DynamoDBDocumentClient,
  GetCommand,
  paginateScan,
  paginateQuery,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuid } from "uuid";
import type { Logger } from "@/domain/support/logger";
import type { DynamoDBUnitOfWork } from "@/infrastructure/unit-of-work/dynamodb-unit-of-work";
import {
  type SaveResult,
  type RemoveResult,
  type FindByIdResult,
  type FindAllResult,
  type UserRepository,
} from "@/domain/model/user/user.repository";
import { User } from "@/domain/model/user/user.entity";
import { UnexpectedError } from "@/util/error-util";
import { Result } from "@/util/result";

/**
 * DynamoDBへ格納時のスキーマと型
 */
export const userDdbItemSchema = z.object({
  userId: z.string(),
  sub: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserDdbItem = z.infer<typeof userDdbItemSchema>;

export const userDdbItemToUser = (userDdbItem: UserDdbItem): User =>
  User.from({
    id: userDdbItem.userId,
    sub: userDdbItem.sub,
    name: userDdbItem.name,
    email: userDdbItem.email,
    emailVerified: userDdbItem.emailVerified,
    createdAt: userDdbItem.createdAt,
    updatedAt: userDdbItem.updatedAt,
  });

/**
 * User → UserDdbItem 変換
 *
 * DynamoDB GSI制約対応:
 * GSIキー属性（sub）が空文字列の場合、DynamoDBに保存できないためエラーを投げる。
 * subは必須フィールドであり、通常は空文字列になることはないが、
 * インフラ層で防御的にチェックする。
 */
export const userDdbItemFromUser = (user: User): UserDdbItem => {
  // GSIキー属性の空文字列チェック
  if (user.sub === "") {
    throw new UnexpectedError("subは必須です");
  }

  return {
    userId: user.id,
    sub: user.sub,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

/**
 * リポジトリの実装
 */
export type UserRepositoryProps = {
  ddbDoc: DynamoDBDocumentClient;
  usersTableName: string;
  logger: Logger;
  uow?: DynamoDBUnitOfWork;
};

export class UserRepositoryImpl implements UserRepository {
  readonly #ddbDoc: DynamoDBDocumentClient;

  readonly #usersTableName: string;

  readonly #logger: Logger;

  readonly #uow?: DynamoDBUnitOfWork;

  constructor({ ddbDoc, usersTableName, logger, uow }: UserRepositoryProps) {
    this.#ddbDoc = ddbDoc;
    this.#usersTableName = usersTableName;
    this.#logger = logger;
    this.#uow = uow;
  }

  userId(): string {
    return uuid();
  }

  async findById(props: { id: string }): Promise<FindByIdResult> {
    try {
      const result = await this.#ddbDoc.send(
        new GetCommand({
          TableName: this.#usersTableName,
          Key: { userId: props.id },
        }),
      );

      if (result.Item === undefined) {
        return Result.ok(undefined);
      }

      const userDdbItem = userDdbItemSchema.parse(result.Item);
      const user = userDdbItemToUser(userDdbItem);

      return Result.ok(user);
    } catch (error) {
      this.#logger.error("ユーザーの取得に失敗しました", error as Error);
      return Result.err(new UnexpectedError());
    }
  }

  async findBySub(props: { sub: string }): Promise<FindByIdResult> {
    try {
      const users: User[] = [];

      const paginator = paginateQuery(
        { client: this.#ddbDoc },
        {
          TableName: this.#usersTableName,
          IndexName: "SubIndex",
          KeyConditionExpression: "#sub = :sub",
          ExpressionAttributeNames: {
            "#sub": "sub",
          },
          ExpressionAttributeValues: {
            ":sub": props.sub,
          },
        },
      );

      for await (const page of paginator) {
        if (page.Items !== undefined && page.Items.length > 0) {
          const userDdbItems = page.Items.map((item) =>
            userDdbItemSchema.parse(item),
          );
          const fetchedUsers = userDdbItems.map((userDdbItem) =>
            userDdbItemToUser(userDdbItem),
          );
          users.push(...fetchedUsers);
        }
      }

      // subはユニークなので、最初の1件を返す
      return Result.ok(users[0]);
    } catch (error) {
      this.#logger.error(
        "Cognito Subによるユーザーの取得に失敗しました",
        error as Error,
      );
      return Result.err(new UnexpectedError());
    }
  }

  async findAll(): Promise<FindAllResult> {
    try {
      const users: User[] = [];

      const paginator = paginateScan(
        { client: this.#ddbDoc },
        { TableName: this.#usersTableName },
      );

      for await (const page of paginator) {
        if (page.Items !== undefined && page.Items.length > 0) {
          const userDdbItems = page.Items.map((item) =>
            userDdbItemSchema.parse(item),
          );
          const fetchedUsers = userDdbItems.map((userDdbItem) =>
            userDdbItemToUser(userDdbItem),
          );
          users.push(...fetchedUsers);
        }
      }

      return Result.ok(users);
    } catch (error) {
      this.#logger.error("ユーザー一覧の取得に失敗しました", error as Error);
      return Result.err(new UnexpectedError());
    }
  }

  async save(props: { user: User }): Promise<SaveResult> {
    const userDdbItem = userDdbItemFromUser(props.user);
    const operation = {
      Put: {
        TableName: this.#usersTableName,
        Item: userDdbItem,
      },
    };

    try {
      if (this.#uow !== undefined) {
        // UoWが渡されている場合は操作を登録（コミットはrunner側で行う）
        this.#uow.registerOperation(operation);
      } else {
        // UoWなしの場合は即座に実行
        await this.#ddbDoc.send(
          new TransactWriteCommand({
            TransactItems: [operation],
          }),
        );
      }

      return Result.ok(undefined);
    } catch (error) {
      this.#logger.error("ユーザーの保存に失敗しました", error as Error);
      return Result.err(new UnexpectedError());
    }
  }

  async remove(props: { id: string }): Promise<RemoveResult> {
    const operation = {
      Delete: {
        TableName: this.#usersTableName,
        Key: { userId: props.id },
      },
    };

    try {
      if (this.#uow !== undefined) {
        // UoWが渡されている場合は操作を登録（コミットはrunner側で行う）
        this.#uow.registerOperation(operation);
      } else {
        // UoWなしの場合は即座に実行
        await this.#ddbDoc.send(
          new TransactWriteCommand({
            TransactItems: [operation],
          }),
        );
      }

      return Result.ok(undefined);
    } catch (error) {
      this.#logger.error("ユーザーの削除に失敗しました", error as Error);
      return Result.err(new UnexpectedError());
    }
  }
}
