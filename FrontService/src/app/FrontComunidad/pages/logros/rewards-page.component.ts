import { DatePipe } from "@angular/common";
import { Component, OnDestroy, effect, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Subscription } from "rxjs";
import { Session } from "../../../core/auth/session.service";
import { environment } from "../../../../environments/environment";
import { RewardPage } from "../../models/reward";
import { CommunityApi } from "../../services/community-api.service";
import { communityError } from "../../services/community-error";

@Component({
  selector: "app-community-rewards",
  imports: [DatePipe, RouterLink],
  templateUrl: "./rewards-page.component.html",
  styleUrl: "../community-pages.scss",
})
export class RewardsPage implements OnDestroy {
  readonly session = inject(Session);
  readonly localSessions = environment.localSessions;
  private readonly api = inject(CommunityApi);
  readonly data = signal<RewardPage | null>(null);
  readonly loading = signal(false);
  readonly error = signal("");
  private request?: Subscription;

  constructor() {
    effect(() => {
      const account = this.session.account();
      this.request?.unsubscribe();
      this.data.set(null);
      this.error.set("");
      this.loading.set(false);
      if (account?.rol === "ESTUDIANTE") this.load();
    });
  }
  load(offset = 0): void {
    this.request?.unsubscribe();
    if (this.session.account()?.rol !== "ESTUDIANTE") return;
    this.loading.set(true);
    this.error.set("");
    this.request = this.api.rewards(offset).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(
          communityError(error, "No pudimos consultar tus logros."),
        );
        this.loading.set(false);
      },
    });
  }
  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }
}
