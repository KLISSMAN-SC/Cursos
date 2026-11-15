import { Routes } from "@angular/router";
import { ReviewsPage } from "./FrontComunidad/pages/resenas/reviews-page.component";

export const routes: Routes = [
  { path: "", pathMatch: "full", redirectTo: "comunidad/cursos/1" },
  { path: "comunidad/cursos/:cursoId", component: ReviewsPage },
  {
    path: "comunidad/logros",
    loadComponent: () => import("./FrontComunidad/pages/logros/rewards-page.component").then((m) => m.RewardsPage),
  },
  {
    path: "comunidad/moderacion",
    loadComponent: () => import("./FrontComunidad/pages/moderacion/moderation-page.component").then((m) => m.ModerationPage),
  },
  {
    path: "usuarios/ingreso",
    loadComponent: () => import("./FrontUsuarios/pages/ingreso/login-page.component").then((m) => m.LoginPage),
  },
  {
    path: "auth/callback",
    loadComponent: () => import("./FrontUsuarios/pages/ingreso/login-page.component").then((m) => m.LoginPage),
  },
  {
  path: "usuarios/registro",
  loadComponent: () =>
    import("./FrontUsuarios/pages/registro/register-page.component")
      .then((m) => m.RegisterPage),
  },
  { path: "desarrollo/sesion", pathMatch: "full", redirectTo: "usuarios/ingreso" },
  { path: "**", redirectTo: "comunidad/cursos/1" },
];
