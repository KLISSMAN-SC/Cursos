export interface Review {
  id: number;
  curso_id: number;
  estudiante_id: number;
  calificacion: number;
  comentario: string | null;
  creada_en: string;
  actualizada_en?: string | null;
}
export interface ReviewSummary {
  total: number;
  promedio: number | null;
  distribucion: Record<string, number>;
}
export interface ReviewPage {
  items: Review[];
  total: number;
  limit: number;
  offset: number;
  resumen: ReviewSummary;
}
export interface ReviewInput {
  curso_id: number;
  calificacion: number;
  comentario: string | null;
}
export interface OwnReview extends Review {
  oculta: boolean;
}
export interface Moderation {
  id: number;
  resena_id: number;
  administrador_id: number;
  motivo: string;
  moderada_en: string;
}
export interface AdminReview extends OwnReview {
  moderacion: Moderation | null;
}
export interface AdminReviewPage {
  items: AdminReview[];
  total: number;
  limit: number;
  offset: number;
}
