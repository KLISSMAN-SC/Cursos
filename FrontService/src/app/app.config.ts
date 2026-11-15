import { ApplicationConfig, LOCALE_ID } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { registerLocaleData } from "@angular/common";
import localeEs from "@angular/common/locales/es";
import { provideAuth } from "angular-auth-oidc-client";
import { routes } from "./app.routes";
import { authInterceptor } from "./core/http/auth.interceptor";
import { authConfig } from "./core/auth/auth.config";

registerLocaleData(localeEs);
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAuth({ config: authConfig }),
    { provide: LOCALE_ID, useValue: "es-PE" },
  ],
};
