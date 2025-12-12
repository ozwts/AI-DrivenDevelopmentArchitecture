import "reflect-metadata";
import { serve } from "@hono/node-server";
import {
  SSMClient,
  GetParametersByPathCommand,
} from "@aws-sdk/client-ssm";
import { buildApp } from "./hono-handler/client-side-app";
import { initHandler } from "./init-handler";
import { unwrapEnv } from "@/di-container/env-util";

const PORT = 3000;

const loadEnvFromSSM = async (parameterPath: string): Promise<void> => {
  const ssmClient = new SSMClient({ region: "ap-northeast-1" });

  let nextToken: string | undefined;
  const parameters: { name: string; value: string }[] = [];

  do {
    const command = new GetParametersByPathCommand({
      Path: parameterPath,
      WithDecryption: true,
      NextToken: nextToken,
    });

    const response = await ssmClient.send(command);

    if (response.Parameters !== undefined) {
      for (const param of response.Parameters) {
        if (param.Name !== undefined && param.Value !== undefined) {
          const envKey = param.Name.split("/").pop();
          if (envKey !== undefined && envKey !== "") {
            parameters.push({ name: envKey, value: param.Value });
            process.env[envKey] = param.Value;
          }
        }
      }
    }

    nextToken = response.NextToken;
  } while (nextToken !== undefined);

  console.log(
    `Loaded ${String(parameters.length)} parameters from SSM: ${parameters.map((p) => p.name).join(", ")}`,
  );
};

const main = async (): Promise<void> => {
  // SSM Parameter Storeから環境変数を読み込み
  const ssmParameterPath = unwrapEnv("SSM_PARAMETER_PATH");
  console.log(`Loading environment variables from SSM: ${ssmParameterPath}`);
  await loadEnvFromSSM(ssmParameterPath);

  // コンテナ初期化とアプリ構築
  const { container } = initHandler();
  const app = buildApp({ container });

  // ローカルサーバー起動
  console.log(`Server is running on http://localhost:${String(PORT)}`);
  serve({
    fetch: app.fetch,
    port: PORT,
  });
};

main().catch((error: unknown) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
