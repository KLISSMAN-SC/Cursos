import { Component, OnInit, inject } from "@angular/core";
import { RouterLink, RouterOutlet } from "@angular/router";
import { Session } from "./core/auth/session.service";
import { environment } from "../environments/environment";
@Component({
  selector: "app-root",
  imports: [RouterLink, RouterOutlet],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class App implements OnInit {
  readonly session = inject(Session);
  readonly localSessions = environment.localSessions;
  ngOnInit(): void {
    this.session.restore();
  }
}
