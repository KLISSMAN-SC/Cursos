import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Review, ReviewInput, ReviewPage } from "../models/review";
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
}
