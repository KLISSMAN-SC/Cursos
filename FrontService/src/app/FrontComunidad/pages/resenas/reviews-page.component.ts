import {
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  inject,
  effect,
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
import { OwnReview, ReviewPage } from "../../models/review";
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
  readonly own = signal<OwnReview | null>(null);
  readonly ownLoading = signal(false);
  readonly ownError = signal("");
  readonly editing = signal(false);
  rating = 5;
  comment = "";
  private loadRequest?: Subscription;
  private ownRequest?: Subscription;
  constructor() {
    effect(() => {
      const course = this.courseId();
      const account = this.session.account();
      this.ownRequest?.unsubscribe();
      this.own.set(null);
      this.ownError.set("");
      this.editing.set(false);
      this.comment = "";
      this.rating = 5;
      if (course && account && account.roles.includes("ESTUDIANTE")) {
    this.loadOwn(course, account.id);
    } else {
    this.own.set(null);
    this.ownLoading.set(false);
    }
      
    });
  }
  loadOwn(
    course = this.courseId(),
    student = this.session.account()?.id,
  ): void {
    this.ownRequest?.unsubscribe();
    if (!course || !student || !(this.session.account()?.roles.includes("ESTUDIANTE") ?? false))
      return;
    this.ownLoading.set(true);
    this.ownError.set("");
    this.ownRequest = this.api.mine(course).subscribe({
      next: (review) => {
        if (
          course !== this.courseId() ||
          student !== this.session.account()?.id
        )
          return;
        this.own.set(review);
        this.ownLoading.set(false);
      },
      error: (error) => {
        if (
          course !== this.courseId() ||
          student !== this.session.account()?.id
        )
          return;
        this.ownLoading.set(false);
        this.ownError.set(
          communityError(error, "No pudimos consultar tu reseña."),
        );
      },
    });
  }
  beginEdit(): void {
    const review = this.own();
    if (!review || review.oculta || this.posting()) return;
    this.rating = review.calificacion;
    this.comment = review.comentario || "";
    this.formError.set("");
    this.editing.set(true);
  }
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
      !(this.session.account()?.roles.includes("ESTUDIANTE") ?? false) ||
      this.posting() ||
      !this.courseId() ||
      this.ownLoading() ||
      this.ownError() ||
      (this.own() && !this.own()?.oculta && !this.editing())
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
    const student = this.session.account()?.id;
    const editing = this.editing();
    this.posting.set(true);
    this.formError.set("");
    this.notice.set("");
    const input = {
      curso_id: course,
      calificacion: this.rating,
      comentario: this.comment.trim() || null,
    };
    const request =
      editing && this.own()
        ? this.api.edit(this.own()!.id, {
            calificacion: input.calificacion,
            comentario: input.comentario,
          })
        : this.api.publish(input);
    request.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: () => {
        this.posting.set(false);
        if (
          course !== this.courseId() ||
          student !== this.session.account()?.id
        )
          return;
        this.comment = "";
        this.rating = 5;
        this.notice.set(
          editing
            ? "Tu reseña fue actualizada."
            : "Gracias por compartir tu experiencia. Tu reseña ya está publicada.",
        );
        this.editing.set(false);
        this.loadOwn();
        this.load();
      },
      error: (error) => {
        this.posting.set(false);
        if (
          course !== this.courseId() ||
          student !== this.session.account()?.id
        )
          return;
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
    this.ownRequest?.unsubscribe();
  }
}
