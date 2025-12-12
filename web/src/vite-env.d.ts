/// <reference types="vite/client" />

type ImportMetaEnv = {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
};

type ImportMeta = {
  readonly env: ImportMetaEnv;
};

declare module "virtual:terminal" {
  const terminal: {
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
    assert(condition: boolean, ...args: unknown[]): void;
    table(data: unknown): void;
    time(label: string): void;
    timeEnd(label: string): void;
    count(label: string): void;
    countReset(label: string): void;
    dir(obj: unknown): void;
    dirxml(obj: unknown): void;
    group(...args: unknown[]): void;
    groupCollapsed(...args: unknown[]): void;
    groupEnd(): void;
    clear(): void;
  };
  export default terminal;
}
