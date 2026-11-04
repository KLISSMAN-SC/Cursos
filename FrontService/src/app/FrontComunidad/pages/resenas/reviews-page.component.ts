import {
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { Subscription } from "rxjs";
import { Session } from "../../../core/auth/session.service";
import { environment } from "../../../../environments/environment";
import { RatingSummary } from "../../components/rating-summary.component";
import { ReviewCard } from "../../components/review-card.component";
import { ReviewPage } from "../../models/review";
import { CommunityApi } from "../../services/community-api.service";
import { communityError } from "../../services/community-error";
@Component({
  selector: "app-community-reviews",
  imports: [FormsModule, RouterLink, RatingSummary, ReviewCard],
  templateUrl: "./reviews-page.component.html",
  styleUrl: "./reviews-page.component.scss",
})
export class ReviewsPage implements OnInit, OnDestroy {
  private readonly api = inject(CommunityApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  readonly session = inject(Session);
  readonly localSessions = environment.localSessions;
  readonly courseId = signal(0);
  readonly courseTitle = signal("");
  readonly data = signal<ReviewPage | null>(null);
  readonly loading = signal(true);
  readonly posting = signal(false);
  readonly error = signal("");
  readonly formError = signal("");
  readonly notice = signal("");
  rating = 5;
  comment = "";
  private loadRequest?: Subscription;
  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((params) => {
        const text = params.get("cursoId") || "";
        const id = /^[1-9][0-9]*$/.test(text) ? Number(text) : 0;
        this.courseId.set(Number.isSafeInteger(id) ? id : 0);
        this.courseTitle.set(
          this.route.snapshot.queryParamMap
            .get("titulo")
            ?.trim()
            .slice(0, 160) || "",
        );
        this.data.set(null);
        this.notice.set("");
        this.formError.set("");
        this.comment = "";
        this.rating = 5;
        this.load();
      });
  }
  load(offset = 0): void {
    this.loadRequest?.unsubscribe();
    if (!this.courseId()) {
      this.error.set("Selecciona un curso válido para consultar sus reseñas.");
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set("");
    this.loadRequest = this.api.list(this.courseId(), offset).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(communityError(error, "No pudimos cargar las reseñas."));
        this.loading.set(false);
      },
    });
  }
  publish(): void {
    if (
      this.session.account()?.rol !== "ESTUDIANTE" ||
      this.posting() ||
      !this.courseId()
    )
      return;
    if (
      !Number.isInteger(this.rating) ||
      this.rating < 1 ||
      this.rating > 5 ||
      this.comment.trim().length > 2000
    ) {
      this.formError.set(
        "Elige una calificación de 1 a 5 y un comentario de hasta 2000 caracteres.",
      );
      return;
    }
    const course = this.courseId();
    this.posting.set(true);
    this.formError.set("");
    this.notice.set("");
    this.api
      .publish({
        curso_id: course,
        calificacion: this.rating,
        comentario: this.comment.trim() || null,
      })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.posting.set(false);
          if (course !== this.courseId()) return;
          this.comment = "";
          this.rating = 5;
          this.notice.set(
            "Gracias por compartir tu experiencia. Tu reseña ya está publicada.",
          );
          this.load();
        },
        error: (error) => {
          this.posting.set(false);
          if (course !== this.courseId()) return;
          this.formError.set(
            communityError(error, "No pudimos publicar tu reseña."),
          );
        },
      });
  }
  reviewHidden(): void {
    const current = this.data();
    const offset =
      current && current.items.length === 1
        ? Math.max(0, current.offset - current.limit)
        : current?.offset || 0;
    this.notice.set("Reseña ocultada. El motivo quedó registrado.");
    this.load(offset);
  }
  ngOnDestroy(): void {
    this.loadRequest?.unsubscribe();
  }
}
