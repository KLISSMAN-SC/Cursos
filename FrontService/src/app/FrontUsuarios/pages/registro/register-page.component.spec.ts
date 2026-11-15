import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { Session, USUARIOS_API } from "../../../core/auth/session.service";
import { authInterceptor } from "../../../core/http/auth.interceptor";
import { RegisterPage } from "./register-page.component";

const url = `${USUARIOS_API}/register`;
const usuario = { id: 71, nombre: "Estudiante Registro", email: "registro@example.invalid", activo: true, roles: ["ESTUDIANTE"], fechaCreacion: "2026-01-01T00:00:00Z" };

describe("Registro de estudiantes", () => {
  let fixture: ComponentFixture<RegisterPage>;
  let component: RegisterPage;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
        { provide: Session, useValue: { accessToken: () => "token-prueba" } }],
    });
    fixture = TestBed.createComponent(RegisterPage);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());

  function completar() {
    component.form.setValue({ nombre: " Estudiante Registro ", email: "REGISTRO@example.invalid", password: "ClaveDemo2026!", confirmacion: "ClaveDemo2026!" });
  }

  it("registra con datos normalizados, sin token ni roles ni confirmación", () => {
    completar();
    component.submit();
    const request = http.expectOne(url);
    expect(request.request.method).toBe("POST");
    expect(request.request.headers.has("Authorization")).toBe(false);
    expect(request.request.body).toEqual({ nombre: "Estudiante Registro", email: "registro@example.invalid", password: "ClaveDemo2026!" });
    request.flush(usuario, { status: 201, statusText: "Created" });
    expect(component.success()).toBe(true);
    expect(component.fields.password.value).toBe("");
    expect(component.fields.confirmacion.value).toBe("");
    expect(component.busy()).toBe(false);
  });
  it("rechaza campos vacíos", () => {
    component.submit();
    http.expectNone(url);
    expect(component.form.invalid).toBe(true);
  });
  it("rechaza contraseñas diferentes", () => {
    completar();
    component.fields.confirmacion.setValue("OtraClave2026!");
    component.submit();
    http.expectNone(url);
    expect(component.form.hasError("noCoinciden")).toBe(true);
  });
  it("rechaza contraseñas de más de 72 bytes", () => {
    completar();
    component.fields.password.setValue("é".repeat(40));
    component.fields.confirmacion.setValue("é".repeat(40));
    component.submit();
    http.expectNone(url);
    expect(component.fields.password.hasError("maxBytes")).toBe(true);
  });
  it("informa el conflicto de correo y permite reintentar", () => {
    completar();
    component.submit();
    http.expectOne(url).flush({}, { status: 409, statusText: "Conflict" });
    expect(component.error()).toContain("ya está registrado");
    expect(component.busy()).toBe(false);
    expect(component.success()).toBe(false);
  });
  it("informa los errores de validación del backend", () => {
    completar();
    component.submit();
    http.expectOne(url).flush({}, { status: 400, statusText: "Bad Request" });
    expect(component.error()).toContain("no son válidos");
    expect(component.success()).toBe(false);
  });
  it("informa la indisponibilidad sin simular éxito", () => {
    completar();
    component.submit();
    http.expectOne(url).flush({}, { status: 503, statusText: "Unavailable" });
    expect(component.error()).toContain("No pudimos completar");
    expect(component.busy()).toBe(false);
    expect(component.success()).toBe(false);
  });
  it("bloquea el doble envío mientras la petición está pendiente", () => {
    completar();
    component.submit();
    component.submit();
    const requests = http.match(url);
    expect(requests.length).toBe(1);
    requests[0].flush(usuario, { status: 201, statusText: "Created" });
    expect(component.success()).toBe(true);
  });
});
