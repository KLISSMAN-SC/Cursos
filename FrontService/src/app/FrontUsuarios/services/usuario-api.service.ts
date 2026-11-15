import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { USUARIOS_API } from "../../core/auth/session.service";
import { RegistroRequest } from "../models/registro-request";
import { ActualizarPerfilRequest } from "../models/actualizar-perfil-request";
import { Usuario } from "../models/usuario";
import { CambiarPasswordRequest } from
  "../models/cambiar-password-request";
@Injectable({ providedIn: "root" })
export class UsuarioApi {
  private readonly http = inject(HttpClient);

  registrar(request: RegistroRequest) {
    return this.http.post<Usuario>(`${USUARIOS_API}/register`, {
      nombre: request.nombre,
      email: request.email,
      password: request.password,
    });
  }

  actualizarPerfil(request: ActualizarPerfilRequest) {
    const body: ActualizarPerfilRequest = {};
    if (request.nombre !== undefined) body.nombre = request.nombre;
    if (request.email !== undefined) {
      body.email = request.email;
      if (request.passwordActual !== undefined) body.passwordActual = request.passwordActual;
    }
    return this.http.patch<Usuario>(`${USUARIOS_API}/me`, body);
  }
  cambiarPassword(request: CambiarPasswordRequest) {
  return this.http.post<void>(
    `${USUARIOS_API}/me/password`,
    request
  );
}
  
}
