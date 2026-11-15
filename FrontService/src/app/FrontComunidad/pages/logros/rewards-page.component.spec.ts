import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of, Subject, throwError } from "rxjs";
import { Account, Session } from "../../../core/auth/session.service";
import { CommunityApi } from "../../services/community-api.service";
import { RewardsPage } from "./rewards-page.component";

describe("Mis logros", () => {
  let api: { rewards: ReturnType<typeof vi.fn> };
  let session: {
    account: ReturnType<typeof signal<Account | null>>;
    status: ReturnType<typeof signal<string>>;
  };
  const page = {
    items: [
      {
        id: 1,
        curso_id: 1,
        version_curso: 1,
        modulo_id: 3,
        insignia: "Módulo completado",
        puntos: 10,
        obtenida_en: "2026-11-14T12:00:00Z",
      },
    ],
    total: 1,
    puntos: 10,
    offset: 0,
    limit: 12,
  };
  beforeEach(() => {
    api = { rewards: vi.fn(() => of(page)) };
    session = {
      account: signal<Account | null>(null),
      status: signal("guest"),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CommunityApi, useValue: api },
        { provide: Session, useValue: session },
      ],
    });
  });
  function open() {
    const fixture = TestBed.createComponent(RewardsPage);
    fixture.detectChanges();
    return fixture;
  }
  it("un visitante no consulta ni ve logros privados", () => {
    const fixture = open();
    expect(api.rewards).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain("cuenta de estudiante");
  });
  it("muestra puntos e insignias propios y limpia al salir", () => {
    session.account.set({ id: 7, nombre: "Usuario 7", email: "usuario7@example.invalid", activo: true, roles: ["ESTUDIANTE"], fechaCreacion: "2026-01-01T00:00:00Z" });
    const fixture = open();
    expect(fixture.nativeElement.textContent).toContain("Módulo #3");
    expect(fixture.componentInstance.data()?.puntos).toBe(10);
    session.account.set(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain("Módulo #3");
    expect(fixture.componentInstance.data()).toBeNull();
  });
  it("presenta vacío real con cero puntos", () => {
    session.account.set({ id: 7, nombre: "Usuario 7", email: "usuario7@example.invalid", activo: true, roles: ["ESTUDIANTE"], fechaCreacion: "2026-01-01T00:00:00Z" });
    api.rewards.mockReturnValue(
      of({ items: [], total: 0, puntos: 0, offset: 0, limit: 12 }),
    );
    const fixture = open();
    expect(fixture.nativeElement.textContent).toContain("primera insignia");
    expect(fixture.componentInstance.data()?.puntos).toBe(0);
  });
  it("permite reintentar fallos sin inventar logros", () => {
    session.account.set({ id: 7, nombre: "Usuario 7", email: "usuario7@example.invalid", activo: true, roles: ["ESTUDIANTE"], fechaCreacion: "2026-01-01T00:00:00Z" });
    api.rewards.mockReturnValueOnce(throwError(() => ({ status: 503 })));
    const fixture = open();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    expect(fixture.componentInstance.data()).toBeNull();
    fixture.componentInstance.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("Módulo #3");
  });
  it("descarta respuestas de una sesión anterior", () => {
    session.account.set({ id: 7, nombre: "Usuario 7", email: "usuario7@example.invalid", activo: true, roles: ["ESTUDIANTE"], fechaCreacion: "2026-01-01T00:00:00Z" });
    const pending = new Subject();
    api.rewards.mockReturnValueOnce(pending);
    const fixture = open();
    session.account.set({ id: 8, nombre: "Usuario 8", email: "usuario8@example.invalid", activo: true, roles: ["ESTUDIANTE"], fechaCreacion: "2026-01-01T00:00:00Z" });
    fixture.detectChanges();
    pending.next({ ...page, puntos: 999 });
    expect(fixture.componentInstance.data()?.puntos).toBe(10);
  });
});
