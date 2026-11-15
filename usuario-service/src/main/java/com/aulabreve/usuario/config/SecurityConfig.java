package com.aulabreve.usuario.config;

import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidationException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.authentication.DelegatingJwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;
import org.springframework.security.web.util.matcher.MediaTypeRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    @Value("${app.auth.frontend-origin}")
    private String frontendOrigin;

    // 1. Protocolo OAuth2/OIDC
    @Bean
    @Order(1)
    public SecurityFilterChain authorizationServerChain(HttpSecurity http) throws Exception {
        http.oauth2AuthorizationServer(server -> {
                    http.securityMatcher(server.getEndpointsMatcher());
                    server.oidc(Customizer.withDefaults());
                })
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                .exceptionHandling(exceptions -> exceptions.defaultAuthenticationEntryPointFor(
                        new LoginUrlAuthenticationEntryPoint("/login"),
                        new MediaTypeRequestMatcher(MediaType.TEXT_HTML)));
        return http.build();
    }

    // 2. API REST: solo Bearer, sin sesion HTTP ni CSRF basado en cookies
    @Bean
    @Order(2)
    public SecurityFilterChain apiSecurityChain(HttpSecurity http, JwtDecoder jwtDecoder) throws Exception {
        http.securityMatcher("/api/**", "/actuator/**")
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(cache -> cache.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/v1/users/register").permitAll()
                        .requestMatchers(HttpMethod.GET, "/actuator/health", "/actuator/health/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/users/me").hasAuthority("SCOPE_aulabreve.api")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/users/me")
                        .hasAuthority("SCOPE_aulabreve.api")
                        .requestMatchers(HttpMethod.POST, "/api/v1/users/me/password")
                        .hasAuthority("SCOPE_aulabreve.api")
                        .anyRequest().denyAll())
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt
                        .decoder(token -> validarAccessToken(jwtDecoder, token))
                        .jwtAuthenticationConverter(jwtAuthenticationConverter())))
                .exceptionHandling(exceptions -> exceptions.authenticationEntryPoint(new BearerTokenAuthenticationEntryPoint()));
        return http.build();
    }

    // 3. Restricciones adicionales para access tokens de AulaBreve
    private Jwt validarAccessToken(JwtDecoder decoder, String token) {
        Jwt jwt = decoder.decode(token);
        if (jwt.getAudience() == null || !jwt.getAudience().contains("aulabreve-api")) {
            throw tokenInvalido("La audiencia del access token no es valida");
        }
        if (jwt.getExpiresAt() == null) {
            throw tokenInvalido("El access token no tiene vencimiento");
        }
        try {
            if (Integer.parseInt(jwt.getSubject()) <= 0) throw new NumberFormatException();
        } catch (NumberFormatException ex) {
            throw tokenInvalido("El identificador del usuario no es valido");
        }
        return jwt;
    }

    private JwtValidationException tokenInvalido(String mensaje) {
        return new JwtValidationException(mensaje, List.of(new OAuth2Error("invalid_token", mensaje, null)));
    }

    // 4. Conservar scopes SCOPE_* y roles sin prefijo
    private JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter scopes = new JwtGrantedAuthoritiesConverter();
        JwtGrantedAuthoritiesConverter roles = new JwtGrantedAuthoritiesConverter();
        roles.setAuthoritiesClaimName("roles");
        roles.setAuthorityPrefix("");
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(new DelegatingJwtGrantedAuthoritiesConverter(scopes, roles));
        return converter;
    }

    // 5. Login del Authorization Server: mantener sesion y CSRF
    @Bean
    @Order(3)
    public SecurityFilterChain loginSecurityChain(
        HttpSecurity http) throws Exception {

            http
            .authorizeHttpRequests(auth -> auth

                    .requestMatchers(
                            "/error",
                            "/auth-assets/login.css"
                    ).permitAll()

                    .anyRequest().authenticated()
            )

            .formLogin(form -> form

                    .loginPage("/login")

                    .permitAll()
            )

            .logout(logout -> logout.permitAll());

        return http.build();
    }

    // 6. CORS para Angular
    @Bean
    public UrlBasedCorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(frontendOrigin));
        config.setAllowedMethods(List.of("GET", "POST", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
