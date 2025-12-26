import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * E2Eテスト用APIクライアント
 *
 * user.jsonからアクセストークンを取得し、API呼び出しを行う。
 * 主にafterEach/afterAllでのクリーンアップに使用。
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = path.join(__dirname, "../playwright/.auth/user.json");
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

/**
 * user.jsonからアクセストークンを取得
 */
const getAccessToken = (): string | undefined => {
  if (!fs.existsSync(AUTH_FILE)) {
    return undefined;
  }

  const authData = JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
  const localStorage = authData.origins?.[0]?.localStorage || [];
  const tokenEntry = localStorage.find((item: { name: string }) =>
    item.name.endsWith(".accessToken")
  );

  return tokenEntry?.value;
};

/**
 * API呼び出し
 */
const request = async (
  method: string,
  endpoint: string
): Promise<Response> => {
  const token = getAccessToken();

  return fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
  });
};

/**
 * APIクライアント
 */
export const apiClient = {
  delete: (endpoint: string) => request("DELETE", endpoint),
  get: (endpoint: string) => request("GET", endpoint),
};
