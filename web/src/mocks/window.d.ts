import { http } from "msw";
import { SetupWorker } from "msw/browser";

declare global {
  interface Window {
    msw?: {
      worker: SetupWorker;
      http: typeof http;
      setHandlers: (type: string) => void;
    };
  }
}

export {};
