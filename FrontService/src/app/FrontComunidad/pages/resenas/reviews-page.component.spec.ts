import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";
import { signal } from "@angular/core";
import { of, Subject, throwError } from "rxjs";
import { ReviewsPage } from "./reviews-page.component";
import { CommunityApi } from "../../services/community-api.service";
import { Review, ReviewPage } from "../../models/review";
import { Account, Session } from "../../../core/auth/session.service";

function page(total = 2): ReviewPage {
  return {
    items: Array.from({ length: Math.min(6, total) }, (_, i) => ({
      id: i + 1,
      curso_id: 1,
      estudiante_id: i + 7,
      calificacion: 5,
      comentario: "Experiencia " + (i + 1),
      creada_en: "2026-11-04T12:00:00Z",
    })),
    total,
    limit: 6,
    offset: 0,
    resumen: {
      total,
      promedio: total ? 5 : null,
      distribucion: { "1": 0, "2": 0, "3": 0, "4": 0, "5": total },
    },
  };
}
describe("Reseñas de Comunidad", () => {
  let api: {
    list: ReturnType<typeof vi.fn>;
    publish: ReturnType<typeof vi.fn>;
    hide: ReturnType<typeof vi.fn>;
  };
  let session: {
    account: ReturnType<typeof signal<Account | null>>;
    status: ReturnType<typeof signal<string>>;
  };
  beforeEach(() => {
    api = {
      list: vi.fn(() => of(page())),
      publish: vi.fn(() => of(page().items[0])),
      hide: vi.fn(() => of({ resena_id: 1 })),
    };
    session = {
      account: signal<Account | null>(null),
      status: signal("guest"),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: "comunidad/cursos/:cursoId", component: ReviewsPage },
        ]),
        { provide: CommunityApi, useValue: api },
        { provide: Session, useValue: session },
      ],
    });
  });
  async function open(id = "1") {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl(
      "/comunidad/cursos/" + id,
      ReviewsPage,
    );
    harness.detectChanges();
    return { harness, component, root: harness.routeNativeElement! };
  }
  it("un visitante lee reseñas sin controles de publicación ni moderación", async () => {
    const { root } = await open();
    expect(root.textContent).toContain("Experiencia 1");
    expect(root.querySelector(".composer")).toBeNull();
    expect(root.textContent).not.toContain("Ocultar reseña");
  });
  it("el alumno publica con IDs enteros y recarga el resumen", async () => {
    session.account.set({ id: 7, rol: "ESTUDIANTE" });
    const { component, harness, root } = await open();
    component.comment = "  Aprendí bastante  ";
    component.rating = 4;
    component.publish();
    harness.detectChanges();
    expect(api.publish).toHaveBeenCalledWith({
      curso_id: 1,
      calificacion: 4,
      comentario: "Aprendí bastante",
    });
    expect(api.list).toHaveBeenCalledTimes(2);
    expect(root.textContent).toContain("Tu reseña ya está publicada");
    expect(component.comment).toBe("");
  });
  it("un fallo al publicar conserva el texto y permite reintentar", async () => {
    session.account.set({ id: 7, rol: "ESTUDIANTE" });
    api.publish.mockReturnValue(throwError(() => ({ status: 503 })));
    const { component, harness, root } = await open();
    component.comment = "Mi experiencia";
    component.publish();
    harness.detectChanges();
    expect(component.comment).toBe("Mi experiencia");
    expect(component.posting()).toBe(false);
    expect(root.querySelector('[role="alert"]')).toBeTruthy();
  });
  it("bloquea doble publicación mientras la primera está pendiente", async () => {
    session.account.set({ id: 7, rol: "ESTUDIANTE" });
    api.publish.mockReturnValue(new Subject<Review>());
    const { component } = await open();
    component.publish();
    component.publish();
    expect(api.publish).toHaveBeenCalledOnce();
  });
  it("el admin encuentra moderación y el motivo es obligatorio", async () => {
    session.account.set({ id: 2, rol: "ADMIN" });
    const { root, harness } = await open();
    expect(root.querySelector(".composer")).toBeNull();
    (root.querySelector(".moderation-toggle") as HTMLButtonElement).click();
    harness.detectChanges();
    const confirm = root.querySelector(
      '.moderation-form button[type="submit"]',
    ) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    await harness.fixture.whenStable();
    const reason = root.querySelector("textarea") as HTMLTextAreaElement;
    reason.value = "Ofensivo";
    reason.dispatchEvent(new Event("input"));
    harness.detectChanges();
    await harness.fixture.whenStable();
    const updated = page(1);
    updated.items = [page().items[1]];
    api.list.mockReturnValue(of(updated));
    (root.querySelector(".moderation-form") as HTMLFormElement).dispatchEvent(
      new Event("submit"),
    );
    harness.detectChanges();
    await harness.fixture.whenStable();
    expect(api.hide).toHaveBeenCalledWith(1, "Ofensivo");
    expect(root.textContent).not.toContain("Experiencia 1");
    expect(root.textContent).toContain("El motivo quedó registrado");
  });
  it("un error al moderar mantiene visible el comentario", async () => {
    session.account.set({ id: 2, rol: "ADMIN" });
    api.hide.mockReturnValue(throwError(() => ({ status: 503 })));
    const { root, harness } = await open();
    (root.querySelector(".moderation-toggle") as HTMLButtonElement).click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    const reason = root.querySelector("textarea") as HTMLTextAreaElement;
    reason.value = "Motivo";
    reason.dispatchEvent(new Event("input"));
    harness.detectChanges();
    await harness.fixture.whenStable();
    (root.querySelector(".moderation-form") as HTMLFormElement).dispatchEvent(
      new Event("submit"),
    );
    harness.detectChanges();
    expect(root.textContent).toContain("Experiencia 1");
    expect(root.querySelector('[role="alert"]')).toBeTruthy();
  });
  it("muestra un estado vacío y no inventa una calificación", async () => {
    api.list.mockReturnValue(of(page(0)));
    const { root } = await open();
    expect(root.textContent).toContain("Aquí empieza la conversación");
    expect(root.querySelector(".score strong")?.textContent).toContain("—");
  });
  it("permite recuperar un error de carga", async () => {
    api.list.mockReturnValueOnce(throwError(() => ({ status: 503 })));
    const { component, harness, root } = await open();
    expect(root.textContent).toContain("No pudimos mostrar");
    component.load();
    harness.detectChanges();
    expect(root.textContent).toContain("Experiencia 1");
  });
  it("pagina usando el offset del servidor", async () => {
    api.list.mockReturnValue(of(page(8)));
    const { root } = await open();
    const next = Array.from(root.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Siguiente"),
    );
    next!.click();
    expect(api.list).toHaveBeenLastCalledWith(1, 6);
  });
  it("rechaza un curso inválido sin llamar a la API", async () => {
    const { root } = await open("0");
    expect(api.list).not.toHaveBeenCalled();
    expect(root.textContent).toContain("curso válido");
  });
  it("cambiar de curso cancela una lectura anterior", async () => {
    const pending = new Subject<ReviewPage>();
    api.list.mockReturnValueOnce(pending);
    const { harness, component } = await open();
    await harness.navigateByUrl("/comunidad/cursos/2", ReviewsPage);
    pending.next(page(0));
    harness.detectChanges();
    expect(component.courseId()).toBe(2);
    expect(component.data()?.total).toBe(2);
  });
});
