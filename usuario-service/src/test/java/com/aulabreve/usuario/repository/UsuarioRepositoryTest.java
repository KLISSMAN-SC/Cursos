
package com.aulabreve.usuario.repository;

import com.aulabreve.usuario.model.CodigoRol;
import com.aulabreve.usuario.model.Rol;
import com.aulabreve.usuario.model.Usuario;

import jakarta.persistence.EntityManager;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class UsuarioRepositoryTest {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void debeEncontrarLosTresRolesIniciales() {

        assertThat(rolRepository.findAll())
                .extracting(Rol::getCodigo)
                .containsExactlyInAnyOrder(
                        CodigoRol.ESTUDIANTE,
                        CodigoRol.ADMIN_CATALOGO,
                        CodigoRol.MODERADOR_COMUNIDAD
                );
    }

    @Test
    void debeGuardarUsuarioConVariosRoles() {

        Rol estudiante = rolRepository
                .findByCodigo(CodigoRol.ESTUDIANTE)
                .orElseThrow();

        Rol moderador = rolRepository
                .findByCodigo(CodigoRol.MODERADOR_COMUNIDAD)
                .orElseThrow();

        String email = "prueba-"
                + System.nanoTime()
                + "@example.invalid";

        Usuario usuario = new Usuario(
                "Usuario de prueba",
                email,
                "hash-ficticio-solo-para-pruebas"
        );

        usuario.asignarRol(estudiante);
        usuario.asignarRol(moderador);

        Usuario guardado =
                usuarioRepository.saveAndFlush(usuario);

        Integer id = guardado.getId();

        entityManager.clear();

        Usuario encontrado = usuarioRepository
                .findByEmail(email)
                .orElseThrow();

        assertThat(id).isNotNull();

        assertThat(encontrado.getId())
                .isEqualTo(id);

        assertThat(encontrado.isActivo())
                .isTrue();

        assertThat(encontrado.getRoles())
                .extracting(Rol::getCodigo)
                .containsExactlyInAnyOrder(
                        CodigoRol.ESTUDIANTE,
                        CodigoRol.MODERADOR_COMUNIDAD
                );

        assertThat(usuarioRepository.existsByEmail(email))
                .isTrue();

        assertThat(encontrado.getFechaCreacion())
                .isNotNull();
    }
}
