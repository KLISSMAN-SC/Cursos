import { Routes } from "@angular/router";
import { environment } from "../environments/environment";
import { ReviewsPage } from "./FrontComunidad/pages/resenas/reviews-page.component";
export const routes: Routes = [
  { path: "", pathMatch: "full", redirectTo: "comunidad/cursos/1" },
  { path: "comunidad/cursos/:cursoId", component: ReviewsPage },
  ...(environment.localSessions
    ? [
        {
          path: "desarrollo/sesion",
          loadComponent: () =>
            import("./core/auth/local-session.component").then(
              (m) => m.LocalSession,
            ),
        },
      ]
    : []),
  { path: "**", redirectTo: "comunidad/cursos/1" },
];
