import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import {
  AdminReviewPage,
  OwnReview,
  Review,
  ReviewInput,
  ReviewPage,
} from "../models/review";
import { RewardPage } from "../models/reward";
@Injectable({ providedIn: "root" })
export class CommunityApi {
  private readonly http = inject(HttpClient);
  private readonly base = "/api/comunidad/api/v1";
  list(courseId: number, offset = 0) {
    const params = new HttpParams()
      .set("curso_id", courseId)
      .set("limit", 6)
      .set("offset", offset);
    return this.http.get<ReviewPage>(`${this.base}/resenas`, { params });
  }
  publish(data: ReviewInput) {
    return this.http.post<Review>(`${this.base}/resenas`, data);
  }
  hide(id: number, reason: string) {
    return this.http.patch<{ resena_id: number }>(
      `${this.base}/resenas/${id}/ocultar`,
      { motivo: reason.trim() },
    );
  }
  mine(courseId: number) {
    return this.http.get<OwnReview | null>(`${this.base}/resenas/mia`, {
      params: { curso_id: courseId },
    });
  }
  edit(id: number, data: Omit<ReviewInput, "curso_id">) {
    return this.http.patch<Review>(`${this.base}/resenas/${id}`, data);
  }
  rewards(offset = 0) {
    return this.http.get<RewardPage>(`${this.base}/mis-logros`, {
      params: { limit: 12, offset },
    });
  }
  moderation(state = "todas", courseId: number | null = null, offset = 0) {
    let params = new HttpParams()
      .set("estado", state)
      .set("limit", 12)
      .set("offset", offset);
    if (courseId !== null) params = params.set("curso_id", courseId);
    return this.http.get<AdminReviewPage>(`${this.base}/admin/resenas`, {
      params,
    });
  }
}
