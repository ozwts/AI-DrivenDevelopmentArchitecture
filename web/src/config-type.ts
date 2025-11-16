export type MockType = "HAS_ALL";

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
