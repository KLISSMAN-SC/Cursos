export interface Review {
  id: number;
  curso_id: number;
  estudiante_id: number;
  calificacion: number;
  comentario: string | null;
  creada_en: string;
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
