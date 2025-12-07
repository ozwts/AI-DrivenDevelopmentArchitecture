import type { Config } from "@react-router/dev/config";

export default {
  appDirectory: "src/app",
  ssr: false, // SPAモード（Cognito認証との相性のため）
} satisfies Config;
