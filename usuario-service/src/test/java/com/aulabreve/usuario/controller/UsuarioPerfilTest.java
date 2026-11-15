package com.aulabreve.usuario.controller;

import com.aulabreve.usuario.dto.RegistroRequest;
import com.aulabreve.usuario.dto.UsuarioResponse;
import com.aulabreve.usuario.model.CodigoRol;
import com.aulabreve.usuario.model.Usuario;
import com.aulabreve.usuario.repository.UsuarioRepository;
import com.aulabreve.usuario.security.UsuarioDetailsService;
import com.aulabreve.usuario.service.UsuarioService;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Transactional
class UsuarioPerfilTest {
    private static final String PASSWORD = "AulaBreve2026!";
    private static final String NUEVA = "NuevaClaveDemo2026!";

    @Autowired private WebApplicationContext context;
    @Autowired private UsuarioService usuarioService;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private UsuarioDetailsService usuarioDetailsService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JWKSource<SecurityContext> jwkSource;
    @Autowired private EntityManager entityManager;
    @Value("${app.auth.issuer}") private String issuer;
    private MockMvc mockMvc;

    @BeforeEach
    void configurar() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    private String email() {
        return "perfil-test-" + System.nanoTime() + "@example.invalid";
    }

    private RegistroRequest registro() {
        return new RegistroRequest("Usuario Perfil", email(), PASSWORD);
    }

    private UsuarioResponse estudiante() {
        return usuarioService.registrar(registro());
    }

    private Usuario cargar(Integer id) {
        entityManager.flush();
        entityManager.clear();
        return usuarioRepository.findById(id).orElseThrow();
    }

