import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of } from "rxjs";
import { Account, Session } from "../../../core/auth/session.service";
import { CommunityApi } from "../../services/community-api.service";
import { ModerationPage } from "./moderation-page.component";

describe("Moderación", () => {
  let api: {
    moderation: ReturnType<typeof vi.fn>;
    hide: ReturnType<typeof vi.fn>;
  };
  let session: {
    account: ReturnType<typeof signal<Account | null>>;
    status: ReturnType<typeof signal<string>>;
  };
  beforeEach(() => {
    api = {
      moderation: vi.fn(() =>
        of({
          items: [
            {
              id: 1,
              curso_id: 1,
              estudiante_id: 7,
              calificacion: 2,
              comentario: "Texto ocultado",
              oculta: true,
              creada_en: "2026-11-14T12:00:00Z",
              moderacion: {
                administrador_id: 23,
                motivo: "Lenguaje ofensivo",
                moderada_en: "2026-11-14T13:00:00Z",
              },
            },
          ],
          total: 1,
          limit: 12,
          offset: 0,
        }),
      ),
      hide: vi.fn(),
    };
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
    const fixture = TestBed.createComponent(ModerationPage);
    fixture.detectChanges();
    return fixture;
  }
  it("el alumno no consulta el historial administrativo", () => {
    session.account.set({ id: 7, rol: "ESTUDIANTE" });
    const fixture = open();
    expect(api.moderation).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain("Texto ocultado");
  });
  it("el admin ve motivo, autor y fecha sin controles para modificar la auditoría", () => {
    session.account.set({ id: 2, rol: "ADMIN" });
    const fixture = open();
    expect(fixture.nativeElement.textContent).toContain("Lenguaje ofensivo");
    expect(fixture.nativeElement.textContent).toContain("Administrador #23");
    expect(
      fixture.nativeElement.querySelector(".moderation-toggle"),
    ).toBeNull();
    session.account.set(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain(
      "Lenguaje ofensivo",
    );
  });
  it("rechaza filtro inválido y filtra por curso y estado", () => {
    session.account.set({ id: 2, rol: "ADMIN" });
    const fixture = open();
    const component = fixture.componentInstance;
    component.course = "-2";
    component.load();
    expect(api.moderation).toHaveBeenCalledTimes(1);
    expect(component.error()).toContain("entero y positivo");
    component.course = "3";
    component.state = "ocultas";
    component.load();
    expect(api.moderation).toHaveBeenLastCalledWith("ocultas", 3, 0);
  });
});
