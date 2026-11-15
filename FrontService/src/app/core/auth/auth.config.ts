import { OpenIdConfiguration } from "angular-auth-oidc-client";

export const authConfig: OpenIdConfiguration = {
  authority: "http://localhost:8081",

  clientId: "aulabreve-angular",

  redirectUrl: "http://localhost:4200/auth/callback",

  postLogoutRedirectUri: "http://localhost:4200/",

  responseType: "code",

  scope: "openid profile aulabreve.api",

  silentRenew: false,

  useRefreshToken: false,

  autoUserInfo: false,

  triggerAuthorizationResultEvent: true,
};