    private String bearer(UsuarioResponse usuario, List<String> roles) {
        Instant ahora = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer).subject(usuario.id().toString())
                .audience(List.of("aulabreve-api"))
                .issuedAt(ahora).expiresAt(ahora.plusSeconds(300))
                .claim("scope", List.of("aulabreve.api"))
                .claim("roles", roles).build();
        String token = new NimbusJwtEncoder(jwkSource).encode(JwtEncoderParameters.from(
                JwsHeader.with(SignatureAlgorithm.RS256).build(), claims)).getTokenValue();
        return "Bearer " + token;
    }

    private String bearer(UsuarioResponse usuario) {
        return bearer(usuario, usuario.roles());
    }

    @Test
    void debeActualizarNombreSinCambiarIdNiRoles() throws Exception {
        UsuarioResponse usuario = estudiante();
        UsuarioResponse otro = estudiante();
        mockMvc.perform(patch("/api/v1/users/me").header("Authorization", bearer(usuario))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Nombre actualizado", "id":%d, "roles":["ADMIN_CATALOGO"]}
                        """.formatted(otro.id())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(usuario.id()))
                .andExpect(jsonPath("$.nombre").value("Nombre actualizado"))
                .andExpect(jsonPath("$.roles.length()").value(1))
                .andExpect(jsonPath("$.roles[0]").value("ESTUDIANTE"));
        assertThat(cargar(usuario.id()).getNombre()).isEqualTo("Nombre actualizado");
        assertThat(cargar(otro.id()).getNombre()).isEqualTo(otro.nombre());
    }

    @Test
    void debeCambiarCorreoConPasswordActual() throws Exception {
        UsuarioResponse usuario = estudiante();
        String nuevoEmail = email();
        mockMvc.perform(patch("/api/v1/users/me").header("Authorization", bearer(usuario))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"%s", "passwordActual":"%s"}
                        """.formatted(nuevoEmail.toUpperCase(java.util.Locale.ROOT), PASSWORD)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.email").value(nuevoEmail))
                .andExpect(jsonPath("$.id").value(usuario.id()));
        assertThat(cargar(usuario.id()).getEmail()).isEqualTo(nuevoEmail);
        assertThat(usuarioRepository.existsByEmail(usuario.email())).isFalse();
    }

    @Test
    void debeRechazarCambioCorreoSinPasswordCorrecta() throws Exception {
        UsuarioResponse usuario = estudiante();
        mockMvc.perform(patch("/api/v1/users/me").header("Authorization", bearer(usuario))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"%s", "passwordActual":"incorrecta"}
                        """.formatted(email())))
                .andExpect(status().isForbidden());
        assertThat(cargar(usuario.id()).getEmail()).isEqualTo(usuario.email());
    }

    @Test
    void debeRechazarCorreoDuplicadoEnPerfil() throws Exception {
        UsuarioResponse usuario = estudiante();
        UsuarioResponse otro = estudiante();
        mockMvc.perform(patch("/api/v1/users/me").header("Authorization", bearer(usuario))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"%s", "passwordActual":"%s"}
                        """.formatted(otro.email(), PASSWORD)))
                .andExpect(status().isConflict());
    }

    @Test
    void debeRechazarPerfilVacio() throws Exception {
        UsuarioResponse usuario = estudiante();
        mockMvc.perform(patch("/api/v1/users/me").header("Authorization", bearer(usuario))
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    private String jsonPassword(String actual, String nueva) {
        return """
                {"passwordActual":"%s", "passwordNueva":"%s"}
                """.formatted(actual, nueva);
    }

    @Test
    void debeCambiarPasswordYVerificarHash() throws Exception {
        UsuarioResponse usuario = estudiante();
        mockMvc.perform(post("/api/v1/users/me/password").header("Authorization", bearer(usuario))
                .contentType(MediaType.APPLICATION_JSON).content(jsonPassword(PASSWORD, NUEVA)))
                .andExpect(status().isNoContent());
        String hash = cargar(usuario.id()).getPasswordHash();
        assertThat(passwordEncoder.matches(NUEVA, hash)).isTrue();
        assertThat(passwordEncoder.matches(PASSWORD, hash)).isFalse();
    }

    @Test
    void debeRechazarPasswordActualIncorrecta() throws Exception {
        UsuarioResponse usuario = estudiante();
        mockMvc.perform(post("/api/v1/users/me/password").header("Authorization", bearer(usuario))
                .contentType(MediaType.APPLICATION_JSON).content(jsonPassword("incorrecta", NUEVA)))
                .andExpect(status().isForbidden());
        assertThat(passwordEncoder.matches(PASSWORD, cargar(usuario.id()).getPasswordHash())).isTrue();
    }

    @Test
    void debeRechazarPasswordNuevaIgualALaActual() throws Exception {
        UsuarioResponse usuario = estudiante();
        mockMvc.perform(post("/api/v1/users/me/password").header("Authorization", bearer(usuario))
                .contentType(MediaType.APPLICATION_JSON).content(jsonPassword(PASSWORD, PASSWORD)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void debeRechazarPasswordNuevaMayorA72Bytes() throws Exception {
        UsuarioResponse usuario = estudiante();
        mockMvc.perform(post("/api/v1/users/me/password").header("Authorization", bearer(usuario))
                .contentType(MediaType.APPLICATION_JSON).content(jsonPassword(PASSWORD, "é".repeat(40))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void debeRechazarCambiosSinToken() throws Exception {
        mockMvc.perform(patch("/api/v1/users/me").contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Otro\"}")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/users/me/password").contentType(MediaType.APPLICATION_JSON)
                .content(jsonPassword(PASSWORD, NUEVA))).andExpect(status().isUnauthorized());
    }

    @Test
    void debeRechazarTokenSinRolReconocido() throws Exception {
        UsuarioResponse usuario = estudiante();
        mockMvc.perform(get("/api/v1/users/me").header("Authorization", bearer(usuario, List.of())))
                .andExpect(status().isForbidden());
    }

    @Test
    void debeProvisionarAdminYModeradorConRolesSeparados() throws Exception {
        for (CodigoRol rol : List.of(CodigoRol.ADMIN_CATALOGO, CodigoRol.MODERADOR_COMUNIDAD)) {
            UsuarioResponse usuario = usuarioService.provisionarCuenta(registro(), rol);
            assertThat(usuario.roles()).containsExactly(rol.name());
            assertThat(usuarioDetailsService.loadUserByUsername(usuario.email()).getAuthorities())
                    .extracting(GrantedAuthority::getAuthority).containsExactly(rol.name());
            mockMvc.perform(get("/api/v1/users/me").header("Authorization", bearer(usuario)))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.roles[0]").value(rol.name()));
        }
    }

    @Test
    void noDebeElevarUnaCuentaExistenteDesdeProvision() {
        UsuarioResponse usuario = estudiante();
        assertThatThrownBy(() -> usuarioService.provisionarCuenta(
                new RegistroRequest(usuario.nombre(), usuario.email(), PASSWORD), CodigoRol.ADMIN_CATALOGO))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatusCode().value()).isEqualTo(409));
        assertThat(usuarioRepository.findByEmail(usuario.email()).orElseThrow().getRoles())
                .extracting(rol -> rol.getCodigo()).containsExactly(CodigoRol.ESTUDIANTE);
    }

    @Test
    void debeRechazarRolEstudianteEnProvision() {
        assertThatThrownBy(() -> usuarioService.provisionarCuenta(registro(), CodigoRol.ESTUDIANTE))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatusCode().value()).isEqualTo(400));
    }
}
