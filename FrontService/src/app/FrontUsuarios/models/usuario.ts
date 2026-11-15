export type Rol =
  | "ESTUDIANTE"
  | "ADMIN_CATALOGO"
  | "MODERADOR_COMUNIDAD";

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
  roles: Rol[];
  fechaCreacion: string;
}