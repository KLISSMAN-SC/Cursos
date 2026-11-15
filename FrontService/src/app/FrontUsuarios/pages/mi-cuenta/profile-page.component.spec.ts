import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { OidcSecurityService } from "angular-auth-oidc-client";
import { of } from "rxjs";
import { vi } from "vitest";
import { Account, Session, USUARIOS_API } from "../../../core/auth/session.service";
import { authInterceptor } from "../../../core/http/auth.interceptor";
import { ProfilePage } from "./profile-page.component";

const url = `${USUARIOS_API}/me`;
const passwordUrl = `${USUARIOS_API}/me/password`;
const account: Account = { id: 87, nombre: "Estudiante Angular", email: "estudiante@example.invalid", activo: true, roles: ["ESTUDIANTE"], fechaCreacion: "2026-01-01T00:00:00Z" };

describe("Mi cuenta de AulaBreve", () => {
  let fixture: ComponentFixture<ProfilePage>;
  let component: ProfilePage;
  let session: Session;
  let http: HttpTestingController;
  let token: string;

  beforeEach(() => {
    token = `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 900 })).replace(/=/g, "")}.signature`;
    TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
        { provide: OidcSecurityService, useValue: {
          checkAuth: vi.fn(() => of({ isAuthenticated: true, accessToken: token })),
          authorize: vi.fn(), logoff: vi.fn(() => of(null)), logoffLocal: vi.fn(),
        } }],
    });
    session = TestBed.inject(Session);
    http = TestBed.inject(HttpTestingController);
    session.restore();
    http.expectOne(url).flush(account);
    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  afterEach(() => {
    http.verify();
    session.logout();
    fixture.destroy();
  });

  it("muestra los datos de la cuenta verificada", () => {
    expect(component.fields.nombre.value).toBe(account.nombre);
    expect(component.fields.email.value).toBe(account.email);
    expect(fixture.nativeElement.textContent).toContain("Estudiante");
  });
  it("actualiza solo el nombre y sincroniza la sesión compartida", () => {
    component.fields.nombre.setValue(" Nombre Nuevo ");
    component.submit();
    const req = http.expectOne(url);
    expect(req.request.method).toBe("PATCH");
    expect(req.request.headers.get("Authorization")).toBe(`Bearer ${token}`);
    expect(req.request.body).toEqual({ nombre: "Nombre Nuevo" });
    req.flush({ ...account, nombre: "Nombre Nuevo" });
    expect(session.account()?.nombre).toBe("Nombre Nuevo");
    expect(session.account()?.id).toBe(87);
    expect(session.account()?.roles).toEqual(["ESTUDIANTE"]);
    expect(component.success()).toContain("correctamente");
  });
  it("no envía una actualización vacía", () => {
    component.submit();
    http.expectNone(url);
    expect(component.success()).toContain("No hay cambios");
  });
  it("rechaza nombre vacío o correo inválido", () => {
    component.fields.nombre.setValue("   ");
    component.fields.email.setValue("incorrecto");
    component.submit();
    http.expectNone(url);
    expect(component.form.invalid).toBe(true);
  });
  it("exige contraseña actual cuando cambia el correo", () => {
    component.fields.email.setValue("nuevo@example.invalid");
    component.submit();
    http.expectNone(url);
    expect(component.error()).toContain("contraseña");
  });
  it("envía el correo normalizado y la contraseña sin modificar ID ni roles", () => {
    component.fields.email.setValue(" NUEVO@example.invalid ");
    component.fields.passwordActual.setValue("ClaveDemo2026!");
    component.submit();
    const req = http.expectOne(url);
    expect(req.request.body).toEqual({ email: "nuevo@example.invalid", passwordActual: "ClaveDemo2026!" });
    req.flush({ ...account, email: "nuevo@example.invalid" });
    expect(session.account()?.email).toBe("nuevo@example.invalid");
    expect(component.fields.passwordActual.value).toBe("");
  });
  it("informa el conflicto de correo sin modificar la cuenta", () => {
    component.fields.email.setValue("ocupado@example.invalid");
    component.fields.passwordActual.setValue("ClaveDemo2026!");
    component.submit();
    http.expectOne(url).flush({}, { status: 409, statusText: "Conflict" });
    expect(component.error()).toContain("ya está registrado");
    expect(session.account()?.email).toBe(account.email);
  });
  it("informa el rechazo de contraseña actual y conserva el perfil", () => {
    component.fields.email.setValue("nuevo@example.invalid");
    component.fields.passwordActual.setValue("Incorrecta2026!");
    component.submit();
    http.expectOne(url).flush({}, { status: 403, statusText: "Forbidden" });
    expect(component.error()).toContain("contraseña actual");
    expect(session.account()?.email).toBe(account.email);
    expect(component.fields.passwordActual.value).toBe("");
  });
  it("bloquea el doble envío", () => {
    component.fields.nombre.setValue("Nuevo nombre");
    component.submit();
    component.submit();
    const requests = http.match(url);
    expect(requests.length).toBe(1);
    requests[0].flush({ ...account, nombre: "Nuevo nombre" });
    expect(component.busy()).toBe(false);
  });
  it("una respuesta pendiente no restaura una sesión cerrada", () => {
    component.fields.nombre.setValue("Nuevo nombre");
    component.submit();
    const pending = http.expectOne(url);
    session.logout();
    pending.flush({ ...account, nombre: "Nuevo nombre" });
    expect(session.account()).toBeNull();
    expect(component.success()).toBe("");
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector("form")).toBeNull();
  });
  it("un 401 de UsuarioService retira la sesión", () => {
    component.fields.nombre.setValue("Nuevo nombre");
    component.submit();
    http.expectOne(url).flush({}, { status: 401, statusText: "Unauthorized" });
    expect(session.account()).toBeNull();
    expect(session.status()).toBe("guest");
  });
  it("no permite actualizar desde una sesión de visitante", () => {
    session.logout();
    fixture.detectChanges();
    component.submit();
    http.expectNone(url);
    expect(fixture.nativeElement.querySelector("form")).toBeNull();
  });

