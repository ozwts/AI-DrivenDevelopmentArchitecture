/* eslint-disable class-methods-use-this */
import { CognitoJwtVerifier } from "aws-jwt-verify";
import type {
  CognitoIdentityProviderClient,
  AdminGetUserCommandOutput,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  AdminGetUserCommand,
  AdminDeleteUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { UnexpectedError } from "@/util/error-util";
import { Result } from "@/util/result";
import type {
  AuthClient,
  AuthPayload,
  AuthUser,
  DeleteUserResult,
} from "@/domain/support/auth-client";

export type CognitoAuthClientProps = {
  /**
   * Cognito User Pool ID
   */
  userPoolId: string;

  /**
   * Cognito Identity Provider Client
   */
  cognitoClient: CognitoIdentityProviderClient;

  /**
   * JWT Verifier
   */
  jwtVerifier: ReturnType<typeof CognitoJwtVerifier.create>;
};

/**
 * AWS Cognito用のAuthClient実装
 */
export class CognitoAuthClient implements AuthClient {
  readonly #userPoolId: string;

  readonly #jwtVerifier: ReturnType<typeof CognitoJwtVerifier.create>;

  readonly #cognitoClient: CognitoIdentityProviderClient;

  constructor(props: CognitoAuthClientProps) {
    this.#userPoolId = props.userPoolId;
    this.#cognitoClient = props.cognitoClient;
    this.#jwtVerifier = props.jwtVerifier;
  }

  /**
   * JWTトークンをデコードする
   * トークンの検証も同時に行う
   */
  async decodeToken(token: string): Promise<AuthPayload> {
    try {
      const payload = await this.#jwtVerifier.verify(token);

      return {
        userSub: payload.sub,
        issuer: payload.iss,
        issuedAt: payload.iat,
        expiresAt: payload.exp,
        claims: {
          username: payload.username,
          scope: payload.scope,
          ...payload,
        },
      };
    } catch (error) {
      throw new UnexpectedError(
        `トークンのデコードに失敗しました: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * ユーザーIDからユーザー情報を取得する
   */
  async getUserById(userId: string): Promise<AuthUser> {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.#userPoolId,
        Username: userId,
      });

      const response: AdminGetUserCommandOutput =
        await this.#cognitoClient.send(command);

      const email = this.#getUserAttribute(response, "email");
      const emailVerified = this.#getUserAttribute(response, "email_verified");

      return {
        id: response.Username ?? userId,
        email,
        emailVerified: emailVerified === "true",
        disabled: response.Enabled === false,
      };
    } catch (error) {
      throw new UnexpectedError(
        `ユーザー情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * トークンを検証する
   */
  async verifyToken(token: string): Promise<boolean> {
    try {
      await this.#jwtVerifier.verify(token);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * ユーザーを削除する
   */
  async deleteUser(userId: string): Promise<DeleteUserResult> {
    try {
      const command = new AdminDeleteUserCommand({
        UserPoolId: this.#userPoolId,
        Username: userId,
      });

      await this.#cognitoClient.send(command);

      return Result.ok(undefined);
    } catch (error) {
      return Result.err(
        new UnexpectedError(
          `ユーザーの削除に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * カスタムトークンを生成する
   * 注意: Cognitoでは直接カスタムトークンを生成できないため、
   * この実装ではエラーを投げます。
   * 必要に応じてLambda Authorizerと組み合わせて使用してください。
   */
  async createCustomToken(
    _userId: string,
    _additionalClaims?: Record<string, unknown>,
  ): Promise<string> {
    throw new UnexpectedError(
      "Cognitoでは直接カスタムトークンを生成できません。AWS SDKのInitiateAuthを使用してください。",
    );
  }

  /**
   * ユーザー属性を取得するヘルパーメソッド
   */
  #getUserAttribute(
    response: AdminGetUserCommandOutput,
    attributeName: string,
  ): string | undefined {
    return response.UserAttributes?.find((attr) => attr.Name === attributeName)
      ?.Value;
  }
}
