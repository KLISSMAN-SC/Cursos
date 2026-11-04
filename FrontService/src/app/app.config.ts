import { ApplicationConfig, LOCALE_ID } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { registerLocaleData } from "@angular/common";
import localeEs from "@angular/common/locales/es";
import { routes } from "./app.routes";
import { comunidadAuthInterceptor } from "./core/http/comunidad-auth.interceptor";
registerLocaleData(localeEs);
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([comunidadAuthInterceptor])),
    { provide: LOCALE_ID, useValue: "es-PE" },
  ],
};