it("no envía el cambio cuando los campos están vacíos", () => {
  component.submitPassword();

  http.expectNone(passwordUrl);
  expect(component.passwordForm.invalid).toBe(true);
});

it("rechaza una contraseña menor de 12 caracteres", () => {
  component.passwordFields.passwordActual.setValue("ClaveActual2026!");
  component.passwordFields.passwordNueva.setValue("Nueva123");
  component.passwordFields.confirmarPassword.setValue("Nueva123");

  component.submitPassword();

  http.expectNone(passwordUrl);
  expect(component.passwordForm.invalid).toBe(true);
});

it("rechaza contraseñas que superan los 72 bytes UTF-8", () => {
  const larga = "😀".repeat(19);

  component.passwordFields.passwordActual.setValue("ClaveActual2026!");
  component.passwordFields.passwordNueva.setValue(larga);
  component.passwordFields.confirmarPassword.setValue(larga);

  component.submitPassword();

  http.expectNone(passwordUrl);
  expect(component.passwordForm.invalid).toBe(true);
});

it("rechaza una confirmación diferente", () => {
  component.passwordFields.passwordActual.setValue("ClaveActual2026!");
  component.passwordFields.passwordNueva.setValue("NuevaClave2026!");
  component.passwordFields.confirmarPassword.setValue("OtraClave2026!");

  component.submitPassword();

  http.expectNone(passwordUrl);
  expect(component.passwordForm.hasError("passwordMismatch")).toBe(true);
});

it("rechaza utilizar la misma contraseña actual", () => {
  component.passwordFields.passwordActual.setValue("ClaveActual2026!");
  component.passwordFields.passwordNueva.setValue("ClaveActual2026!");
  component.passwordFields.confirmarPassword.setValue("ClaveActual2026!");

  component.submitPassword();

  http.expectNone(passwordUrl);
  expect(component.passwordForm.hasError("sameAsCurrent")).toBe(true);
});

it("informa cuando la contraseña actual es incorrecta", () => {
  component.passwordFields.passwordActual.setValue("Incorrecta2026!");
  component.passwordFields.passwordNueva.setValue("NuevaClave2026!");
  component.passwordFields.confirmarPassword.setValue("NuevaClave2026!");

  component.submitPassword();

  http.expectOne(passwordUrl).flush(
    {},
    { status: 403, statusText: "Forbidden" }
  );

  expect(component.passwordError()).toContain("contraseña actual");
});

it("controla los errores de validación del backend", () => {
  component.passwordFields.passwordActual.setValue("ClaveActual2026!");
  component.passwordFields.passwordNueva.setValue("NuevaClave2026!");
  component.passwordFields.confirmarPassword.setValue("NuevaClave2026!");

  component.submitPassword();

  http.expectOne(passwordUrl).flush(
    {},
    { status: 400, statusText: "Bad Request" }
  );

  expect(component.passwordError()).toBe(
    "La nueva contraseña no cumple las reglas o debe ser diferente de la actual."
  );
});

it("actualiza correctamente la contraseña y limpia los campos", () => {
  component.passwordFields.passwordActual.setValue("ClaveActual2026!");
  component.passwordFields.passwordNueva.setValue("NuevaClave2026!");
  component.passwordFields.confirmarPassword.setValue("NuevaClave2026!");

  component.submitPassword();

  const req = http.expectOne(passwordUrl);

  expect(req.request.method).toBe("POST");
  expect(req.request.headers.get("Authorization")).toBe(`Bearer ${token}`);

  expect(req.request.body).toEqual({
    passwordActual: "ClaveActual2026!",
    passwordNueva: "NuevaClave2026!",
  });

  req.flush(null, {
    status: 204,
    statusText: "No Content",
  });

  expect(component.passwordSuccess()).toContain("correctamente");
  expect(component.passwordFields.passwordActual.value).toBe("");
  expect(component.passwordFields.passwordNueva.value).toBe("");
  expect(component.passwordFields.confirmarPassword.value).toBe("");
});

it("bloquea solicitudes duplicadas de cambio de contraseña", () => {
  component.passwordFields.passwordActual.setValue("ClaveActual2026!");
  component.passwordFields.passwordNueva.setValue("NuevaClave2026!");
  component.passwordFields.confirmarPassword.setValue("NuevaClave2026!");

  component.submitPassword();
  component.submitPassword();

  const requests = http.match(passwordUrl);

  expect(requests.length).toBe(1);

  requests[0].flush(null, {
    status: 204,
    statusText: "No Content",
  });

  expect(component.passwordBusy()).toBe(false);
});

});
