package com.aulabreve.usuario.security;

import com.aulabreve.usuario.dto.RegistroRequest;
import com.aulabreve.usuario.dto.UsuarioResponse;
import com.aulabreve.usuario.service.UsuarioService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestBuilders.formLogin;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Transactional
class LoginPersonalizadoTest {
    @Autowired private WebApplicationContext context;
    @Autowired private UsuarioService usuarioService;
    @Value("${app.auth.redirect-uri}") private String redirectUri;
    @Value("${app.auth.frontend-origin}") private String frontendOrigin;
    private MockMvc mvc;

    @BeforeEach
    void configurar() {
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity()).build();
    }

    @Test
    void debeMostrarFormularioPersonalizadoConCsrf() throws Exception {
        mvc.perform(get("/login").accept(MediaType.TEXT_HTML))
                .andExpect(status().isOk())
                .andExpect(view().name("login"))
                .andExpect(content().string(containsString("AulaBreve")))
                .andExpect(content().string(containsString("action=\"/login\"")))
                .andExpect(content().string(containsString("name=\"username\"")))
                .andExpect(content().string(containsString("name=\"password\"")))
                .andExpect(content().string(containsString("name=\"_csrf\"")))
                .andExpect(content().string(containsString(frontendOrigin + "/usuarios/registro")));
    }

    @Test
    void debeServirCssSinAutenticacion() throws Exception {
        mvc.perform(get("/auth-assets/login.css"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.valueOf("text/css")))
                .andExpect(content().string(containsString("--forest")));
    }

    @Test
    void debeRechazarCredencialesInvalidas() throws Exception {
        mvc.perform(formLogin().user("no-existe-" + System.nanoTime() + "@example.invalid")
                        .password("ClaveIncorrecta2026!"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login?error"));
    }

        @Test
        void debeMostrarMensajeGenericoDeError() throws Exception {

        mvc.perform(get("/login?error")
                        .accept(MediaType.TEXT_HTML))
                .andExpect(status().isOk())
                .andExpect(view().name("login"))
                .andExpect(content().string(containsString(
                        "El correo o la contraseña no son correctos."
                )));
        }

    @Test
    void debeRechazarLoginSinCsrf() throws Exception {
        mvc.perform(post("/login").contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .formField("username", "prueba@example.invalid")
                        .formField("password", "AulaBreve2026!"))
                .andExpect(status().isForbidden());
    }

    @Test
    void debeContinuarAutorizacionTrasEnviarFormularioReal() throws Exception {
        UsuarioResponse usuario = usuarioService.registrar(new RegistroRequest(
                "Login Test", "login-test-" + System.nanoTime() + "@example.invalid",
                "AulaBreve2026!"));

        MvcResult solicitud = mvc.perform(get("/oauth2/authorize")
                        .accept(MediaType.TEXT_HTML)
                        .queryParam("response_type", "code")
                        .queryParam("client_id", "aulabreve-angular")
                        .queryParam("scope", "openid profile aulabreve.api")
                        .queryParam("redirect_uri", redirectUri)
                        .queryParam("code_challenge", "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")
                        .queryParam("code_challenge_method", "S256")
                        .queryParam("state", "login-test-state")
                        .queryParam("nonce", "login-test-nonce"))
                .andExpect(status().is3xxRedirection()).andReturn();
        assertThat(solicitud.getResponse().getRedirectedUrl()).endsWith("/login");
        MockHttpSession session = (MockHttpSession) solicitud.getRequest().getSession(false);
        assertThat(session).isNotNull();

        String html = mvc.perform(get("/login").session(session).accept(MediaType.TEXT_HTML))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        // Tomar el token CSRF que se renderizó en el formulario, no simularlo.
        Matcher campo = Pattern.compile("<input\\b(?=[^>]*\\bname=\"_csrf\")(?=[^>]*\\bvalue=\"([^\"]+)\")[^>]*>")
                .matcher(html);
        assertThat(campo.find()).isTrue();
        String csrf = campo.group(1);

        MvcResult login = mvc.perform(post("/login").session(session)
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .formField("username", usuario.email())
                        .formField("password", "AulaBreve2026!")
                        .formField("_csrf", csrf))
                .andExpect(status().is3xxRedirection()).andReturn();
        assertThat(login.getResponse().getRedirectedUrl())
                .contains("/oauth2/authorize");
    }
}
