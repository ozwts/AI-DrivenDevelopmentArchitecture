import "reflect-metadata";
import { Container } from "inversify";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBDocumentClient as DDBDocClient } from "@aws-sdk/lib-dynamodb";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { S3Client } from "@aws-sdk/client-s3";
import type { Logger } from "@/domain/support/logger";
import { LoggerImpl } from "@/infrastructure/logger";
import type { AuthClient } from "@/domain/support/auth-client";
import { CognitoAuthClient } from "@/infrastructure/auth-client";
import type { StorageClient } from "@/domain/support/storage-client";
import { S3StorageClient } from "@/infrastructure/storage-client";
import { serviceId } from "./service-id";
import type { UserRepository } from "@/domain/model/user/user-repository";
import { UserRepositoryImpl } from "@/infrastructure/repository/user-repository";
import type { TodoRepository } from "@/domain/model/todo/todo-repository";
import { TodoRepositoryImpl } from "@/infrastructure/repository/todo-repository";
import type { FetchNow } from "@/domain/support/fetch-now";
import type { GetUserUseCase } from "@/use-case/user/get-user-use-case";
import { GetUserUseCaseImpl } from "@/use-case/user/get-user-use-case";
import { GetCurrentUserUseCase } from "@/use-case/user/get-current-user-use-case";
import { ListUsersUseCase } from "@/use-case/user/list-users-use-case";
import type { RegisterCurrentUserUseCase } from "@/use-case/user/register-current-user-use-case";
import { RegisterCurrentUserUseCaseImpl } from "@/use-case/user/register-current-user-use-case";
import type { UpdateCurrentUserUseCase } from "@/use-case/user/update-current-user-use-case";
import { UpdateCurrentUserUseCaseImpl } from "@/use-case/user/update-current-user-use-case";
import type { DeleteCurrentUserUseCase } from "@/use-case/user/delete-current-user-use-case";
import { DeleteCurrentUserUseCaseImpl } from "@/use-case/user/delete-current-user-use-case";
import type { RegisterTodoUseCase } from "@/use-case/todo/register-todo-use-case";
import { RegisterTodoUseCaseImpl } from "@/use-case/todo/register-todo-use-case";
import type { ListTodosUseCase } from "@/use-case/todo/list-todos-use-case";
import { ListTodosUseCaseImpl } from "@/use-case/todo/list-todos-use-case";
import type { GetTodoUseCase } from "@/use-case/todo/get-todo-use-case";
import { GetTodoUseCaseImpl } from "@/use-case/todo/get-todo-use-case";
import type { UpdateTodoUseCase } from "@/use-case/todo/update-todo-use-case";
import { UpdateTodoUseCaseImpl } from "@/use-case/todo/update-todo-use-case";
import type { DeleteTodoUseCase } from "@/use-case/todo/delete-todo-use-case";
import { DeleteTodoUseCaseImpl } from "@/use-case/todo/delete-todo-use-case";
import type { PrepareAttachmentUploadUseCase } from "@/use-case/todo/prepare-attachment-upload-use-case";
import { PrepareAttachmentUploadUseCaseImpl } from "@/use-case/todo/prepare-attachment-upload-use-case";
import type { UpdateAttachmentStatusUseCase } from "@/use-case/todo/update-attachment-status-use-case";
import { UpdateAttachmentStatusUseCaseImpl } from "@/use-case/todo/update-attachment-status-use-case";
import type { GetAttachmentDownloadUrlUseCase } from "@/use-case/todo/get-attachment-download-url-use-case";
import { GetAttachmentDownloadUrlUseCaseImpl } from "@/use-case/todo/get-attachment-download-url-use-case";
import type { DeleteAttachmentUseCase } from "@/use-case/todo/delete-attachment-use-case";
import { DeleteAttachmentUseCaseImpl } from "@/use-case/todo/delete-attachment-use-case";
import type { ProjectRepository } from "@/domain/model/project/project-repository";
import { ProjectRepositoryImpl } from "@/infrastructure/repository/project-repository";
import type { ListProjectsUseCase } from "@/use-case/project/list-projects-use-case";
import { ListProjectsUseCaseImpl } from "@/use-case/project/list-projects-use-case";
import type { GetProjectUseCase } from "@/use-case/project/get-project-use-case";
import { GetProjectUseCaseImpl } from "@/use-case/project/get-project-use-case";
import type { CreateProjectUseCase } from "@/use-case/project/create-project-use-case";
import { CreateProjectUseCaseImpl } from "@/use-case/project/create-project-use-case";
import type { UpdateProjectUseCase } from "@/use-case/project/update-project-use-case";
import { UpdateProjectUseCaseImpl } from "@/use-case/project/update-project-use-case";
import {
  type DeleteProjectUseCase,
  DeleteProjectUseCaseImpl,
  type DeleteProjectUoWContext,
} from "@/use-case/project/delete-project-use-case";
import type { UnitOfWorkRunner } from "@/domain/support/unit-of-work";
import { DynamoDBUnitOfWorkRunner } from "@/infrastructure/unit-of-work/dynamodb-unit-of-work-runner";
import { unwrapEnv } from "./env-util";

