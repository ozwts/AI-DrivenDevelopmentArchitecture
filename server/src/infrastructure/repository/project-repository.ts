import { z } from "zod";
import {
  type DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
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
  type FindAllResult,
  type ProjectRepository,
} from "@/domain/model/project/project.repository";
import { Project } from "@/domain/model/project/project.entity";
import { ProjectMember } from "@/domain/model/project/project-member.entity";
import { MemberRole } from "@/domain/model/project/member-role.vo";
import { UnexpectedError } from "@/util/error-util";
import { Result } from "@/util/result";

/**
 * DynamoDBへ格納時のスキーマと型
 */
export const projectDdbItemSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  color: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProjectDdbItem = z.infer<typeof projectDdbItemSchema>;

/**
 * ProjectMembersテーブル用のスキーマ
 */
export const projectMemberTableItemSchema = z.object({
  projectId: z.string(),
  projectMemberId: z.string(),
  userId: z.string(),
  role: z.enum(["owner", "member"]),
  joinedAt: z.string(),
});

export type ProjectMemberTableItem = z.infer<typeof projectMemberTableItemSchema>;

/**
 * ProjectMemberTableItem → ProjectMember 変換
 */
export const projectMemberTableItemToProjectMember = (
  item: ProjectMemberTableItem,
): ProjectMember => {
  const roleResult = MemberRole.from({ role: item.role });
  if (!roleResult.isOk()) {
    throw roleResult.error;
  }

  return ProjectMember.from({
    id: item.projectMemberId,
    userId: item.userId,
    role: roleResult.data,
    joinedAt: item.joinedAt,
  });
};

/**
 * ProjectMember → ProjectMemberTableItem 変換
 */
export const projectMemberTableItemFromProjectMember = (
  projectId: string,
  member: ProjectMember,
): ProjectMemberTableItem => ({
  projectId,
  projectMemberId: member.id,
  userId: member.userId,
  role: member.role.role,
  joinedAt: member.joinedAt,
});

/**
 * ProjectDdbItem → Project 変換
 *
 * membersはProjectMembersテーブルから別途取得して渡す必要があります。
 */
export const projectDdbItemToProject = (
  projectDdbItem: ProjectDdbItem,
  members: ProjectMember[] = [],
): Project =>
  Project.from({
    id: projectDdbItem.projectId,
    name: projectDdbItem.name,
    description: projectDdbItem.description,
    color: projectDdbItem.color,
    createdAt: projectDdbItem.createdAt,
    updatedAt: projectDdbItem.updatedAt,
    members,
  });

export const projectDdbItemFromProject = (
  project: Project,
): ProjectDdbItem => ({
  projectId: project.id,
  name: project.name,
  description: project.description,
  color: project.color,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
});

/**
 * リポジトリの実装
 */
export type ProjectRepositoryProps = {
  ddbDoc: DynamoDBDocumentClient;
  projectsTableName: string;
  projectMembersTableName: string;
  logger: Logger;
  uow?: DynamoDBUnitOfWork;
};

export class ProjectRepositoryImpl implements ProjectRepository {
  readonly #ddbDoc: DynamoDBDocumentClient;

  readonly #projectsTableName: string;

  readonly #projectMembersTableName: string;

  readonly #logger: Logger;

  readonly #uow?: DynamoDBUnitOfWork;

  constructor({
    ddbDoc,
    projectsTableName,
    projectMembersTableName,
    logger,
    uow,
  }: ProjectRepositoryProps) {
    this.#ddbDoc = ddbDoc;
    this.#projectsTableName = projectsTableName;
    this.#projectMembersTableName = projectMembersTableName;
    this.#logger = logger;
    this.#uow = uow;
  }

  projectId(): string {
    return uuid();
  }

  projectMemberId(): string {
    return uuid();
  }

  async findById(props: { id: string }): Promise<FindByIdResult> {
    try {
      // Projectsテーブルから取得
      const projectResult = await this.#ddbDoc.send(
        new GetCommand({
          TableName: this.#projectsTableName,
          Key: { projectId: props.id },
        }),
      );

      if (projectResult.Item === undefined) {
        return Result.ok(undefined);
      }

      // ProjectMembersテーブルから取得
      const membersResult = await this.#ddbDoc.send(
        new QueryCommand({
          TableName: this.#projectMembersTableName,
          KeyConditionExpression: "projectId = :projectId",
          ExpressionAttributeValues: {
            ":projectId": props.id,
          },
        }),
      );

      const memberItems = (membersResult.Items ?? []).map((item) =>
        projectMemberTableItemSchema.parse(item),
      );

      const members = memberItems.map((item) =>
        projectMemberTableItemToProjectMember(item),
      );

      const projectDdbItem = projectDdbItemSchema.parse(projectResult.Item);
      const project = projectDdbItemToProject(projectDdbItem, members);

