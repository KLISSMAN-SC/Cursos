import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { TokenStorage } from "../auth/token-storage.service";
export const comunidadAuthInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(TokenStorage).read();
  if (
    token &&
    request.url.startsWith("/api/comunidad/") &&
    !request.headers.has("Authorization")
  ) {
    return next(
      request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
    );
  }
  return next(request);
};
