
package com.aulabreve.usuario.security;

import com.aulabreve.usuario.dto.RegistroRequest;
import com.aulabreve.usuario.dto.UsuarioResponse;
import com.aulabreve.usuario.service.UsuarioService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestBuilders.formLogin;
import static org.springframework.security.test.web.servlet.response.SecurityMockMvcResultMatchers.*;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Transactional
class AutenticacionTest {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private UsuarioService usuarioService;

    private MockMvc mockMvc;

    @BeforeEach
    void configurar() {

        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();
    }

    private UsuarioResponse crearUsuario() {

        String email = "auth-test-"
                + System.nanoTime()
                + "@example.invalid";

        return usuarioService.registrar(
                new RegistroRequest(
                        "Usuario Test",
                        email,
                        "AulaBreve2026!"
                )
        );
    }

    @Test
    void debeMostrarFormularioDeLogin() throws Exception {

        mockMvc.perform(get("/login"))
                .andExpect(status().isOk());
    }

    @Test
    void debeAutenticarConCredencialesCorrectas()
            throws Exception {

        UsuarioResponse usuario = crearUsuario();

        mockMvc.perform(
                formLogin()
                        .user(usuario.email())
                        .password("AulaBreve2026!")
        )

                .andExpect(authenticated()
                        .withUsername(
                                usuario.id().toString()
                        ));
    }

    @Test
    void debeRechazarContrasenaIncorrecta()
            throws Exception {

        UsuarioResponse usuario = crearUsuario();

        mockMvc.perform(
                formLogin()
                        .user(usuario.email())
                        .password("ContrasenaIncorrecta!")
        )

                .andExpect(unauthenticated())
                .andExpect(status().is3xxRedirection());
    }

    @Test
    void debePublicarConfiguracionOidc()
            throws Exception {

        mockMvc.perform(
                get("/.well-known/openid-configuration")
        )

                .andExpect(status().isOk())

                .andExpect(jsonPath("$.issuer")
                        .value("http://localhost:8081"))

                .andExpect(jsonPath("$.token_endpoint")
                        .exists());
    }

    @Test
    void debePublicarSolamenteClavePublica()
            throws Exception {

        mockMvc.perform(get("/oauth2/jwks"))

                .andExpect(status().isOk())

                .andExpect(jsonPath("$.keys[0].kty")
                        .value("RSA"))

                .andExpect(jsonPath("$.keys[0].n")
                        .exists())

                .andExpect(jsonPath("$.keys[0].d")
                        .doesNotExist());
    }
}
