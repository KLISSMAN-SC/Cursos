
package com.aulabreve.usuario.controller;

import com.aulabreve.usuario.model.Usuario;
import com.aulabreve.usuario.repository.UsuarioRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Transactional
class UsuarioRegistroTest {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private MockMvc mockMvc;

   @BeforeEach
        void configurar() {

        mockMvc = MockMvcBuilders
            .webAppContextSetup(context)
            .apply(springSecurity())
            .build();
}

    private String generarEmail() {
        return "test-" + System.nanoTime()
                + "@example.invalid";
    }

    private String generarJson(String email) {

        return """
                {
                    "nombre": "Estudiante Test",
                    "email": "%s",
                    "password": "AulaBreve2026!"
                }
                """.formatted(email);
    }

    @Test
    void debeRegistrarEstudianteCorrectamente()
            throws Exception {

        String email = generarEmail();

        mockMvc.perform(post("/api/v1/users/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(generarJson(email)))

                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.roles[0]").value("ESTUDIANTE"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.password").doesNotExist());

        Usuario usuario = usuarioRepository
                .findByEmail(email)
                .orElseThrow();

        assertThat(usuario.getPasswordHash())
                .isNotEqualTo("AulaBreve2026!");

        assertThat(passwordEncoder.matches(
                "AulaBreve2026!",
                usuario.getPasswordHash()
        )).isTrue();
    }

    @Test
    void debeRechazarCorreoDuplicado()
            throws Exception {

        String email = generarEmail();
        String json = generarJson(email);

        mockMvc.perform(post("/api/v1/users/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/users/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isConflict());
    }

    @Test
    void debeRechazarDatosInvalidos()
            throws Exception {

        String json = """
                {
                    "nombre": "",
                    "email": "incorrecto",
                    "password": "123"
                }
                """;

        mockMvc.perform(post("/api/v1/users/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))

                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.nombre").exists())
                .andExpect(jsonPath("$.errores.email").exists())
                .andExpect(jsonPath("$.errores.password").exists());
    }

    @Test
    void noDebePermitirRegistroComoAdministrador()
            throws Exception {

        String json = """
                {
                    "nombre": "Prueba Roles",
                    "email": "%s",
                    "password": "AulaBreve2026!",
                    "roles": ["ADMIN_CATALOGO"]
                }
                """.formatted(generarEmail());

        mockMvc.perform(post("/api/v1/users/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))

                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.roles.length()").value(1))
                .andExpect(jsonPath("$.roles[0]").value("ESTUDIANTE"));
    }

    @Test
    void debeRechazarPasswordMayorA72Bytes()
            throws Exception {

        String json = """
                {
                    "nombre": "Prueba Password",
                    "email": "%s",
                    "password": "%s"
                }
                """.formatted(
                        generarEmail(),
                        "é".repeat(40)
                );

        mockMvc.perform(post("/api/v1/users/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))

                .andExpect(status().isBadRequest());
    }
}
