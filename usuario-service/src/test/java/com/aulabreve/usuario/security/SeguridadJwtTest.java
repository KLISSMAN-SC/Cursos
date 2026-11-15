package com.aulabreve.usuario.security;

import com.aulabreve.usuario.dto.RegistroRequest;
import com.aulabreve.usuario.dto.UsuarioResponse;
import com.aulabreve.usuario.service.UsuarioService;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.authorization.OAuth2Authorization;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.jayway.jsonpath.JsonPath;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.web.util.UriComponentsBuilder;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestBuilders.formLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest
@Transactional
class SeguridadJwtTest {
    @Autowired private WebApplicationContext context;
    @Autowired private UsuarioService usuarioService;
    @Autowired private JWKSource<SecurityContext> jwkSource;
    @Autowired private RegisteredClientRepository registeredClientRepository;
    @Autowired private OAuth2AuthorizationService authorizationService;
    @Value("${app.auth.issuer}") private String issuer;
    private MockMvc mockMvc;

    @BeforeEach
    void configurar() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    private UsuarioResponse crearUsuario() {
        return usuarioService.registrar(new RegistroRequest("Usuario JWT Test",
                "jwt-test-" + System.nanoTime() + "@example.invalid", "AulaBreve2026!"));
    }

    private String generarToken(Integer usuarioId, String emisor, String audiencia,
                                Instant vencimiento, List<String> scopes) {
        NimbusJwtEncoder encoder = new NimbusJwtEncoder(jwkSource);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(emisor).subject(usuarioId.toString()).audience(List.of(audiencia))
                .issuedAt(vencimiento.minusSeconds(900)).expiresAt(vencimiento)
                .claim("scope", scopes).claim("roles", List.of("ESTUDIANTE")).build();
        JwsHeader header = JwsHeader.with(SignatureAlgorithm.RS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    private String tokenValido(Integer usuarioId) {
        return generarToken(usuarioId, issuer, "aulabreve-api", Instant.now().plusSeconds(300),
                List.of("openid", "aulabreve.api"));
    }

@Test
void debeConsultarUserInfoConAutorizacionPersistida()
        throws Exception {

    UsuarioResponse usuario = crearUsuario();

    String verifier =
            "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";

    String challenge =
            "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

    String redirectUri =
            "http://localhost:4200/auth/callback";

    // 1. Autenticar al usuario
    MockHttpSession session = (MockHttpSession)
            mockMvc.perform(
                    formLogin()
                            .user(usuario.email())
                            .password("AulaBreve2026!")
            )
            .andExpect(status().is3xxRedirection())
            .andReturn()
            .getRequest()
            .getSession(false);

    assertThat(session).isNotNull();

    // 2. Solicitar codigo OAuth2 con PKCE
    String redirect = mockMvc.perform(
        get("/oauth2/authorize")
                .session(session)
                .queryParam("response_type", "code")
                .queryParam("client_id", "aulabreve-angular")
                .queryParam("scope",
                        "openid profile aulabreve.api")
                .queryParam("redirect_uri", redirectUri)
                .queryParam("code_challenge", challenge)
                .queryParam("code_challenge_method", "S256")
                .queryParam("state", "test-state")
                .queryParam("nonce", "test-nonce")
)
        .andExpect(status().is3xxRedirection())
        .andReturn()
        .getResponse()
        .getRedirectedUrl();

    assertThat(redirect).isNotNull();

    String code = UriComponentsBuilder
            .fromUriString(redirect)
            .build()
            .getQueryParams()
            .getFirst("code");

    assertThat(code).isNotBlank();

    // 3. Intercambiar codigo por tokens
    String respuesta = mockMvc.perform(
        post("/oauth2/token")
                .contentType(
                        MediaType.APPLICATION_FORM_URLENCODED
                )
                .formField("grant_type", "authorization_code")
                .formField("client_id", "aulabreve-angular")
                .formField("redirect_uri", redirectUri)
                .formField("code", code)
                .formField("code_verifier", verifier)
)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.access_token").exists())
        .andExpect(jsonPath("$.id_token").exists())
        .andReturn()
        .getResponse()
        .getContentAsString();

    String accessToken = JsonPath.read(
            respuesta, "$.access_token"
    );

    // 4. Consultar UserInfo con el token emitido
    mockMvc.perform(
            get("/userinfo")
                    .header(
                            "Authorization",
                            "Bearer " + accessToken
                    )
    )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.sub")
                    .value(usuario.id().toString()));

    // 5. Comprobar tambien nuestra API protegida
    mockMvc.perform(
            get("/api/v1/users/me")
                    .header(
                            "Authorization",
                            "Bearer " + accessToken
                    )
    )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id")
                    .value(usuario.id()));
}


