import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const getParam = async (name: string): Promise<string> => {
  const client = new SSMClient({ region: "ap-northeast-1" });
  const res = await client.send(
    new GetParameterCommand({ Name: name, WithDecryption: true }),
  );
  return res.Parameter?.Value ?? "";
};

const prefix = process.env.SSM_E2E_PREFIX ?? "/sandbox-dev/e2e";

export const E2E_USER = {
  email: await getParam(`${prefix}/E2E_USER_EMAIL`),
  password: await getParam(`${prefix}/E2E_USER_PASSWORD`),
} as const;
