import { Component, OnInit, inject } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { Session } from "./core/auth/session.service";

@Component({
  selector: "app-root",
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class App implements OnInit {
  readonly session = inject(Session);
  ngOnInit(): void {
    this.session.restore();
  }
}
