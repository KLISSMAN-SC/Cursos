
package com.aulabreve.usuario.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Locale;

@JsonIgnoreProperties(ignoreUnknown = true)
public record RegistroRequest(

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 120,
                message = "El nombre no debe superar 120 caracteres")
        String nombre,

        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "El correo no tiene un formato valido")
        @Size(max = 254,
                message = "El correo no debe superar 254 caracteres")
        String email,

        @NotBlank(message = "La contrasena es obligatoria")
        @Size(min = 12, max = 72,
                message = "La contrasena debe tener entre 12 y 72 caracteres")
        String password

) {

    public RegistroRequest {

        if (nombre != null) {
            nombre = nombre.strip();
        }

        if (email != null) {
            email = email.strip().toLowerCase(Locale.ROOT);
        }
    }

    @Override
    public String toString() {
        return "RegistroRequest[datos protegidos]";
    }
}
