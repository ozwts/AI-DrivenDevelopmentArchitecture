/// <reference types="vite/client" />

type ImportMetaEnv = {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
};

type ImportMeta = {
  readonly env: ImportMetaEnv;
};
