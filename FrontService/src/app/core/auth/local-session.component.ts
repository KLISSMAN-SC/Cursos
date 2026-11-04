import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { Session } from "./session.service";
import { communityError } from "../../FrontComunidad/services/community-error";
interface TestSessions {
  estudiante: string;
  administrador: string;
}
@Component({
  selector: "app-local-session",
  imports: [FormsModule, RouterLink],
  template: `<section class="panel local-session">
    <p class="eyebrow">HERRAMIENTA DE DESARROLLO LOCAL</p>
    <h1>Probar una sesión</h1>
    <p>
      Carga el archivo <strong>sesiones.json</strong> generado con la
      herramienta local. Cada token será verificado por el backend.
    </p>
    <label for="sessions-file">Archivo de sesiones de prueba</label
    ><input
      id="sessions-file"
      type="file"
      accept="application/json,.json"
      (change)="loadFile($event)"
      [disabled]="busy()"
    />
    @if (sessions(); as choices) {
      <div class="choices">
        <button
          class="primary-button"
          (click)="connect(choices.estudiante)"
          [disabled]="busy()"
        >
          Entrar como estudiante</button
        ><button
          class="secondary-button"
          (click)="connect(choices.administrador)"
          [disabled]="busy()"
        >
          Entrar como administrador
        </button>
      </div>
    }
    <details>
      <summary>O conectar un JWT directamente</summary>
      <form (ngSubmit)="connect(token)">
        <label for="token"
          >Token emitido por UsuarioService o por la herramienta de
          pruebas</label
        ><textarea
          id="token"
          name="token"
          [(ngModel)]="token"
          rows="5"
          required
          autocomplete="off"
          spellcheck="false"
          [disabled]="busy()"
        ></textarea
        ><button class="primary-button" [disabled]="busy() || !token.trim()">
          Conectar sesión
        </button>
      </form>
    </details>
    @if (busy()) {
      <p role="status">Verificando la sesión…</p>
    }
    @if (error()) {
      <p class="error-message" role="alert">{{ error() }}</p>
    }
    <p><a routerLink="/comunidad/cursos/1">← Volver a Comunidad</a></p>
    <p class="muted">
      Esta herramienta no está habilitada en la configuración de producción.
    </p>
  </section>`,
  styles: `
    .local-session {
      max-width: 640px;
      margin: 3rem auto;
    }
    .local-session h1 {
      font-family: Georgia, serif;
      font-weight: 400;
    }
    .local-session p {
      font-size: 0.85rem;
      line-height: 1.7;
    }
    .local-session a {
      font-size: 0.8rem;
      color: var(--forest);
    }
    .choices {
      display: flex;
      gap: 0.6rem;
      flex-wrap: wrap;
      margin: 1rem 0;
    }
    details {
      margin-top: 1.5rem;
    }
    summary {
      font-size: 0.8rem;
      color: var(--forest);
      cursor: pointer;
    }
    details form {
      margin-top: 1rem;
    }
    textarea {
      font-family: monospace;
      font-size: 0.8rem;
      overflow-wrap: anywhere;
    }
  `,
})
export class LocalSession {
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly error = signal("");
  readonly sessions = signal<TestSessions | null>(null);
  token = "";
  async loadFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.sessions.set(null);
    this.error.set("");
    if (!file) return;
    if (file.size > 16_384) {
      this.error.set("El archivo de sesiones es demasiado grande.");
      return;
    }
    try {
      const data: unknown = JSON.parse(await file.text());
      if (
        !data ||
        typeof data !== "object" ||
        !("estudiante" in data) ||
        !("administrador" in data) ||
        typeof data.estudiante !== "string" ||
        typeof data.administrador !== "string"
      )
        throw new Error();
      this.sessions.set({
        estudiante: data.estudiante,
        administrador: data.administrador,
      });
    } catch {
      this.error.set(
        "No se pudo leer el archivo de sesiones. Usa el sesiones.json generado localmente.",
      );
    }
  }
  connect(token: string): void {
    if (this.busy() || !token.trim()) return;
    this.busy.set(true);
    this.error.set("");
    this.session.connect(token).subscribe({
      next: () => {
        this.token = "";
        this.sessions.set(null);
        this.busy.set(false);
        void this.router.navigateByUrl("/comunidad/cursos/1");
      },
      error: (error) => {
        this.busy.set(false);
        this.error.set(
          communityError(error, "No pudimos conectar esta sesión."),
        );
      },
    });
  }
}
