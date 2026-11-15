import { Routes } from "@angular/router";
import { environment } from "../environments/environment";
import { ReviewsPage } from "./FrontComunidad/pages/resenas/reviews-page.component";
export const routes: Routes = [
  { path: "", pathMatch: "full", redirectTo: "comunidad/cursos/1" },
  { path: "comunidad/cursos/:cursoId", component: ReviewsPage },
  {
    path: "comunidad/logros",
    loadComponent: () =>
      import("./FrontComunidad/pages/logros/rewards-page.component").then(
        (m) => m.RewardsPage,
      ),
  },
  {
    path: "comunidad/moderacion",
    loadComponent: () =>
      import("./FrontComunidad/pages/moderacion/moderation-page.component").then(
        (m) => m.ModerationPage,
      ),
  },
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
