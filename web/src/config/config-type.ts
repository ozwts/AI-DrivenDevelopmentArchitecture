export type MockType = "HAS_ALL" | "EMPTY";

export type Config = {
  apiUrl: string;
  mockedApi: boolean;
  mockType?: MockType; // mockedApiがtrueの時のみ使用
  auth?: {
    // mockedApiがfalseの時のみ必須
    userPoolId: string;
    userPoolClientId: string;
    region: string;
  };
};
