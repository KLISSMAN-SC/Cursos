import { DatePipe } from "@angular/common";
import { Component, OnDestroy, effect, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Subscription } from "rxjs";
import { Session } from "../../../core/auth/session.service";
import { environment } from "../../../../environments/environment";
import { ReviewCard } from "../../components/review-card.component";
import { AdminReviewPage } from "../../models/review";
import { CommunityApi } from "../../services/community-api.service";
import { communityError } from "../../services/community-error";

@Component({
  selector: "app-community-moderation",
  imports: [DatePipe, FormsModule, RouterLink, ReviewCard],
  templateUrl: "./moderation-page.component.html",
  styleUrl: "../community-pages.scss",
})
export class ModerationPage implements OnDestroy {
  readonly session = inject(Session);
  readonly localSessions = environment.localSessions;
  private readonly api = inject(CommunityApi);
  readonly data = signal<AdminReviewPage | null>(null);
  readonly loading = signal(false);
  readonly error = signal("");
  readonly notice = signal("");
  state = "todas";
  course = "";
  private request?: Subscription;

  constructor() {
    effect(() => {
      const account = this.session.account();
      this.request?.unsubscribe();
      this.data.set(null);
      this.error.set("");
      this.notice.set("");
      this.loading.set(false);
      if ((account?.roles.includes("MODERADOR_COMUNIDAD") ?? false)) this.load();
    });
  }
  load(offset = 0): void {
    if (!(this.session.account()?.roles.includes("MODERADOR_COMUNIDAD") ?? false)) return;
    const text = this.course.trim();
    const course = text ? Number(text) : null;
    if (
      text &&
      (!/^[1-9][0-9]*$/.test(text) || !Number.isSafeInteger(course))
    ) {
      this.error.set("Escribe un ID de curso entero y positivo.");
      return;
    }
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set("");
    this.request = this.api.moderation(this.state, course, offset).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(
          communityError(error, "No pudimos cargar las reseñas para moderar."),
        );
        this.loading.set(false);
      },
    });
  }
  reviewHidden(): void {
    const page = this.data();
    const offset =
      this.state === "visibles" && page?.items.length === 1
        ? Math.max(0, page.offset - page.limit)
        : page?.offset || 0;
    this.notice.set(
      "Reseña ocultada. El motivo quedó registrado en el historial.",
    );
    this.load(offset);
  }
  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }
}
