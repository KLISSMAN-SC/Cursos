export interface Reward {
  id: number;
  curso_id: number;
  version_curso: number;
  modulo_id: number;
  regla: string;
  insignia: string;
  puntos: number;
  obtenida_en: string;
}
export interface RewardPage {
  items: Reward[];
  total: number;
  puntos: number;
  limit: number;
  offset: number;
}
