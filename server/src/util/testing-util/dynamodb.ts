import {
  AttributeDefinition,
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  GlobalSecondaryIndex,
  KeySchemaElement,
  ListTablesCommand,
  LocalSecondaryIndex,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { v4 as uuid } from "uuid";

/**
 * DynamoDBインスタンスを作成
 */
export const buildDdbClients = (): {
  ddb: DynamoDBClient;
  ddbDoc: DynamoDBDocumentClient;
} => {
  const ddb = new DynamoDBClient({
    endpoint: "http://127.0.0.1:8000",
    region: "us-west-2",
    credentials: {
      accessKeyId: "dummyAccessKeyId",
      secretAccessKey: "dummySecretAccessKey",
    },
  });
  const ddbDoc = DynamoDBDocumentClient.from(ddb);
  return { ddb, ddbDoc };
};

type RefreshTableParams = {
  ddb: DynamoDBClient;
  tableName: string;
  attributeDefinitions: AttributeDefinition[];
  keySchema: KeySchemaElement[];
  localSecondaryIndexes?: LocalSecondaryIndex[];
  globalSecondaryIndexes?: GlobalSecondaryIndex[];
};

/**
 * Todosテーブル
 */
export const buildTodosTableParams = ({
  ddb,
  todosTableName,
}: {
  ddb: DynamoDBClient;
  todosTableName: string;
}): RefreshTableParams => ({
  ddb,
  tableName: todosTableName,
  attributeDefinitions: [
    {
      AttributeName: "todoId",
      AttributeType: "S",
    },
    {
      AttributeName: "status",
      AttributeType: "S",
    },
    {
      AttributeName: "projectId",
      AttributeType: "S",
    },
    {
      AttributeName: "assigneeUserId",
      AttributeType: "S",
    },
  ],
  keySchema: [
    {
      AttributeName: "todoId",
      KeyType: "HASH",
    },
  ],
  globalSecondaryIndexes: [
    {
      IndexName: "StatusIndex",
      KeySchema: [
        {
          AttributeName: "status",
          KeyType: "HASH",
        },
      ],
      Projection: {
        ProjectionType: "ALL",
      },
    },
    {
      IndexName: "ProjectIdIndex",
      KeySchema: [
        {
          AttributeName: "projectId",
          KeyType: "HASH",
        },
      ],
      Projection: {
        ProjectionType: "ALL",
      },
    },
    {
      IndexName: "AssigneeUserIdIndex",
      KeySchema: [
        {
          AttributeName: "assigneeUserId",
          KeyType: "HASH",
        },
      ],
      Projection: {
        ProjectionType: "ALL",
      },
    },
  ],
});

/**
 * Projectsテーブル
 */
export const buildProjectsTableParams = ({
  ddb,
  projectsTableName,
}: {
  ddb: DynamoDBClient;
  projectsTableName: string;
}): RefreshTableParams => ({
  ddb,
  tableName: projectsTableName,
  attributeDefinitions: [
    {
      AttributeName: "projectId",
      AttributeType: "S",
    },
  ],
  keySchema: [
    {
      AttributeName: "projectId",
      KeyType: "HASH",
    },
  ],
});

/**
 * Usersテーブル
 */
export const buildUsersTableParams = ({
  ddb,
  usersTableName,
}: {
  ddb: DynamoDBClient;
  usersTableName: string;
}): RefreshTableParams => ({
  ddb,
  tableName: usersTableName,
  attributeDefinitions: [
    {
      AttributeName: "userId",
      AttributeType: "S",
    },
    {
      AttributeName: "sub",
      AttributeType: "S",
    },
  ],
  keySchema: [
    {
      AttributeName: "userId",
      KeyType: "HASH",
    },
  ],
  globalSecondaryIndexes: [
    {
      IndexName: "SubIndex",
      KeySchema: [
        {
          AttributeName: "sub",
          KeyType: "HASH",
        },
      ],
      Projection: {
        ProjectionType: "ALL",
      },
    },
  ],
});

/**
 * Attachmentsテーブル
 *
 * TODOアグリゲートの子エンティティである添付ファイルを管理。
 * PK: todoId (親TODOのID)
 * SK: attachmentId (添付ファイルのID)
 * この設計により、todoIdでクエリすると、そのTODOに属するすべての添付ファイルを取得できる。
 */
export const buildAttachmentsTableParams = ({
  ddb,
  attachmentsTableName,
}: {
  ddb: DynamoDBClient;
  attachmentsTableName: string;
}): RefreshTableParams => ({
  ddb,
  tableName: attachmentsTableName,
  attributeDefinitions: [
    {
      AttributeName: "todoId",
      AttributeType: "S",
    },
    {
      AttributeName: "attachmentId",
      AttributeType: "S",
    },
  ],
  keySchema: [
    {
      AttributeName: "todoId",
      KeyType: "HASH",
    },
    {
      AttributeName: "attachmentId",
      KeyType: "RANGE",
    },
  ],
});

/**
 * ProjectMembersテーブル
 *
 * プロジェクトアグリゲートの子エンティティであるプロジェクトメンバーを管理。
 * PK: projectId (親プロジェクトのID)
 * SK: memberId (プロジェクトメンバーのID)
 * この設計により、projectIdでクエリすると、そのプロジェクトに属するすべてのメンバーを取得できる。
 * GSI: UserIdIndex - ユーザーが所属するプロジェクト一覧を取得するため。
 */
export const buildProjectMembersTableParams = ({
  ddb,
  projectMembersTableName,
}: {
  ddb: DynamoDBClient;
  projectMembersTableName: string;
}): RefreshTableParams => ({
  ddb,
  tableName: projectMembersTableName,
  attributeDefinitions: [
    {
      AttributeName: "projectId",
      AttributeType: "S",
    },
    {
      AttributeName: "memberId",
      AttributeType: "S",
    },
    {
      AttributeName: "userId",
      AttributeType: "S",
    },
  ],
  keySchema: [
    {
      AttributeName: "projectId",
      KeyType: "HASH",
    },
    {
      AttributeName: "memberId",
      KeyType: "RANGE",
    },
  ],
  globalSecondaryIndexes: [
    {
      IndexName: "UserIdIndex",
      KeySchema: [
        {
          AttributeName: "userId",
          KeyType: "HASH",
        },
      ],
      Projection: {
        ProjectionType: "ALL",
      },
    },
  ],
});

/**
 * テーブルを削除し再作成する
 *
 * @param params パラメータ
 * @param params.tableName 自動テスト並列実行時にテーブル名が被らないようにUUIDを推奨
 * @returns {void}
 */
export const refreshTable = async ({
  ddb,
  tableName,
  attributeDefinitions,
  keySchema,
  localSecondaryIndexes,
  globalSecondaryIndexes,
}: RefreshTableParams): Promise<void> => {
  const { TableNames: tableNames } = await ddb.send(new ListTablesCommand({}));
  if ((tableNames ?? []).includes(tableName)) {
    await ddb.send(new DeleteTableCommand({ TableName: tableName }));
  }

  await ddb.send(
    new CreateTableCommand({
      TableName: tableName,
      AttributeDefinitions: attributeDefinitions,
      KeySchema: keySchema,
      LocalSecondaryIndexes:
        localSecondaryIndexes ??
        (undefined as unknown as LocalSecondaryIndex[]), // DynamoDB Localの型と実装に相違あり
      GlobalSecondaryIndexes:
        globalSecondaryIndexes ??
        (undefined as unknown as GlobalSecondaryIndex[]), // DynamoDB Localの型と実装に相違あり
      BillingMode: "PAY_PER_REQUEST",
    }),
  );
};

export const getRandomIdentifier = (): string => uuid();
