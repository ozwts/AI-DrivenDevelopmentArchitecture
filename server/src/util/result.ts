export type Success<T> = {
  success: true;
  data: T;
};

export type Failure<E extends Error> = {
  success: false;
  error: E;
};

/**
 * `Result<T, never>` とすると、`Success<T>` に推論される
 *
 * @see https://stackoverflow.com/questions/65492464/typescript-never-type-condition
 */
export type Result<T, E extends Error> = E[] extends never[]
  ? Success<T>
  : Success<T> | Failure<E>;