      return Result.ok(project);
    } catch (error) {
      this.#logger.error("プロジェクトの取得に失敗しました", error as Error);
      return Result.err(new UnexpectedError());
    }
  }

  async findAll(): Promise<FindAllResult> {
    try {
      const projectDdbItems: ProjectDdbItem[] = [];

      const paginator = paginateScan(
        { client: this.#ddbDoc },
        { TableName: this.#projectsTableName },
      );

      for await (const page of paginator) {
        if (page.Items !== undefined && page.Items.length > 0) {
          const parsedItems = page.Items.map((item) =>
            projectDdbItemSchema.parse(item),
          );
          projectDdbItems.push(...parsedItems);
        }
      }

      // 各プロジェクトのメンバーを取得（並列実行）
      const projectsWithMembers = await Promise.all(
        projectDdbItems.map(async (projectDdbItem) => {
          const membersResult = await this.#ddbDoc.send(
            new QueryCommand({
              TableName: this.#projectMembersTableName,
              KeyConditionExpression: "projectId = :projectId",
              ExpressionAttributeValues: {
                ":projectId": projectDdbItem.projectId,
              },
            }),
          );

          const memberItems = (membersResult.Items ?? []).map((item) =>
            projectMemberTableItemSchema.parse(item),
          );

          const members = memberItems.map((item) =>
            projectMemberTableItemToProjectMember(item),
          );

          return projectDdbItemToProject(projectDdbItem, members);
        }),
      );

      return Result.ok(projectsWithMembers);
    } catch (error) {
      this.#logger.error(
        "プロジェクト一覧の取得に失敗しました",
        error as Error,
      );
      return Result.err(new UnexpectedError());
    }
  }

  async save(props: { project: Project }): Promise<SaveResult> {
    const projectDdbItem = projectDdbItemFromProject(props.project);

    try {
      // 既存のmembersを取得（削除のため）
      const existingMembersResult = await this.#ddbDoc.send(
        new QueryCommand({
          TableName: this.#projectMembersTableName,
          KeyConditionExpression: "projectId = :projectId",
          ExpressionAttributeValues: {
            ":projectId": props.project.id,
          },
        }),
      );

      // Projectsテーブルへの操作
      const projectOperation = {
        Put: {
          TableName: this.#projectsTableName,
          Item: projectDdbItem,
        },
      };

      // 新しいmembersのIDセット
      const newMemberIds = new Set(
        props.project.members.map((member) => member.id),
      );

      // 既存のmembersのうち、新しいmembersに含まれていないものを削除
      const deleteMemberOperations = (existingMembersResult.Items ?? [])
        .map((item) => projectMemberTableItemSchema.parse(item))
        .filter((item) => !newMemberIds.has(item.projectMemberId))
        .map((item) => ({
          Delete: {
            TableName: this.#projectMembersTableName,
            Key: {
              projectId: item.projectId,
              projectMemberId: item.projectMemberId,
            },
          },
        }));

      // 新しいmembersを挿入する操作
      const putMemberOperations = props.project.members.map((member) => ({
        Put: {
          TableName: this.#projectMembersTableName,
          Item: projectMemberTableItemFromProjectMember(props.project.id, member),
        },
      }));

      // すべての操作を結合
      const operations = [
        projectOperation,
        ...deleteMemberOperations,
        ...putMemberOperations,
      ];

      if (this.#uow !== undefined) {
        // UoWが渡されている場合は操作を登録（コミットはrunner側で行う）
        for (const operation of operations) {
          this.#uow.registerOperation(operation);
        }
      } else {
        // UoWなしの場合は即座に実行
        await this.#ddbDoc.send(
          new TransactWriteCommand({
            TransactItems: operations,
          }),
        );
      }

      return Result.ok(undefined);
    } catch (error) {
      this.#logger.error("プロジェクトの保存に失敗しました", error as Error);
      return Result.err(new UnexpectedError());
    }
  }

  async remove(props: { id: string }): Promise<RemoveResult> {
    try {
      // 既存のmembersを取得（削除のため）
      const existingMembersResult = await this.#ddbDoc.send(
        new QueryCommand({
          TableName: this.#projectMembersTableName,
          KeyConditionExpression: "projectId = :projectId",
          ExpressionAttributeValues: {
            ":projectId": props.id,
          },
        }),
      );

      // Projectsテーブルからの削除操作
      const projectOperation = {
        Delete: {
          TableName: this.#projectsTableName,
          Key: { projectId: props.id },
        },
      };

      // ProjectMembersテーブルからの削除操作
      const deleteMemberOperations = (existingMembersResult.Items ?? [])
        .map((item) => projectMemberTableItemSchema.parse(item))
        .map((item) => ({
          Delete: {
            TableName: this.#projectMembersTableName,
            Key: {
              projectId: item.projectId,
              projectMemberId: item.projectMemberId,
            },
          },
        }));

      // すべての操作を結合
      const operations = [projectOperation, ...deleteMemberOperations];

      if (this.#uow !== undefined) {
        // UoWが渡されている場合は操作を登録（コミットはrunner側で行う）
        for (const operation of operations) {
          this.#uow.registerOperation(operation);
        }
      } else {
        // UoWなしの場合は即座に実行
        await this.#ddbDoc.send(
          new TransactWriteCommand({
            TransactItems: operations,
          }),
        );
      }

      return Result.ok(undefined);
    } catch (error) {
      this.#logger.error("プロジェクトの削除に失敗しました", error as Error);
      return Result.err(new UnexpectedError());
    }
  }
}
