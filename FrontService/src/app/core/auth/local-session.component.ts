import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";

// Ruta anterior de laboratorio. No permite importar tokens ni crear sesiones.
@Component({
  selector: "app-local-session",
  imports: [RouterLink],
  template: `<section class="panel"><h1>Inicia sesión en AulaBreve</h1>
    <p>La herramienta de sesión manual fue sustituida por UsuarioService.</p>
    <a routerLink="/usuarios/ingreso">Ir a iniciar sesión</a></section>`,
})
export class LocalSession {}
