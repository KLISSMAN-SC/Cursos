import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, throwError } from "rxjs";
import { Session, USUARIOS_API } from "../auth/session.service";

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const url = new URL(request.url, window.location.origin);
  const api = new URL(USUARIOS_API);
  const usuario = url.origin === api.origin &&
    (url.pathname === `${api.pathname}/me` || url.pathname === `${api.pathname}/me/password`);
  const comunidad = url.origin === window.location.origin && url.pathname.startsWith("/api/comunidad/api/v1/");
  if ((!usuario && !comunidad) || request.headers.has("Authorization")) return next(request);

  const session = inject(Session);
  const token = session.accessToken();
  if (!token) return next(request);

  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error: HttpErrorResponse) => {
      // Comunidad aún tiene un contrato provisional. Su 401 no invalida la sesión global.
      if (usuario && error.status === 401) session.invalidateToken(token);
      return throwError(() => error);
    }),
  );
};
