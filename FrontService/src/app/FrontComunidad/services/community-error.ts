import { HttpErrorResponse } from "@angular/common/http";
export function communityError(
  error: HttpErrorResponse,
  fallback: string,
): string {
  if (error.status === 0)
    return "No pudimos conectar con Comunidad. Inténtalo de nuevo.";
  if (error.status === 401)
    return "Tu sesión expiró. Inicia sesión nuevamente.";
  if (typeof error.error?.detail === "string") return error.error.detail;
  if (error.status === 503)
    return "Comunidad no está disponible en este momento. Inténtalo más tarde.";
  if (error.status === 422)
    return "Revisa los datos del formulario antes de continuar.";
  return fallback;
}
