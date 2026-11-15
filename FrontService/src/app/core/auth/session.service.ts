import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { OidcSecurityService } from "angular-auth-oidc-client";
import { take } from "rxjs";
import { Rol, Usuario } from "../../FrontUsuarios/models/usuario";

export type Account = Usuario;
export const USUARIOS_API = "http://localhost:8081/api/v1/users";
type SessionStatus = "guest" | "loading" | "ready" | "unavailable";

@Injectable({ providedIn: "root" })
export class Session {
  private readonly http = inject(HttpClient);
  private readonly oidc = inject(OidcSecurityService);
  private readonly router = inject(Router);
  private readonly identity = signal<Account | null>(null);
  private readonly phase = signal<SessionStatus>("guest");
  private readonly message = signal("");
  readonly account = this.identity.asReadonly();
  readonly status = this.phase.asReadonly();
  readonly error = this.message.asReadonly();

  // La biblioteca OIDC es la única responsable del almacenamiento persistente.
  // Esta referencia en memoria solo se usa durante la sesión de la aplicación.
  private token: string | null = null;
  private expiresAt = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private generation = 0;
  private initialized = false;

  restore(): void {
    if (this.status() === "loading" || this.status() === "ready") return;
    if (this.token && this.expiresAt <= Date.now()) {
      this.expire();
      return;
    }
    this.message.set("");
    if (this.token) {
      const operation = ++this.generation;
      this.phase.set("loading");
      this.consultarPerfil(this.token, operation, false);
      return;
    }
    if (this.initialized) return;
    this.initialized = true;
    const operation = ++this.generation;
    const callback = window.location.pathname === "/auth/callback";
    // Retira únicamente el almacenamiento de la herramienta antigua.
    sessionStorage.removeItem("cursos.access_token");
    this.phase.set("loading");
    this.oidc.checkAuth().pipe(take(1)).subscribe({
      next: (result) => {
        if (operation !== this.generation) return;
        if (!result.isAuthenticated || !result.accessToken) {
          this.clearState();
          if (result.errorMessage) this.message.set("No se pudo completar el inicio de sesión. Intenta nuevamente.");
          this.finishCallback(callback);
          return;
        }
        const expiresAt = this.tokenExpiration(result.accessToken);
        if (expiresAt <= Date.now()) {
          this.expire();
          this.finishCallback(callback);
          return;
        }
        this.token = result.accessToken;
        this.expiresAt = expiresAt;
        this.scheduleExpiry();
        this.consultarPerfil(result.accessToken, operation, callback);
      },
      error: () => {
        if (operation !== this.generation) return;
        this.initialized = false;
        this.phase.set("unavailable");
        this.message.set("No se pudo conectar con el servicio de autenticación.");
        this.finishCallback(callback);
      },
    });
  }

  login(): void {
    if (this.status() === "loading" || this.status() === "ready") return;
    this.message.set("");
    this.oidc.authorize();
  }

  hasRole(rol: Rol): boolean {
    return this.account()?.roles.includes(rol) ?? false;
  }

  accessToken(): string | null {
    if (this.token && this.expiresAt <= Date.now()) {
      this.expire();
    }
    return this.status() === "ready" ? this.token : null;
  }

  invalidateToken(token: string): void {
    if (this.token === token) {
      this.expire("La sesión ya no es válida. Inicia sesión nuevamente.");
    }
  }

  logout(): void {
    this.clearState();
    this.initialized = true;
    this.message.set("");
    // Conservamos el ID token en la biblioteca hasta solicitar el logout OIDC.
    this.oidc.logoff().pipe(take(1)).subscribe({
      next: () => this.oidc.logoffLocal(),
      error: () => {
        this.oidc.logoffLocal();
        this.message.set("La sesión local se cerró, pero no se pudo confirmar el cierre en UsuarioService.");
      },
    });
  }

  private consultarPerfil(token: string, operation: number, callback: boolean): void {
    this.http.get<Account>(`${USUARIOS_API}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).pipe(take(1)).subscribe({
      next: (account) => {
        if (operation !== this.generation) return;
        if (this.expiresAt <= Date.now()) {
          this.expire();
        } else if (!account.activo || !Number.isInteger(account.id) || account.id <= 0 || !Array.isArray(account.roles)) {
          this.expire("No se pudo verificar una cuenta activa.");
        } else {
          this.identity.set(account);
          this.phase.set("ready");
        }
        this.finishCallback(callback);
      },
      error: (error: HttpErrorResponse) => {
        if (operation !== this.generation) return;
        if (error.status === 401 || error.status === 403) {
          this.expire("La cuenta o la sesión ya no está disponible.");
        } else {
          this.identity.set(null);
          this.phase.set("unavailable");
          this.message.set("No se pudo verificar el perfil. Vuelve a intentar.");
        }
        this.finishCallback(callback);
      },
    });
  }

  private finishCallback(callback: boolean): void {
  if (callback) {

    const target =
      this.status() === "ready"
        ? "/usuarios/mi-cuenta"
        : "/usuarios/ingreso";

    void this.router.navigateByUrl(
      target,
      { replaceUrl: true }
    );
  }
}

  // Solo lee exp para programar el cierre visual; la API valida la firma y los permisos.
  private tokenExpiration(token: string): number {
    try {
      const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const claims = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "=")));
      return typeof claims.exp === "number" && Number.isFinite(claims.exp) ? claims.exp * 1000 : 0;
    } catch { return 0; }
  }

  private scheduleExpiry(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    const check = () => {
      const remaining = this.expiresAt - Date.now();
      if (remaining <= 0) this.expire();
      else this.timer = setTimeout(check, Math.min(remaining, 2_147_483_647));
    };
    check();
  }

  private expire(message = "Tu sesión ha expirado. Inicia sesión nuevamente."): void {
    this.clearState();
    this.initialized = true;
    this.oidc.logoffLocal();
    this.message.set(message);
  }

  private clearState(): void {
    ++this.generation;
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    this.token = null;
    this.expiresAt = 0;
    this.identity.set(null);
    this.phase.set("guest");
  }
  aplicarPerfilActualizado(
  account: Account,
  expectedToken: string
): boolean {

  const token = this.accessToken();
  const current = this.account();

  if (
    !token ||
    token !== expectedToken ||
    !current ||
    !account.activo ||
    account.id !== current.id ||
    !Array.isArray(account.roles)
  ) {
    return false;
  }

  this.identity.set(account);

  return true;
}
}
