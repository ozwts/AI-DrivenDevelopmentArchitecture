import { z } from "zod";
import {
  type DynamoDBDocumentClient,
  paginateQuery,
  paginateScan,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuid } from "uuid";
import type { Logger } from "@/application/port/logger";
import type { DynamoDBUnitOfWork } from "@/infrastructure/unit-of-work/dynamodb-unit-of-work";
import {
  type SaveResult,
  type RemoveResult,
  type FindByIdResult,
  type FindByProjectIdResult,
  type FindByProjectIdAndUserIdResult,
  type FindByUserIdResult,
  type CountOwnersByProjectIdResult,
  type ProjectMemberRepository,
} from "@/domain/model/project-member/project-member.repository";
import { ProjectMember } from "@/domain/model/project-member/project-member.entity";
import { MemberRole } from "@/domain/model/project-member/member-role.vo";
import { UnexpectedError } from "@/util/error-util";
import { Result } from "@/util/result";

/**
 * DynamoDBへ格納時のスキーマと型
 */
export const projectMemberDdbItemSchema = z.object({
  projectId: z.string(),
  memberId: z.string(),
  userId: z.string(),
  role: z.enum(["OWNER", "MEMBER"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProjectMemberDdbItem = z.infer<typeof projectMemberDdbItemSchema>;

export const projectMemberDdbItemToProjectMember = (
  item: ProjectMemberDdbItem,
): ProjectMember => {
  const roleResult = MemberRole.from({ role: item.role });
  if (roleResult.isErr()) {
    throw new Error(`Invalid role in DynamoDB: ${item.role}`);
  }

  return ProjectMember.from({
    id: item.memberId,
    projectId: item.projectId,
    userId: item.userId,
    role: roleResult.data,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  });
};

export const projectMemberDdbItemFromProjectMember = (
  member: ProjectMember,
): ProjectMemberDdbItem => ({
  projectId: member.projectId,
  memberId: member.id,
  userId: member.userId,
  role: member.role.role,
  createdAt: member.createdAt,
  updatedAt: member.updatedAt,
});

/**
 * リポジトリの実装
 */
export type ProjectMemberRepositoryProps = {
  ddbDoc: DynamoDBDocumentClient;
  projectMembersTableName: string;
  logger: Logger;
  uow?: DynamoDBUnitOfWork;
};

export class ProjectMemberRepositoryImpl implements ProjectMemberRepository {
  readonly #ddbDoc: DynamoDBDocumentClient;

  readonly #projectMembersTableName: string;

  readonly #logger: Logger;

  readonly #uow?: DynamoDBUnitOfWork;

  constructor({
    ddbDoc,
    projectMembersTableName,
    logger,
    uow,
  }: ProjectMemberRepositoryProps) {
    this.#ddbDoc = ddbDoc;
    this.#projectMembersTableName = projectMembersTableName;
    this.#logger = logger;
    this.#uow = uow;
  }

  projectMemberId(): string {
    return uuid();
  }

  async findById(props: { id: string }): Promise<FindByIdResult> {
    try {
      // memberIdだけではPKが不足するため、Scanが必要
      // ただし、通常はprojectIdと一緒に使われるため、findByProjectIdAndUserIdを使用することを推奨
      // ここではScanで実装（パフォーマンス上の制約あり）
      const members: ProjectMember[] = [];

      const paginator = paginateScan(
        { client: this.#ddbDoc },
        {
          TableName: this.#projectMembersTableName,
          FilterExpression: "memberId = :memberId",
          ExpressionAttributeValues: {
            ":memberId": props.id,
          },
        },
      );

      for await (const page of paginator) {
        if (page.Items !== undefined && page.Items.length > 0) {
          const items = page.Items.map((item) =>
            projectMemberDdbItemSchema.parse(item),
          );
          const fetchedMembers = items.map((item) =>
            projectMemberDdbItemToProjectMember(item),
          );
          members.push(...fetchedMembers);
        }
      }

      return Result.ok(members[0]);
    } catch (error) {
      this.#logger.error(
        "プロジェクトメンバーの取得に失敗しました",
        error as Error,
      );
      return Result.err(new UnexpectedError());
    }
  }

  async findByProjectId(props: {
    projectId: string;
  }): Promise<FindByProjectIdResult> {
    try {
      const members: ProjectMember[] = [];

      const paginator = paginateQuery(
        { client: this.#ddbDoc },
        {
          TableName: this.#projectMembersTableName,
          KeyConditionExpression: "projectId = :projectId",
          ExpressionAttributeValues: {
            ":projectId": props.projectId,
          },
        },
      );

      for await (const page of paginator) {
        if (page.Items !== undefined && page.Items.length > 0) {
          const items = page.Items.map((item) =>
            projectMemberDdbItemSchema.parse(item),
          );
          const fetchedMembers = items.map((item) =>
            projectMemberDdbItemToProjectMember(item),
          );
          members.push(...fetchedMembers);
        }
      }

      return Result.ok(members);
    } catch (error) {
      this.#logger.error(
        "プロジェクトメンバー一覧の取得に失敗しました",
        error as Error,
      );
      return Result.err(new UnexpectedError());
    }
  }

  async findByProjectIdAndUserId(props: {
    projectId: string;
    userId: string;
  }): Promise<FindByProjectIdAndUserIdResult> {
    try {
      const members: ProjectMember[] = [];

      const paginator = paginateQuery(
        { client: this.#ddbDoc },
        {
          TableName: this.#projectMembersTableName,
          KeyConditionExpression: "projectId = :projectId",
          FilterExpression: "userId = :userId",
          ExpressionAttributeValues: {
            ":projectId": props.projectId,
            ":userId": props.userId,
          },
        },
      );

      for await (const page of paginator) {
        if (page.Items !== undefined && page.Items.length > 0) {
          const items = page.Items.map((item) =>
            projectMemberDdbItemSchema.parse(item),
          );
          const fetchedMembers = items.map((item) =>
            projectMemberDdbItemToProjectMember(item),
          );
          members.push(...fetchedMembers);
        }
      }

      return Result.ok(members[0]);
    } catch (error) {
      this.#logger.error(
        "プロジェクトメンバーの取得に失敗しました",
        error as Error,
      );
      return Result.err(new UnexpectedError());
    }
  }

  async findByUserId(props: { userId: string }): Promise<FindByUserIdResult> {
    try {
      const members: ProjectMember[] = [];

      // userIdはPKではないためScanが必要
      // GSI（userId-index）があれば効率化可能だが、現時点ではScanで実装
      const paginator = paginateScan(
        { client: this.#ddbDoc },
        {
          TableName: this.#projectMembersTableName,
          FilterExpression: "userId = :userId",
          ExpressionAttributeValues: {
            ":userId": props.userId,
          },
        },
      );

      for await (const page of paginator) {
        if (page.Items !== undefined && page.Items.length > 0) {
          const items = page.Items.map((item) =>
            projectMemberDdbItemSchema.parse(item),
          );
          const fetchedMembers = items.map((item) =>
            projectMemberDdbItemToProjectMember(item),
          );
          members.push(...fetchedMembers);
        }
      }

      return Result.ok(members);
    } catch (error) {
      this.#logger.error(
        "ユーザーのメンバーシップ一覧の取得に失敗しました",
        error as Error,
      );
      return Result.err(new UnexpectedError());
    }
  }

  async countOwnersByProjectId(props: {
    projectId: string;
  }): Promise<CountOwnersByProjectIdResult> {
    try {
      let count = 0;

      const paginator = paginateQuery(
        { client: this.#ddbDoc },
        {
          TableName: this.#projectMembersTableName,
          KeyConditionExpression: "projectId = :projectId",
          FilterExpression: "#role = :role",
          ExpressionAttributeNames: {
            "#role": "role",
          },
          ExpressionAttributeValues: {
            ":projectId": props.projectId,
            ":role": "OWNER",
          },
          Select: "COUNT",
        },
      );

      for await (const page of paginator) {
        count += page.Count ?? 0;
      }

      return Result.ok(count);
    } catch (error) {
      this.#logger.error("オーナー数の取得に失敗しました", error as Error);
      return Result.err(new UnexpectedError());
    }
  }

  async save(props: { projectMember: ProjectMember }): Promise<SaveResult> {
    const item = projectMemberDdbItemFromProjectMember(props.projectMember);
    const operation = {
      Put: {
        TableName: this.#projectMembersTableName,
        Item: item,
      },
    };

    try {
      if (this.#uow !== undefined) {
        this.#uow.registerOperation(operation);
      } else {
        await this.#ddbDoc.send(
          new TransactWriteCommand({
            TransactItems: [operation],
          }),
        );
      }

      return Result.ok(undefined);
    } catch (error) {
      this.#logger.error(
        "プロジェクトメンバーの保存に失敗しました",
        error as Error,
      );
      return Result.err(new UnexpectedError());
    }
  }

  async remove(props: { id: string }): Promise<RemoveResult> {
    try {
      // memberIdからprojectIdを取得する必要がある
      const findResult = await this.findById({ id: props.id });
      if (findResult.isErr()) {
        return Result.err(findResult.error);
      }

      const member = findResult.data;
      if (member === undefined) {
        // 既に存在しない場合は成功として扱う（冪等性）
        return Result.ok(undefined);
      }

      const operation = {
        Delete: {
          TableName: this.#projectMembersTableName,
          Key: {
            projectId: member.projectId,
            memberId: member.id,
          },
        },
      };

      if (this.#uow !== undefined) {
        this.#uow.registerOperation(operation);
      } else {
        await this.#ddbDoc.send(
          new TransactWriteCommand({
            TransactItems: [operation],
          }),
        );
      }

      return Result.ok(undefined);
    } catch (error) {
      this.#logger.error(
        "プロジェクトメンバーの削除に失敗しました",
        error as Error,
      );
      return Result.err(new UnexpectedError());
    }
  }
}
