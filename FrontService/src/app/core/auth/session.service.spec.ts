import { provideHttpClient, withInterceptors } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { Session } from "./session.service";
import { TokenStorage } from "./token-storage.service";
import { comunidadAuthInterceptor } from "../http/comunidad-auth.interceptor";
import { HttpClient } from "@angular/common/http";
describe("Sesión compartida y JWT", () => {
  let session: Session;
  let http: HttpTestingController;
  let storage: TokenStorage;
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([comunidadAuthInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    session = TestBed.inject(Session);
    http = TestBed.inject(HttpTestingController);
    storage = TestBed.inject(TokenStorage);
  });
  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });
  it("espera la identidad verificada por backend antes de habilitar roles", () => {
    session.connect("token-prueba").subscribe();
    expect(session.account()).toBeNull();
    const request = http.expectOne("/api/comunidad/api/v1/sesion");
    expect(request.request.headers.get("Authorization")).toBe(
      "Bearer token-prueba",
    );
    request.flush({ id: 7, rol: "ESTUDIANTE" });
    expect(session.account()?.id).toBe(7);
    expect(storage.read()).toBe("token-prueba");
  });
  it("una sesión expirada se elimina", () => {
    storage.save("expirado");
    session.restore();
    http
      .expectOne("/api/comunidad/api/v1/sesion")
      .flush({}, { status: 401, statusText: "Unauthorized" });
    expect(storage.read()).toBeNull();
    expect(session.status()).toBe("guest");
  });
  it("un fallo del servicio no se interpreta como una identidad válida", () => {
    storage.save("pendiente");
    session.restore();
    http
      .expectOne("/api/comunidad/api/v1/sesion")
      .flush({}, { status: 503, statusText: "Unavailable" });
    expect(session.account()).toBeNull();
    expect(session.status()).toBe("unavailable");
  });
  it("no transmite JWT a otro servicio o dominio", () => {
    storage.save("token-prueba");
    const client = TestBed.inject(HttpClient);
    client.get("/api/comunidad/api/v1/resenas").subscribe();
    client.get("https://otro.example/recursos").subscribe();
    const ours = http.expectOne("/api/comunidad/api/v1/resenas");
    expect(ours.request.headers.get("Authorization")).toBe(
      "Bearer token-prueba",
    );
    ours.flush({});
    const other = http.expectOne("https://otro.example/recursos");
    expect(other.request.headers.has("Authorization")).toBe(false);
    other.flush({});
  });
  it("salir invalida una restauración todavía pendiente", () => {
    storage.save("token-prueba");
    session.restore();
    const pending = http.expectOne("/api/comunidad/api/v1/sesion");
    session.logout();
    pending.flush({ id: 2, rol: "ADMIN" });
    expect(session.account()).toBeNull();
    expect(storage.read()).toBeNull();
  });
});
