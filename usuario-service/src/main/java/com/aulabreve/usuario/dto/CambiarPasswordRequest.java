package com.aulabreve.usuario.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CambiarPasswordRequest(
        @NotBlank(message = "La contrasena actual es obligatoria")
        @Size(max = 72, message = "Contrasena actual invalida")
        String passwordActual,
        @NotBlank(message = "La nueva contrasena es obligatoria")
        @Size(min = 12, max = 72,
                message = "La nueva contrasena debe tener entre 12 y 72 caracteres")
        String passwordNueva
) {
    @Override
    public String toString() {
        return "CambiarPasswordRequest[datos protegidos]";
    }
}
