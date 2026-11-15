package com.aulabreve.usuario.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import java.util.Locale;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ActualizarPerfilRequest(
        @Size(min = 1, max = 120, message = "Nombre invalido")
        String nombre,
        @Email(message = "Correo invalido")
        @Size(min = 1, max = 254, message = "Correo invalido")
        String email,
        @Size(max = 72, message = "Contrasena actual invalida")
        String passwordActual
) {
    public ActualizarPerfilRequest {
        if (nombre != null) nombre = nombre.strip();
        if (email != null) email = email.strip().toLowerCase(Locale.ROOT);
    }

    @Override
    public String toString() {
        return "ActualizarPerfilRequest[datos protegidos]";
    }
}