    @Test
    void debeEncontrarClienteAngularPersistente() {
        RegisteredClient cliente = registeredClientRepository.findByClientId("aulabreve-angular");
        assertThat(cliente).isNotNull();
        assertThat(cliente.getClientSettings().isRequireProofKey()).isTrue();
        assertThat(cliente.getAuthorizationGrantTypes()).contains(AuthorizationGrantType.AUTHORIZATION_CODE);
    }

    @Test
    void debePersistirAutorizacionesOAuth2() {
        UsuarioResponse usuario = crearUsuario();
        RegisteredClient cliente = registeredClientRepository.findByClientId("aulabreve-angular");
        String id = "test-" + System.nanoTime();
        OAuth2Authorization authorization = OAuth2Authorization.withRegisteredClient(cliente)
                .id(id).principalName(usuario.id().toString())
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .authorizedScopes(Set.of("openid", "aulabreve.api")).build();
        authorizationService.save(authorization);
        OAuth2Authorization recuperada = authorizationService.findById(id);
        assertThat(recuperada).isNotNull();
        assertThat(recuperada.getPrincipalName()).isEqualTo(usuario.id().toString());
    }

    @Test
    void debeConsultarPerfilConTokenValido() throws Exception {
        UsuarioResponse usuario = crearUsuario();
        mockMvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + tokenValido(usuario.id())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(usuario.id()))
                .andExpect(jsonPath("$.email").value(usuario.email()))
                .andExpect(jsonPath("$.roles[0]").value("ESTUDIANTE"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void debeRechazarSolicitudSinToken() throws Exception {
        mockMvc.perform(get("/api/v1/users/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void debeRechazarTokenConAudienciaIncorrecta() throws Exception {
        UsuarioResponse usuario = crearUsuario();
        String token = generarToken(usuario.id(), issuer, "otra-api", Instant.now().plusSeconds(300),
                List.of("aulabreve.api"));
        mockMvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void debeRechazarTokenVencido() throws Exception {
        UsuarioResponse usuario = crearUsuario();
        String token = generarToken(usuario.id(), issuer, "aulabreve-api", Instant.now().minusSeconds(300),
                List.of("aulabreve.api"));
        mockMvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void debeRechazarTokenConFirmaAlterada() throws Exception {
        UsuarioResponse usuario = crearUsuario();
        String[] partes = tokenValido(usuario.id()).split("\\.");
        char reemplazo = partes[2].charAt(0) == 'A' ? 'B' : 'A';
        partes[2] = reemplazo + partes[2].substring(1);
        mockMvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + String.join(".", partes)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void debeRechazarEmisorIncorrecto() throws Exception {
        UsuarioResponse usuario = crearUsuario();
        String token = generarToken(usuario.id(), "http://emisor-incorrecto.example", "aulabreve-api",
                Instant.now().plusSeconds(300), List.of("aulabreve.api"));
        mockMvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void debeRechazarTokenSinScopeRequerido() throws Exception {
        UsuarioResponse usuario = crearUsuario();
        String token = generarToken(usuario.id(), issuer, "aulabreve-api", Instant.now().plusSeconds(300),
                List.of("openid"));
        mockMvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }
}
