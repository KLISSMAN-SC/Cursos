import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Session } from "../../../core/auth/session.service";

@Component({
  selector: "app-login-page",
  standalone: true,
  imports: [RouterLink],
  templateUrl: "./login-page.component.html",
  styleUrl: "./login-page.component.scss",
})
export class LoginPage {
  readonly session = inject(Session);
}