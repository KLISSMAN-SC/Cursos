
package com.aulabreve.usuario.dto;

import com.aulabreve.usuario.model.Usuario;

import java.time.OffsetDateTime;
import java.util.List;

public record UsuarioResponse(

        Integer id,
        String nombre,
        String email,
        boolean activo,
        List<String> roles,
        OffsetDateTime fechaCreacion

) {

    public static UsuarioResponse desde(Usuario usuario) {

        return new UsuarioResponse(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getEmail(),
                usuario.isActivo(),

                usuario.getRoles()
                        .stream()
                        .map(rol -> rol.getCodigo().name())
                        .sorted()
                        .toList(),

                usuario.getFechaCreacion()
        );
    }
}
