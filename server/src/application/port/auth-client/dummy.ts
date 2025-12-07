import { Result } from "@/util/result";
import type { AuthClient, AuthPayload, AuthUser, DeleteUserResult } from ".";

export type AuthClientDummyProps = {
  decodeTokenReturnValue?: AuthPayload | undefined;
  getUserByIdReturnValue?: AuthUser | undefined;
  verifyTokenReturnValue?: boolean | undefined;
  deleteUserReturnValue?: DeleteUserResult | undefined;
  tokenMap?: Record<string, AuthPayload> | undefined;
  userIdMap?: Record<string, AuthUser> | undefined;
};

export class AuthClientDummy implements AuthClient {
  readonly #defaultDecodeTokenReturnValue: AuthPayload = {
    userSub: "dummy-user-sub",
    issuer: "dummy-issuer",
    issuedAt: Math.floor(Date.now() / 1000),
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    claims: {
      role: "user",
    },
  };

  readonly #defaultGetUserByIdReturnValue: AuthUser = {
    id: "dummy-user-id",
    email: "dummy@example.com",
    emailVerified: true,
    disabled: false,
  };

  readonly #defaultVerifyTokenReturnValue = true;

  readonly #defaultDeleteUserReturnValue: DeleteUserResult =
    Result.ok(undefined);

  readonly #decodeTokenReturnValue: AuthPayload;

  readonly #getUserByIdReturnValue: AuthUser;

  readonly #verifyTokenReturnValue: boolean;

  readonly #deleteUserReturnValue: DeleteUserResult;

  readonly #tokenMap: Partial<Record<string, AuthPayload>>;

  readonly #userIdMap: Partial<Record<string, AuthUser>>;

  constructor(props?: AuthClientDummyProps) {
    this.#decodeTokenReturnValue =
      props?.decodeTokenReturnValue ?? this.#defaultDecodeTokenReturnValue;
    this.#getUserByIdReturnValue =
      props?.getUserByIdReturnValue ?? this.#defaultGetUserByIdReturnValue;
    this.#verifyTokenReturnValue =
      props?.verifyTokenReturnValue ?? this.#defaultVerifyTokenReturnValue;
    this.#deleteUserReturnValue =
      props?.deleteUserReturnValue ?? this.#defaultDeleteUserReturnValue;
    this.#tokenMap = props?.tokenMap ?? {};
    this.#userIdMap = props?.userIdMap ?? {};
  }

  decodeToken(token: string): Promise<AuthPayload> {
    return Promise.resolve(
      this.#tokenMap[token] ?? this.#decodeTokenReturnValue,
    );
  }

  getUserById(userId: string): Promise<AuthUser> {
    return Promise.resolve(
      this.#userIdMap[userId] ?? this.#getUserByIdReturnValue,
    );
  }

  verifyToken(token: string): Promise<boolean> {
    return Promise.resolve(
      this.#tokenMap[token] !== undefined || this.#verifyTokenReturnValue,
    );
  }

  deleteUser(_userId: string): Promise<DeleteUserResult> {
    return Promise.resolve(this.#deleteUserReturnValue);
  }

  createCustomToken(
    userId: string,
    _additionalClaims?: Record<string, unknown>,
  ): Promise<string> {
    return Promise.resolve(`dummy-custom-token-for-${userId}`);
  }
}
