import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { USUARIOS_API } from "../../core/auth/session.service";
import { RegistroRequest } from "../models/registro-request";
import { Usuario } from "../models/usuario";

@Injectable({ providedIn: "root" })
export class UsuarioApi {
  private readonly http = inject(HttpClient);

  registrar(request: RegistroRequest) {
    // Construir el cuerpo explícitamente: no enviar confirmación, ID ni roles.
    return this.http.post<Usuario>(`${USUARIOS_API}/register`, {
      nombre: request.nombre,
      email: request.email,
      password: request.password,
    });
  }
}
