import { z } from "zod";
import {
  type DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  paginateScan,
  paginateQuery,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuid } from "uuid";
import type { Logger } from "@/domain/support/logger";
import type { DynamoDBUnitOfWork } from "@/infrastructure/unit-of-work/dynamodb-unit-of-work";
import {
  SaveResult,
  RemoveResult,
  FindByIdResult,
  FindAllResult,
  FindByStatusResult,
  FindByProjectIdResult,
  type TodoRepository,
} from "@/domain/model/todo/todo-repository";
import {
  Todo,
  type TodoStatus,
  type TodoPriority,
} from "@/domain/model/todo/todo";
import {
  Attachment,
  type AttachmentStatus,
} from "@/domain/model/attachment/attachment";
import { UnexpectedError } from "@/util/error-util";

/**
 * DynamoDB格納用のAttachmentスキーマ（Todosテーブル内の埋め込み用）
 */
export const attachmentDdbItemSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  storageKey: z.string(),
  contentType: z.string(),
  fileSize: z.number(),
  status: z.enum(["PREPARED", "UPLOADED"]),
  uploadedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AttachmentDdbItem = z.infer<typeof attachmentDdbItemSchema>;

/**
 * Attachmentsテーブル用のAttachmentスキーマ
 */
export const attachmentTableItemSchema = z.object({
  todoId: z.string(),
  attachmentId: z.string(),
  fileName: z.string(),
  storageKey: z.string(),
  contentType: z.string(),
  fileSize: z.number(),
  status: z.enum(["PREPARED", "UPLOADED"]),
  uploadedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AttachmentTableItem = z.infer<typeof attachmentTableItemSchema>;

/**
 * DynamoDBへ格納時のスキーマと型
 */
export const todoDdbItemSchema = z.object({
  todoId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  dueDate: z.string().optional(),
  projectId: z.string().optional(),
  assigneeUserId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TodoDdbItem = z.infer<typeof todoDdbItemSchema>;

/**
 * AttachmentDdbItem → Attachment 変換
 */
export const attachmentDdbItemToAttachment = (
  attachmentDdbItem: AttachmentDdbItem,
): Attachment =>
  new Attachment({
    id: attachmentDdbItem.id,
    fileName: attachmentDdbItem.fileName,
    storageKey: attachmentDdbItem.storageKey,
    contentType: attachmentDdbItem.contentType,
    fileSize: attachmentDdbItem.fileSize,
    status: attachmentDdbItem.status as AttachmentStatus,
    uploadedBy: attachmentDdbItem.uploadedBy,
    createdAt: attachmentDdbItem.createdAt,
    updatedAt: attachmentDdbItem.updatedAt,
  });

/**
 * Attachment → AttachmentDdbItem 変換
 */
export const attachmentDdbItemFromAttachment = (
  attachment: Attachment,
): AttachmentDdbItem => ({
  id: attachment.id,
  fileName: attachment.fileName,
  storageKey: attachment.storageKey,
  contentType: attachment.contentType,
  fileSize: attachment.fileSize,
  status: attachment.status,
  uploadedBy: attachment.uploadedBy,
  createdAt: attachment.createdAt,
  updatedAt: attachment.updatedAt,
});

/**
 * Attachment → AttachmentTableItem 変換（Attachmentsテーブル用）
 */
export const attachmentTableItemFromAttachment = (
  todoId: string,
  attachment: Attachment,
): AttachmentTableItem => ({
  todoId,
  attachmentId: attachment.id,
  fileName: attachment.fileName,
  storageKey: attachment.storageKey,
  contentType: attachment.contentType,
  fileSize: attachment.fileSize,
  status: attachment.status,
  uploadedBy: attachment.uploadedBy,
  createdAt: attachment.createdAt,
  updatedAt: attachment.updatedAt,
});

/**
 * TodoDdbItem → Todo 変換
 *
 * attachmentsはAttachmentsテーブルから別途取得して渡す必要があります。
 */
export const todoDdbItemToTodo = (
  todoDdbItem: TodoDdbItem,
  attachments: Attachment[] = [],
): Todo =>
  new Todo({
    id: todoDdbItem.todoId,
    title: todoDdbItem.title,
    description: todoDdbItem.description,
    status: todoDdbItem.status as TodoStatus,
    priority: todoDdbItem.priority as TodoPriority,
    dueDate: todoDdbItem.dueDate,
    projectId: todoDdbItem.projectId,
    assigneeUserId: todoDdbItem.assigneeUserId,
    attachments,
    createdAt: todoDdbItem.createdAt,
    updatedAt: todoDdbItem.updatedAt,
  });

/**
 * Todo → TodoDdbItem 変換
 *
 * DynamoDB GSI制約対応:
 * GSIキー属性（projectId, assigneeUserId）が空文字列の場合、
 * DynamoDBに保存できないためundefinedとして扱う。
 * これにより、該当フィールドがDynamoDBアイテムから除外される。
 */
export const todoDdbItemFromTodo = (todo: Todo): TodoDdbItem => {
  // GSIキー属性の空文字列をundefinedに変換
  const projectId =
    todo.projectId === undefined ||
    todo.projectId === null ||
    todo.projectId === ""
      ? undefined
      : todo.projectId;

  const assigneeUserId =
    todo.assigneeUserId === undefined ||
    todo.assigneeUserId === null ||
    todo.assigneeUserId === ""
      ? undefined
      : todo.assigneeUserId;

  // assigneeUserIdが空の場合はエラー（必須フィールド）
  if (assigneeUserId === undefined) {
    throw new UnexpectedError("assigneeUserIdは必須です");
  }

  return {
    todoId: todo.id,
    title: todo.title,
    description: todo.description,
    status: todo.status,
    priority: todo.priority,
    dueDate: todo.dueDate,
    projectId, // 空文字列の場合はundefined
    assigneeUserId, // 検証済み
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
  };
};

/**
 * リポジトリの実装
 */
export type TodoRepositoryProps = {
  ddbDoc: DynamoDBDocumentClient;
  todosTableName: string;
  attachmentsTableName: string;
  logger: Logger;
  uow?: DynamoDBUnitOfWork;
};

export class TodoRepositoryImpl implements TodoRepository {
  readonly #ddbDoc: DynamoDBDocumentClient;

  readonly #todosTableName: string;

  readonly #attachmentsTableName: string;

  readonly #logger: Logger;

  readonly #uow?: DynamoDBUnitOfWork;

  constructor({
    ddbDoc,
    todosTableName,
    attachmentsTableName,
    logger,
    uow,
  }: TodoRepositoryProps) {
    this.#ddbDoc = ddbDoc;
    this.#todosTableName = todosTableName;
    this.#attachmentsTableName = attachmentsTableName;
    this.#logger = logger;
    this.#uow = uow;
  }

  // eslint-disable-next-line class-methods-use-this
  todoId(): string {
    return uuid();
  }

  // eslint-disable-next-line class-methods-use-this
  attachmentId(): string {
    return uuid();
  }

  async findById(props: { id: string }): Promise<FindByIdResult> {
    try {
      // Todosテーブルから取得
      const todoResult = await this.#ddbDoc.send(
        new GetCommand({
          TableName: this.#todosTableName,
          Key: { todoId: props.id },
        }),
      );

      if (todoResult.Item === undefined) {
        return {
          success: true,
          data: undefined,
        };
      }

      // Attachmentsテーブルから取得
      const attachmentsResult = await this.#ddbDoc.send(
        new QueryCommand({
          TableName: this.#attachmentsTableName,
          KeyConditionExpression: "todoId = :todoId",
          ExpressionAttributeValues: {
            ":todoId": props.id,
          },
        }),
      );

      const attachmentItems = (attachmentsResult.Items ?? []).map((item) =>
        attachmentTableItemSchema.parse(item),
      );

      const attachments = attachmentItems.map((item) =>
        attachmentDdbItemToAttachment({
          id: item.attachmentId,
          fileName: item.fileName,
          storageKey: item.storageKey,
          contentType: item.contentType,
          fileSize: item.fileSize,
          status: item.status,
          uploadedBy: item.uploadedBy,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }),
      );

      // TodoDdbItemをパース（attachmentsは無視）
      const todoDdbItem = todoDdbItemSchema.parse(todoResult.Item);

      // Todoエンティティを作成（Attachmentsテーブルから取得したattachmentsを使用）
      const todo = new Todo({
        id: todoDdbItem.todoId,
        title: todoDdbItem.title,
        description: todoDdbItem.description,
        status: todoDdbItem.status as TodoStatus,
        priority: todoDdbItem.priority as TodoPriority,
        dueDate: todoDdbItem.dueDate,
        projectId: todoDdbItem.projectId,
        assigneeUserId: todoDdbItem.assigneeUserId,
        attachments,
        createdAt: todoDdbItem.createdAt,
        updatedAt: todoDdbItem.updatedAt,
      });

      return {
        success: true,
        data: todo,
      };
    } catch (error) {
      this.#logger.error("TODOの取得に失敗しました", error as Error);
      return {
        success: false,
        error: new UnexpectedError(),
      };
    }
  }

  async findAll(): Promise<FindAllResult> {
    try {
      const todoDdbItems: TodoDdbItem[] = [];

      const paginator = paginateScan(
        { client: this.#ddbDoc },
        { TableName: this.#todosTableName },
      );

      for await (const page of paginator) {
        if (page.Items !== undefined && page.Items.length > 0) {
          const parsedItems = page.Items.map((item) =>
            todoDdbItemSchema.parse(item),
          );
          todoDdbItems.push(...parsedItems);
        }
      }

      // 各TODOのAttachmentsを取得（並列実行）
      const todosWithAttachments = await Promise.all(
        todoDdbItems.map(async (todoDdbItem) => {
          const attachmentsResult = await this.#ddbDoc.send(
            new QueryCommand({
              TableName: this.#attachmentsTableName,
              KeyConditionExpression: "todoId = :todoId",
              ExpressionAttributeValues: {
                ":todoId": todoDdbItem.todoId,
              },
            }),
          );

          const attachmentItems = (attachmentsResult.Items ?? []).map((item) =>
            attachmentTableItemSchema.parse(item),
          );

          const attachments = attachmentItems.map((item) =>
            attachmentDdbItemToAttachment({
              id: item.attachmentId,
              fileName: item.fileName,
              storageKey: item.storageKey,
              contentType: item.contentType,
              fileSize: item.fileSize,
              status: item.status,
              uploadedBy: item.uploadedBy,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            }),
          );

          return todoDdbItemToTodo(todoDdbItem, attachments);
        }),
      );

      return {
        success: true,
        data: todosWithAttachments,
      };
    } catch (error) {
      this.#logger.error("TODO一覧の取得に失敗しました", error as Error);
      return {
        success: false,
        error: new UnexpectedError(),
      };
    }
  }

  async findByStatus(props: {
    status: TodoStatus;
  }): Promise<FindByStatusResult> {
    try {
      const todoDdbItems: TodoDdbItem[] = [];

      const paginator = paginateQuery(
        { client: this.#ddbDoc },
        {
          TableName: this.#todosTableName,
          IndexName: "StatusIndex",
          KeyConditionExpression: "#status = :status",
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":status": props.status,
          },
        },
      );

      for await (const page of paginator) {
        if (page.Items !== undefined && page.Items.length > 0) {
          const parsedItems = page.Items.map((item) =>
            todoDdbItemSchema.parse(item),
          );
          todoDdbItems.push(...parsedItems);
        }
      }

      // 各TODOのAttachmentsを取得（並列実行）
      const todosWithAttachments = await Promise.all(
        todoDdbItems.map(async (todoDdbItem) => {
          const attachmentsResult = await this.#ddbDoc.send(
            new QueryCommand({
              TableName: this.#attachmentsTableName,
              KeyConditionExpression: "todoId = :todoId",
              ExpressionAttributeValues: {
                ":todoId": todoDdbItem.todoId,
              },
            }),
          );

          const attachmentItems = (attachmentsResult.Items ?? []).map((item) =>
            attachmentTableItemSchema.parse(item),
          );

          const attachments = attachmentItems.map((item) =>
            attachmentDdbItemToAttachment({
              id: item.attachmentId,
              fileName: item.fileName,
              storageKey: item.storageKey,
              contentType: item.contentType,
              fileSize: item.fileSize,
              status: item.status,
              uploadedBy: item.uploadedBy,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            }),
          );

          return todoDdbItemToTodo(todoDdbItem, attachments);
        }),
      );

      return {
        success: true,
        data: todosWithAttachments,
      };
    } catch (error) {
      this.#logger.error(
        "ステータスによるTODO一覧の取得に失敗しました",
        error as Error,
      );
      return {
        success: false,
        error: new UnexpectedError(),
      };
    }
  }

  async findByProjectId(props: {
    projectId: string;
  }): Promise<FindByProjectIdResult> {
    try {
      const todoDdbItems: TodoDdbItem[] = [];

      const paginator = paginateQuery(
        { client: this.#ddbDoc },
        {
          TableName: this.#todosTableName,
          IndexName: "ProjectIdIndex",
          KeyConditionExpression: "#projectId = :projectId",
          ExpressionAttributeNames: {
            "#projectId": "projectId",
          },
          ExpressionAttributeValues: {
            ":projectId": props.projectId,
          },
        },
      );

      for await (const page of paginator) {
        if (page.Items !== undefined && page.Items.length > 0) {
          const parsedItems = page.Items.map((item) =>
            todoDdbItemSchema.parse(item),
          );
          todoDdbItems.push(...parsedItems);
        }
      }

      // 各TODOのAttachmentsを取得（並列実行）
      const todosWithAttachments = await Promise.all(
        todoDdbItems.map(async (todoDdbItem) => {
          const attachmentsResult = await this.#ddbDoc.send(
            new QueryCommand({
              TableName: this.#attachmentsTableName,
              KeyConditionExpression: "todoId = :todoId",
              ExpressionAttributeValues: {
                ":todoId": todoDdbItem.todoId,
              },
            }),
          );

          const attachmentItems = (attachmentsResult.Items ?? []).map((item) =>
            attachmentTableItemSchema.parse(item),
          );

          const attachments = attachmentItems.map((item) =>
            attachmentDdbItemToAttachment({
              id: item.attachmentId,
              fileName: item.fileName,
              storageKey: item.storageKey,
              contentType: item.contentType,
              fileSize: item.fileSize,
              status: item.status,
              uploadedBy: item.uploadedBy,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            }),
          );

          return todoDdbItemToTodo(todoDdbItem, attachments);
        }),
      );

      return {
        success: true,
        data: todosWithAttachments,
      };
    } catch (error) {
      this.#logger.error(
        "プロジェクトIDによるTODO一覧の取得に失敗しました",
        error as Error,
      );
      return {
        success: false,
        error: new UnexpectedError(),
      };
    }
  }

  async save(props: { todo: Todo }): Promise<SaveResult> {
    const todoDdbItem = todoDdbItemFromTodo(props.todo);

    try {
      // 既存のattachmentsを取得（削除のため）
      const existingAttachmentsResult = await this.#ddbDoc.send(
        new QueryCommand({
          TableName: this.#attachmentsTableName,
          KeyConditionExpression: "todoId = :todoId",
          ExpressionAttributeValues: {
            ":todoId": props.todo.id,
          },
        }),
      );

      // Todosテーブルへの操作
      const todoOperation = {
        Put: {
          TableName: this.#todosTableName,
          Item: todoDdbItem,
        },
      };

      // 新しいattachmentsのIDセット
      const newAttachmentIds = new Set(
        props.todo.attachments.map((att) => att.id),
      );

      // 既存のattachmentsのうち、新しいattachmentsに含まれていないものを削除
      const deleteAttachmentOperations = (existingAttachmentsResult.Items ?? [])
        .map((item) => attachmentTableItemSchema.parse(item))
        .filter((item) => !newAttachmentIds.has(item.attachmentId))
        .map((item) => ({
          Delete: {
            TableName: this.#attachmentsTableName,
            Key: {
              todoId: item.todoId,
              attachmentId: item.attachmentId,
            },
          },
        }));

      // 新しいattachmentsを挿入する操作
      const putAttachmentOperations = (props.todo.attachments ?? []).map(
        (attachment) => ({
          Put: {
            TableName: this.#attachmentsTableName,
            Item: attachmentTableItemFromAttachment(props.todo.id, attachment),
          },
        }),
      );

      // すべての操作を結合
      const operations = [
        todoOperation,
        ...deleteAttachmentOperations,
        ...putAttachmentOperations,
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

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      this.#logger.error("TODOの保存に失敗しました", error as Error);
      return {
        success: false,
        error: new UnexpectedError(),
      };
    }
  }

  async remove(props: { id: string }): Promise<RemoveResult> {
    const operation = {
      Delete: {
        TableName: this.#todosTableName,
        Key: { todoId: props.id },
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

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      this.#logger.error("TODOの削除に失敗しました", error as Error);
      return {
        success: false,
        error: new UnexpectedError(),
      };
    }
  }
}
