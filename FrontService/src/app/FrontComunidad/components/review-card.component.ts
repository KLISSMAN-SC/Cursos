import { DatePipe } from "@angular/common";
import {
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { Review } from "../models/review";
import { CommunityApi } from "../services/community-api.service";
import { communityError } from "../services/community-error";
@Component({
  selector: "app-review-card",
  imports: [DatePipe, FormsModule],
  templateUrl: "./review-card.component.html",
  styleUrl: "./review-card.component.scss",
})
export class ReviewCard {
  private readonly destroy = inject(DestroyRef);
  private readonly api = inject(CommunityApi);
  readonly review = input.required<Review>();
  readonly admin = input(false);
  readonly hidden = output<number>();
  readonly expanded = signal(false);
  readonly busy = signal(false);
  readonly error = signal("");
  reason = "";
  hide(): void {
    if (
      !this.admin() ||
      this.busy() ||
      !this.reason.trim() ||
      this.reason.trim().length > 1000
    )
      return;
    this.busy.set(true);
    this.error.set("");
    this.api
      .hide(this.review().id, this.reason)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.hidden.emit(this.review().id);
        },
        error: (error) => {
          this.busy.set(false);
          this.error.set(
            communityError(error, "No pudimos ocultar esta reseña."),
          );
        },
      });
  }
}