export const registerLambdaContainer = async (): Promise<Container> => {
  const container = new Container();

  // AWSリージョン設定
  const region = "ap-northeast-1";

  // Environment variables
  container
    .bind(serviceId.USERS_TABLE_NAME)
    .toDynamicValue(() => unwrapEnv("USERS_TABLE_NAME"))
    .inSingletonScope();

  container
    .bind(serviceId.TODOS_TABLE_NAME)
    .toDynamicValue(() => unwrapEnv("TODOS_TABLE_NAME"))
    .inSingletonScope();

  container
    .bind(serviceId.PROJECTS_TABLE_NAME)
    .toDynamicValue(() => unwrapEnv("PROJECTS_TABLE_NAME"))
    .inSingletonScope();

  container
    .bind(serviceId.ATTACHMENTS_TABLE_NAME)
    .toDynamicValue(() => unwrapEnv("ATTACHMENTS_TABLE_NAME"))
    .inSingletonScope();

  container
    .bind(serviceId.COGNITO_USER_POOL_ID)
    .toDynamicValue(() => unwrapEnv("COGNITO_USER_POOL_ID"))
    .inSingletonScope();

  container
    .bind(serviceId.COGNITO_CLIENT_ID)
    .toDynamicValue(() => unwrapEnv("COGNITO_CLIENT_ID"))
    .inSingletonScope();

  container
    .bind(serviceId.ALLOWED_ORIGINS)
    .toDynamicValue(() => unwrapEnv("ALLOWED_ORIGINS"))
    .inSingletonScope();

  container
    .bind(serviceId.ATTACHMENTS_BUCKET_NAME)
    .toDynamicValue(() => unwrapEnv("ATTACHMENTS_BUCKET_NAME"))
    .inSingletonScope();

  // Logger
  container
    .bind<Logger>(serviceId.LOGGER)
    .toDynamicValue(
      () =>
        new LoggerImpl({
          logLevel: "INFO",
          serviceName: "todo-app",
        }),
    )
    .inSingletonScope();

  // FetchNow
  container
    .bind<FetchNow>(serviceId.FETCH_NOW)
    .toDynamicValue(() => () => new Date())
    .inSingletonScope();

  // DynamoDB Document Client
  container
    .bind<DynamoDBDocumentClient>(serviceId.DDB_DOC)
    .toDynamicValue(() => {
      const ddb = new DynamoDBClient({ region });
      const ddbDoc = DDBDocClient.from(ddb);
      return ddbDoc;
    })
    .inSingletonScope();

  // Cognito Identity Provider Client
  container
    .bind<CognitoIdentityProviderClient>(serviceId.COGNITO_CLIENT)
    .toDynamicValue(() => new CognitoIdentityProviderClient({ region }))
    .inSingletonScope();

  // JWT Verifier
  container
    .bind<ReturnType<typeof CognitoJwtVerifier.create>>(serviceId.JWT_VERIFIER)
    .toDynamicValue((ctx) => {
      const userPoolId = ctx.container.get<string>(
        serviceId.COGNITO_USER_POOL_ID,
      );
      const clientId = ctx.container.get<string>(serviceId.COGNITO_CLIENT_ID);

      return CognitoJwtVerifier.create({
        userPoolId,
        tokenUse: "access",
        clientId,
      });
    })
    .inSingletonScope();

  // AuthClient
  container
    .bind<AuthClient>(serviceId.AUTH_CLIENT)
    .toDynamicValue((ctx) => {
      const userPoolId = ctx.container.get<string>(
        serviceId.COGNITO_USER_POOL_ID,
      );
      const cognitoClient = ctx.container.get<CognitoIdentityProviderClient>(
        serviceId.COGNITO_CLIENT,
      );
      const jwtVerifier = ctx.container.get<
        ReturnType<typeof CognitoJwtVerifier.create>
      >(serviceId.JWT_VERIFIER);

      return new CognitoAuthClient({
        userPoolId,
        cognitoClient,
        jwtVerifier,
      });
    })
    .inSingletonScope();

  // S3 Client
  container
    .bind<S3Client>(serviceId.S3_CLIENT)
    .toDynamicValue(() => new S3Client({ region }))
    .inSingletonScope();

  // StorageClient
  container
    .bind<StorageClient>(serviceId.STORAGE_CLIENT)
    .toDynamicValue((ctx) => {
      const bucketName = ctx.container.get<string>(
        serviceId.ATTACHMENTS_BUCKET_NAME,
      );
      const s3Client = ctx.container.get<S3Client>(serviceId.S3_CLIENT);

      return new S3StorageClient({
        bucketName,
        s3Client,
      });
    })
    .inSingletonScope();

  // Repositories
  container
    .bind<UserRepository>(serviceId.USER_REPOSITORY)
    .toDynamicValue((ctx) => {
      const ddbDoc = ctx.container.get<DynamoDBDocumentClient>(
        serviceId.DDB_DOC,
      );
      const usersTableName = ctx.container.get<string>(
        serviceId.USERS_TABLE_NAME,
      );
      const logger = ctx.container.get<Logger>(serviceId.LOGGER);

      return new UserRepositoryImpl({
        ddbDoc,
        usersTableName,
        logger,
      });
    })
    .inSingletonScope();

  container
    .bind<TodoRepository>(serviceId.TODO_REPOSITORY)
    .toDynamicValue((ctx) => {
      const ddbDoc = ctx.container.get<DynamoDBDocumentClient>(
        serviceId.DDB_DOC,
      );
      const todosTableName = ctx.container.get<string>(
        serviceId.TODOS_TABLE_NAME,
      );
      const attachmentsTableName = ctx.container.get<string>(
        serviceId.ATTACHMENTS_TABLE_NAME,
      );
      const logger = ctx.container.get<Logger>(serviceId.LOGGER);

      return new TodoRepositoryImpl({
        ddbDoc,
        todosTableName,
        attachmentsTableName,
        logger,
      });
    })
    .inSingletonScope();

  container
    .bind<ProjectRepository>(serviceId.PROJECT_REPOSITORY)
    .toDynamicValue((ctx) => {
      const ddbDoc = ctx.container.get<DynamoDBDocumentClient>(
        serviceId.DDB_DOC,
      );
      const projectsTableName = ctx.container.get<string>(
        serviceId.PROJECTS_TABLE_NAME,
      );
      const logger = ctx.container.get<Logger>(serviceId.LOGGER);

      return new ProjectRepositoryImpl({
        ddbDoc,
        projectsTableName,
        logger,
      });
    })
    .inSingletonScope();

  // Use Cases - Todo
  container
    .bind<RegisterTodoUseCase>(serviceId.REGISTER_TODO_USE_CASE)
    .toDynamicValue((ctx) => {
      const todoRepository = ctx.container.get<TodoRepository>(
        serviceId.TODO_REPOSITORY,
      );
      const userRepository = ctx.container.get<UserRepository>(
        serviceId.USER_REPOSITORY,
      );
      const logger = ctx.container.get<Logger>(serviceId.LOGGER);
      const fetchNow = ctx.container.get<FetchNow>(serviceId.FETCH_NOW);

      return new RegisterTodoUseCaseImpl({
        todoRepository,
        userRepository,
        logger,
        fetchNow,
      });
    })
    .inSingletonScope();

  container
    .bind<ListTodosUseCase>(serviceId.LIST_TODOS_USE_CASE)
    .toDynamicValue((ctx) => {
      const todoRepository = ctx.container.get<TodoRepository>(
        serviceId.TODO_REPOSITORY,
      );

      return new ListTodosUseCaseImpl({
        todoRepository,
      });
    })
    .inSingletonScope();

  container
    .bind<GetTodoUseCase>(serviceId.GET_TODO_USE_CASE)
    .toDynamicValue((ctx) => {
      const todoRepository = ctx.container.get<TodoRepository>(
        serviceId.TODO_REPOSITORY,
      );

      return new GetTodoUseCaseImpl({
        todoRepository,
      });
    })
    .inSingletonScope();

  container
    .bind<UpdateTodoUseCase>(serviceId.UPDATE_TODO_USE_CASE)
    .toDynamicValue((ctx) => {
      const todoRepository = ctx.container.get<TodoRepository>(
        serviceId.TODO_REPOSITORY,
      );
      const fetchNow = ctx.container.get<FetchNow>(serviceId.FETCH_NOW);

      return new UpdateTodoUseCaseImpl({
        todoRepository,
        fetchNow,
      });
    })
    .inSingletonScope();

  container
    .bind<DeleteTodoUseCase>(serviceId.DELETE_TODO_USE_CASE)
    .toDynamicValue((ctx) => {
      const todoRepository = ctx.container.get<TodoRepository>(
        serviceId.TODO_REPOSITORY,
      );
      const storageClient = ctx.container.get<StorageClient>(
        serviceId.STORAGE_CLIENT,
      );
      const logger = ctx.container.get<Logger>(serviceId.LOGGER);

      return new DeleteTodoUseCaseImpl({
        todoRepository,
        storageClient,
        logger,
      });
    })
    .inSingletonScope();

  // Use Cases - Attachment
  container
    .bind<PrepareAttachmentUploadUseCase>(
      serviceId.PREPARE_ATTACHMENT_UPLOAD_USE_CASE,
    )
    .toDynamicValue((ctx) => {
      const todoRepository = ctx.container.get<TodoRepository>(
        serviceId.TODO_REPOSITORY,
      );
      const storageClient = ctx.container.get<StorageClient>(
        serviceId.STORAGE_CLIENT,
      );
      const fetchNow = ctx.container.get<FetchNow>(serviceId.FETCH_NOW);
      const logger = ctx.container.get<Logger>(serviceId.LOGGER);

      return new PrepareAttachmentUploadUseCaseImpl({
        todoRepository,
        storageClient,
        fetchNow,
        logger,
      });
    })
    .inSingletonScope();

  container
    .bind<UpdateAttachmentStatusUseCase>(
      serviceId.UPDATE_ATTACHMENT_STATUS_USE_CASE,
    )
    .toDynamicValue((ctx) => {
      const todoRepository = ctx.container.get<TodoRepository>(
        serviceId.TODO_REPOSITORY,
      );
      const fetchNow = ctx.container.get<FetchNow>(serviceId.FETCH_NOW);
      const logger = ctx.container.get<Logger>(serviceId.LOGGER);

      return new UpdateAttachmentStatusUseCaseImpl({
        todoRepository,
        fetchNow,
        logger,
      });
    })
    .inSingletonScope();

  container
    .bind<GetAttachmentDownloadUrlUseCase>(
      serviceId.GET_ATTACHMENT_DOWNLOAD_URL_USE_CASE,
    )
    .toDynamicValue((ctx) => {
      const todoRepository = ctx.container.get<TodoRepository>(
        serviceId.TODO_REPOSITORY,
      );
      const storageClient = ctx.container.get<StorageClient>(
        serviceId.STORAGE_CLIENT,
      );
      const logger = ctx.container.get<Logger>(serviceId.LOGGER);

      return new GetAttachmentDownloadUrlUseCaseImpl({
        todoRepository,
        storageClient,
        logger,
      });
    })
    .inSingletonScope();

  container
    .bind<DeleteAttachmentUseCase>(serviceId.DELETE_ATTACHMENT_USE_CASE)
    .toDynamicValue((ctx) => {
      const todoRepository = ctx.container.get<TodoRepository>(
        serviceId.TODO_REPOSITORY,
      );
      const storageClient = ctx.container.get<StorageClient>(
        serviceId.STORAGE_CLIENT,
      );
      const fetchNow = ctx.container.get<FetchNow>(serviceId.FETCH_NOW);
      const logger = ctx.container.get<Logger>(serviceId.LOGGER);

      return new DeleteAttachmentUseCaseImpl({
        todoRepository,
        storageClient,
        fetchNow,
        logger,
      });
    })
    .inSingletonScope();

  // Unit of Work Runner - Delete Project
  container
    .bind<UnitOfWorkRunner<DeleteProjectUoWContext>>(
      serviceId.DELETE_PROJECT_UOW_RUNNER,
    )
    .toDynamicValue((ctx) => {
      const ddbDoc = ctx.container.get<DynamoDBDocumentClient>(
        serviceId.DDB_DOC,
      );
      const todosTableName = ctx.container.get<string>(
        serviceId.TODOS_TABLE_NAME,
      );
      const attachmentsTableName = ctx.container.get<string>(
        serviceId.ATTACHMENTS_TABLE_NAME,
      );
      const projectsTableName = ctx.container.get<string>(
        serviceId.PROJECTS_TABLE_NAME,
      );
      const logger = ctx.container.get<Logger>(serviceId.LOGGER);

      return new DynamoDBUnitOfWorkRunner<DeleteProjectUoWContext>(
        { ddbDoc, logger },
        (uow) => ({
          todoRepository: new TodoRepositoryImpl({
            ddbDoc,
            todosTableName,
            attachmentsTableName,
            logger,
            uow,
          }),
          projectRepository: new ProjectRepositoryImpl({
            ddbDoc,
            projectsTableName,
            logger,
            uow,
          }),
        }),
      );
    })
    .inSingletonScope();

  // Use Cases - Project
  container
    .bind<ListProjectsUseCase>(serviceId.LIST_PROJECTS_USE_CASE)
    .toDynamicValue((ctx) => {
      const projectRepository = ctx.container.get<ProjectRepository>(
        serviceId.PROJECT_REPOSITORY,
      );

      return new ListProjectsUseCaseImpl({
        projectRepository,
      });
    })
    .inSingletonScope();

  container
    .bind<GetProjectUseCase>(serviceId.GET_PROJECT_USE_CASE)
    .toDynamicValue((ctx) => {
      const projectRepository = ctx.container.get<ProjectRepository>(
        serviceId.PROJECT_REPOSITORY,
      );

      return new GetProjectUseCaseImpl({
        projectRepository,
      });
    })
    .inSingletonScope();

  container
    .bind<CreateProjectUseCase>(serviceId.CREATE_PROJECT_USE_CASE)
    .toDynamicValue((ctx) => {
      const projectRepository = ctx.container.get<ProjectRepository>(
        serviceId.PROJECT_REPOSITORY,
      );
      const logger = ctx.container.get<Logger>(serviceId.LOGGER);
      const fetchNow = ctx.container.get<FetchNow>(serviceId.FETCH_NOW);

      return new CreateProjectUseCaseImpl({
        projectRepository,
        logger,
        fetchNow,
      });
    })
    .inSingletonScope();

  container
    .bind<UpdateProjectUseCase>(serviceId.UPDATE_PROJECT_USE_CASE)
    .toDynamicValue((ctx) => {
      const projectRepository = ctx.container.get<ProjectRepository>(
        serviceId.PROJECT_REPOSITORY,
      );
      const logger = ctx.container.get<Logger>(serviceId.LOGGER);
      const fetchNow = ctx.container.get<FetchNow>(serviceId.FETCH_NOW);

      return new UpdateProjectUseCaseImpl({
        projectRepository,
        logger,
        fetchNow,
      });
    })
    .inSingletonScope();

  container
    .bind<DeleteProjectUseCase>(serviceId.DELETE_PROJECT_USE_CASE)
    .toDynamicValue((ctx) => {
      const logger = ctx.container.get<Logger>(serviceId.LOGGER);
      const uowRunner = ctx.container.get<
        UnitOfWorkRunner<DeleteProjectUoWContext>
      >(serviceId.DELETE_PROJECT_UOW_RUNNER);

      return new DeleteProjectUseCaseImpl({
        logger,
        uowRunner,
      });
    })
    .inSingletonScope();

  // Use Cases - User
  container
    .bind<GetUserUseCase>(serviceId.GET_USER_USE_CASE)
    .toDynamicValue((ctx) => {
      const userRepository = ctx.container.get<UserRepository>(
        serviceId.USER_REPOSITORY,
      );
      const logger = ctx.container.get<Logger>(serviceId.LOGGER);

      return new GetUserUseCaseImpl({
        userRepository,
        logger,
      });
    })
    .inSingletonScope();

  container
    .bind<GetCurrentUserUseCase>(serviceId.GET_CURRENT_USER_USE_CASE)
    .toDynamicValue((ctx) => {
      const userRepository = ctx.container.get<UserRepository>(
        serviceId.USER_REPOSITORY,
      );

      return new GetCurrentUserUseCase(userRepository);
    })
    .inSingletonScope();

  container
    .bind<ListUsersUseCase>(serviceId.LIST_USERS_USE_CASE)
    .toDynamicValue((ctx) => {
      const userRepository = ctx.container.get<UserRepository>(
        serviceId.USER_REPOSITORY,
      );

      return new ListUsersUseCase(userRepository);
    })
    .inSingletonScope();

  container
    .bind<RegisterCurrentUserUseCase>(serviceId.REGISTER_CURRENT_USER_USE_CASE)
    .toDynamicValue((ctx) => {
      const userRepository = ctx.container.get<UserRepository>(
        serviceId.USER_REPOSITORY,
      );
      const logger = ctx.container.get<Logger>(serviceId.LOGGER);
      const fetchNow = ctx.container.get<FetchNow>(serviceId.FETCH_NOW);

      return new RegisterCurrentUserUseCaseImpl({
        userRepository,
        logger,
        fetchNow,
      });
    })
    .inSingletonScope();

  container
    .bind<UpdateCurrentUserUseCase>(serviceId.UPDATE_CURRENT_USER_USE_CASE)
    .toDynamicValue((ctx) => {
      const userRepository = ctx.container.get<UserRepository>(
        serviceId.USER_REPOSITORY,
      );
      const logger = ctx.container.get<Logger>(serviceId.LOGGER);
      const fetchNow = ctx.container.get<FetchNow>(serviceId.FETCH_NOW);

      return new UpdateCurrentUserUseCaseImpl({
        userRepository,
        logger,
        fetchNow,
      });
    })
    .inSingletonScope();

  container
    .bind<DeleteCurrentUserUseCase>(serviceId.DELETE_CURRENT_USER_USE_CASE)
    .toDynamicValue((ctx) => {
      const userRepository = ctx.container.get<UserRepository>(
        serviceId.USER_REPOSITORY,
      );
      const authClient = ctx.container.get<AuthClient>(serviceId.AUTH_CLIENT);
      const logger = ctx.container.get<Logger>(serviceId.LOGGER);

      return new DeleteCurrentUserUseCaseImpl({
        userRepository,
        authClient,
        logger,
      });
    })
    .inSingletonScope();

  return container;
};
