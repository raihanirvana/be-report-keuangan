export type AuthUserResponse = {
  avatarUrl: null | string;
  email: string;
  id: string;
  name: string;
};

export type AuthRefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

export type AuthTokenResponse = AuthRefreshResponse & {
  user: AuthUserResponse;
};

export type JwtPayload = {
  email: string;
  sub: string;
};
