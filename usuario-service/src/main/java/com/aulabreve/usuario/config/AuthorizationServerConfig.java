package com.aulabreve.usuario.config;

import com.aulabreve.usuario.model.CodigoRol;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.sql.init.dependency.DependsOnDatabaseInitialization;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.session.SessionRegistryImpl;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.oidc.OidcScopes;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.authorization.JdbcOAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.JdbcOAuth2AuthorizationConsentService;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationConsentService;
import org.springframework.security.oauth2.server.authorization.OAuth2TokenType;
import org.springframework.security.oauth2.server.authorization.client.JdbcRegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.settings.AuthorizationServerSettings;
import org.springframework.security.oauth2.server.authorization.settings.ClientSettings;
import org.springframework.security.oauth2.server.authorization.settings.TokenSettings;
import org.springframework.security.oauth2.server.authorization.token.JwtEncodingContext;
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenCustomizer;
import org.springframework.security.web.session.HttpSessionEventPublisher;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Duration;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.ArrayList;

@Configuration
public class AuthorizationServerConfig {
    @Value("${app.auth.issuer}")
    private String issuer;
    @Value("${app.auth.redirect-uri}")
    private String redirectUri;
    @Value("${app.auth.frontend-origin}")
    private String frontendOrigin;
    @Value("${app.auth.keystore-path}")
    private String keystorePath;
    @Value("${app.auth.keystore-password}")
    private String keystorePassword;
    @Value("${app.auth.keystore-alias}")
    private String keystoreAlias;

    // 1. Cliente Angular persistente
    @Bean
    @DependsOnDatabaseInitialization
    public RegisteredClientRepository registeredClientRepository(JdbcOperations jdbc) {
        JdbcRegisteredClientRepository repository = new JdbcRegisteredClientRepository(jdbc);
        RegisteredClient angularClient = RegisteredClient.withId("aulabreve-angular")
                .clientId("aulabreve-angular")
                .clientName("AulaBreve Angular")
                .clientAuthenticationMethod(ClientAuthenticationMethod.NONE)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri(redirectUri)
                .postLogoutRedirectUri(frontendOrigin + "/")
                .scope(OidcScopes.OPENID)
                .scope(OidcScopes.PROFILE)
                .scope("aulabreve.api")
                .clientSettings(ClientSettings.builder()
                        .requireProofKey(true)
                        .requireAuthorizationConsent(false)
                        .build())
                .tokenSettings(TokenSettings.builder()
                        .accessTokenTimeToLive(Duration.ofMinutes(15))
                        .authorizationCodeTimeToLive(Duration.ofMinutes(5))
                        .build())
                .build();
        RegisteredClient existente = repository.findByClientId("aulabreve-angular");
        if (existente == null) {
            repository.save(angularClient);
        } else if (!existente.getRedirectUris().equals(angularClient.getRedirectUris())
                || !existente.getPostLogoutRedirectUris().equals(angularClient.getPostLogoutRedirectUris())
                || !existente.getClientAuthenticationMethods().equals(angularClient.getClientAuthenticationMethods())
                || !existente.getAuthorizationGrantTypes().equals(angularClient.getAuthorizationGrantTypes())
                || !existente.getScopes().equals(angularClient.getScopes())
                || !existente.getClientSettings().isRequireProofKey()) {
            throw new IllegalStateException("El cliente OAuth2 persistido no coincide con la configuracion");
        }
        return repository;
    }

    // 2. Autorizaciones y consentimientos persistentes
    @Bean
    @DependsOnDatabaseInitialization
    public OAuth2AuthorizationService authorizationService(JdbcOperations jdbc,
            RegisteredClientRepository clients) {
        return new JdbcOAuth2AuthorizationService(jdbc, clients);
    }

    @Bean
    @DependsOnDatabaseInitialization
    public OAuth2AuthorizationConsentService authorizationConsentService(JdbcOperations jdbc,
            RegisteredClientRepository clients) {
        return new JdbcOAuth2AuthorizationConsentService(jdbc, clients);
    }

    // 3. Carga de RSA desde PKCS12; no generar una clave en cada arranque
    @Bean
    public JWKSource<SecurityContext> jwkSource() {
        char[] password = keystorePassword.toCharArray();
        try (InputStream input = Files.newInputStream(Path.of(keystorePath))) {
            KeyStore keyStore = KeyStore.getInstance("PKCS12");
            keyStore.load(input, password);
            RSAPrivateKey privateKey = (RSAPrivateKey) keyStore.getKey(keystoreAlias, password);
            RSAPublicKey publicKey = (RSAPublicKey) keyStore.getCertificate(keystoreAlias).getPublicKey();
            String keyId = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(publicKey.getEncoded()));
            RSAKey rsaKey = new RSAKey.Builder(publicKey)
                    .privateKey(privateKey).keyID(keyId).build();
            return new ImmutableJWKSet<>(new JWKSet(rsaKey));
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudieron cargar las claves RSA persistentes", ex);
        } finally {
            Arrays.fill(password, '\0');
        }
    }

    // 4. Decodificador compartido: firma, emisor y fechas
    @Bean
    public JwtDecoder jwtDecoder(JWKSource<SecurityContext> jwkSource) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSource(jwkSource)
                .jwsAlgorithm(SignatureAlgorithm.RS256).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(issuer));
        return decoder;
    }

    @Bean
    public AuthorizationServerSettings authorizationServerSettings() {
        return AuthorizationServerSettings.builder().issuer(issuer).build();
    }

    // 5. Claims exclusivos del access token
    @Bean
    public OAuth2TokenCustomizer<JwtEncodingContext>
    jwtTokenCustomizer() {

        return context -> {
        if (OAuth2TokenType.ACCESS_TOKEN.equals(context.getTokenType())) {
            Set<String> autoridades =
                    context.getPrincipal().getAuthorities().stream().map(GrantedAuthority::getAuthority).collect(Collectors.toSet());
            List<String> roles =
                    Arrays.stream(CodigoRol.values()).map(Enum::name).filter(autoridades::contains).sorted().collect(Collectors.toCollection(ArrayList::new));

            context.getClaims().claim("roles", roles).audience(new ArrayList<>(List.of("aulabreve-api")));
        }
    };
}

    // 6. Registro de sesiones OIDC (la sesion HTTP sigue en memoria)
    @Bean
    public SessionRegistry sessionRegistry() {
        return new SessionRegistryImpl();
    }

    @Bean
    public HttpSessionEventPublisher httpSessionEventPublisher() {
        return new HttpSessionEventPublisher();
    }
}
