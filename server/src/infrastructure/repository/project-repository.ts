import { z } from "zod";
import {
  type DynamoDBDocumentClient,
  GetCommand,
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
  type FindByIdsResult,
  type FindAllResult,
  type ProjectRepository,
} from "@/domain/model/project/project.repository";
import { Project } from "@/domain/model/project/project.entity";
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

export const projectDdbItemToProject = (
  projectDdbItem: ProjectDdbItem,
): Project =>
  // DynamoDB色文字列をそのまま使用（ProjectはcolorをProject.fromで処理する）
  Project.from({
    id: projectDdbItem.projectId,
    name: projectDdbItem.name,
    description: projectDdbItem.description,
    color: projectDdbItem.color,
    createdAt: projectDdbItem.createdAt,
    updatedAt: projectDdbItem.updatedAt,
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
  logger: Logger;
  uow?: DynamoDBUnitOfWork;
};

export class ProjectRepositoryImpl implements ProjectRepository {
  readonly #ddbDoc: DynamoDBDocumentClient;

  readonly #projectsTableName: string;

  readonly #logger: Logger;

  readonly #uow?: DynamoDBUnitOfWork;

  constructor({
    ddbDoc,
    projectsTableName,
    logger,
    uow,
  }: ProjectRepositoryProps) {
    this.#ddbDoc = ddbDoc;
    this.#projectsTableName = projectsTableName;
    this.#logger = logger;
    this.#uow = uow;
  }

  projectId(): string {
    return uuid();
  }

  async findById(props: { id: string }): Promise<FindByIdResult> {
    try {
      const result = await this.#ddbDoc.send(
        new GetCommand({
          TableName: this.#projectsTableName,
          Key: { projectId: props.id },
        }),
      );

      if (result.Item === undefined) {
        return Result.ok(undefined);
      }

      const projectDdbItem = projectDdbItemSchema.parse(result.Item);
      const project = projectDdbItemToProject(projectDdbItem);

      return Result.ok(project);
    } catch (error) {
      this.#logger.error("プロジェクトの取得に失敗しました", error as Error);
      return Result.err(new UnexpectedError());
    }
  }

  async findByIds(props: { ids: string[] }): Promise<FindByIdsResult> {
    try {
      if (props.ids.length === 0) {
        return Result.ok([]);
      }

      // 各IDに対してfindByIdを呼び出し、結果を集約
      const results = await Promise.all(
        props.ids.map((id) => this.findById({ id })),
      );

      const projects: Project[] = [];
      for (const result of results) {
        if (result.isErr()) {
          return Result.err(result.error);
        }
        if (result.data !== undefined) {
          projects.push(result.data);
        }
      }

      return Result.ok(projects);
    } catch (error) {
      this.#logger.error(
        "プロジェクト一覧の取得に失敗しました（findByIds）",
        error as Error,
      );
      return Result.err(new UnexpectedError());
    }
  }

  async findAll(): Promise<FindAllResult> {
    try {
      const projects: Project[] = [];

      const paginator = paginateScan(
        { client: this.#ddbDoc },
        { TableName: this.#projectsTableName },
      );

      for await (const page of paginator) {
        if (page.Items !== undefined && page.Items.length > 0) {
          const projectDdbItems = page.Items.map((item) =>
            projectDdbItemSchema.parse(item),
          );
          const fetchedProjects = projectDdbItems.map((projectDdbItem) =>
            projectDdbItemToProject(projectDdbItem),
          );
          projects.push(...fetchedProjects);
        }
      }

      return Result.ok(projects);
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
    const operation = {
      Put: {
        TableName: this.#projectsTableName,
        Item: projectDdbItem,
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
      this.#logger.error("プロジェクトの保存に失敗しました", error as Error);
      return Result.err(new UnexpectedError());
    }
  }

  async remove(props: { id: string }): Promise<RemoveResult> {
    const operation = {
      Delete: {
        TableName: this.#projectsTableName,
        Key: { projectId: props.id },
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
      this.#logger.error("プロジェクトの削除に失敗しました", error as Error);
      return Result.err(new UnexpectedError());
    }
  }
}
