import { HttpClient, provideHttpClient, withInterceptors } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { OidcSecurityService } from "angular-auth-oidc-client";
import { of } from "rxjs";
import { vi } from "vitest";
import { Account, Session, USUARIOS_API } from "./session.service";
import { authInterceptor } from "../http/auth.interceptor";

const profile = (roles: Account["roles"] = ["ESTUDIANTE"]): Account => ({
  id: 7, nombre: "Usuario prueba", email: "prueba@example.invalid",
  activo: true, roles, fechaCreacion: "2026-01-01T00:00:00Z",
});
const tokenFor = (seconds = 900) => `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds })).replace(/=/g, "")}.signature`;

describe("Sesión compartida de UsuarioService", () => {
  let session: Session;
  let http: HttpTestingController;
  let client: HttpClient;
  let token: string;
  let oidc: { checkAuth: ReturnType<typeof vi.fn>; authorize: ReturnType<typeof vi.fn>; logoff: ReturnType<typeof vi.fn>; logoffLocal: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    token = tokenFor();
    oidc = {
      checkAuth: vi.fn(() => of({ isAuthenticated: true, accessToken: token })),
      authorize: vi.fn(), logoff: vi.fn(() => of(null)), logoffLocal: vi.fn(),
    };
    TestBed.configureTestingModule({ providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      { provide: OidcSecurityService, useValue: oidc },
    ] });
    session = TestBed.inject(Session);
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    http.verify();
    session.logout();
    vi.clearAllTimers();
    vi.useRealTimers();
    sessionStorage.removeItem("cursos.access_token");
  });

  function connect(roles: Account["roles"] = ["ESTUDIANTE"]) {
    session.restore();
    const req = http.expectOne(`${USUARIOS_API}/me`);
    expect(req.request.headers.get("Authorization")).toBe(`Bearer ${token}`);
    req.flush(profile(roles));
  }

  it("verifica la identidad en UsuarioService antes de exponerla", () => {
    session.restore();
    expect(session.status()).toBe("loading");
    expect(session.account()).toBeNull();
    expect(session.accessToken()).toBeNull();
    http.expectOne(`${USUARIOS_API}/me`).flush(profile());
    expect(session.account()?.id).toBe(7);
    expect(session.status()).toBe("ready");
    expect(session.accessToken()).toBe(token);
  });

  it("no repite el procesamiento del callback en la misma carga", () => {
    session.restore();
    session.restore();
    http.expectOne(`${USUARIOS_API}/me`).flush(profile());
    session.restore();
    expect(oidc.checkAuth).toHaveBeenCalledTimes(1);
  });

  it("conserva el estado invitado sin token", () => {
    oidc.checkAuth.mockReturnValue(of({ isAuthenticated: false, accessToken: "" }));
    session.restore();
    expect(session.status()).toBe("guest");
    expect(session.account()).toBeNull();
    http.expectNone(`${USUARIOS_API}/me`);
    session.login();
    expect(oidc.authorize).toHaveBeenCalledOnce();
  });

  it("no confunde administrador de catálogo con moderador", () => {
    connect(["ADMIN_CATALOGO"]);
    expect(session.hasRole("ADMIN_CATALOGO")).toBe(true);
    expect(session.hasRole("MODERADOR_COMUNIDAD")).toBe(false);
    expect(session.hasRole("ESTUDIANTE")).toBe(false);
  });

  it("reconoce más de un rol", () => {
    connect(["ESTUDIANTE", "MODERADOR_COMUNIDAD"]);
    expect(session.hasRole("ESTUDIANTE")).toBe(true);
    expect(session.hasRole("MODERADOR_COMUNIDAD")).toBe(true);
  });

  it("elimina la identidad si UsuarioService rechaza el token", () => {
    session.restore();
    http.expectOne(`${USUARIOS_API}/me`).flush({}, { status: 401, statusText: "Unauthorized" });
    expect(session.account()).toBeNull();
    expect(session.status()).toBe("guest");
    expect(oidc.logoffLocal).toHaveBeenCalled();
  });

  it("un fallo temporal no autentica al usuario y permite reintentar", () => {
    session.restore();
    http.expectOne(`${USUARIOS_API}/me`).flush({}, { status: 503, statusText: "Unavailable" });
    expect(session.account()).toBeNull();
    expect(session.status()).toBe("unavailable");
    session.restore();
    http.expectOne(`${USUARIOS_API}/me`).flush(profile());
    expect(session.status()).toBe("ready");
    expect(oidc.checkAuth).toHaveBeenCalledTimes(1);
  });

  it("salir invalida una consulta de perfil todavía pendiente", () => {
    session.restore();
    const pending = http.expectOne(`${USUARIOS_API}/me`);
    session.logout();
    pending.flush(profile());
    expect(session.account()).toBeNull();
    expect(session.accessToken()).toBeNull();
    expect(oidc.logoff).toHaveBeenCalled();
  });

  it("oculta la identidad y retira el access token al expirar", () => {
    connect();
    vi.advanceTimersByTime(901_000);
    expect(session.account()).toBeNull();
    expect(session.status()).toBe("guest");
    expect(session.accessToken()).toBeNull();
  });

  it("adjunta JWT solo a APIs autorizadas y no a dominios externos", () => {
    connect();
    const urls = [`${USUARIOS_API}/me`, `${USUARIOS_API}/me/password`, "/api/comunidad/api/v1/resenas", `${USUARIOS_API}/register`, "https://otro.example/recursos", "https://otro.example/api/comunidad/api/v1/resenas"];
    urls.forEach(url => client.get(url).subscribe());
    urls.forEach((url, index) => {
      const req = http.expectOne(url);
      expect(req.request.headers.get("Authorization")).toBe(index < 3 ? `Bearer ${token}` : null);
      req.flush({});
    });
  });

  it("un 401 de Comunidad no invalida la identidad central durante la integración", () => {
    connect();
    client.get("/api/comunidad/api/v1/resenas").subscribe({ error: () => {} });
    http.expectOne("/api/comunidad/api/v1/resenas").flush({}, { status: 401, statusText: "Unauthorized" });
    expect(session.status()).toBe("ready");
    expect(session.account()?.id).toBe(7);
  });
  it("un 401 de una API protegida de UsuarioService cierra la sesión", () => {
    connect();
    client.post(`${USUARIOS_API}/me/password`, {}).subscribe({ error: () => {} });
    http.expectOne(`${USUARIOS_API}/me/password`).flush({}, { status: 401, statusText: "Unauthorized" });
    expect(session.status()).toBe("guest");
    expect(session.account()).toBeNull();
    expect(session.accessToken()).toBeNull();
  });

});
