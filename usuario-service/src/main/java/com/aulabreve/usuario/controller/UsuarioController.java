package com.aulabreve.usuario.controller;

import com.aulabreve.usuario.dto.ActualizarPerfilRequest;
import com.aulabreve.usuario.dto.CambiarPasswordRequest;
import com.aulabreve.usuario.dto.RegistroRequest;
import com.aulabreve.usuario.dto.UsuarioResponse;
import com.aulabreve.usuario.service.UsuarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UsuarioController {

    private static final String ROLES_CUENTA =
            "hasAnyAuthority('ESTUDIANTE','ADMIN_CATALOGO','MODERADOR_COMUNIDAD')";

    private final UsuarioService usuarioService;

    @PostMapping("/register")
    public ResponseEntity<UsuarioResponse> registrar(@Valid @RequestBody RegistroRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(usuarioService.registrar(request));
    }

    @GetMapping("/me")
    @PreAuthorize(ROLES_CUENTA)
    public ResponseEntity<UsuarioResponse> consultarPerfil(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(usuarioService.consultarPerfil(Integer.valueOf(jwt.getSubject())));
    }

    @PatchMapping("/me")
    @PreAuthorize(ROLES_CUENTA)
    public ResponseEntity<UsuarioResponse> actualizarPerfil(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ActualizarPerfilRequest request) {
        return ResponseEntity.ok(usuarioService.actualizarPerfil(Integer.valueOf(jwt.getSubject()), request));
    }

    @PostMapping("/me/password")
    @PreAuthorize(ROLES_CUENTA)
    public ResponseEntity<Void> cambiarPassword(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CambiarPasswordRequest request) {
        usuarioService.cambiarPassword(Integer.valueOf(jwt.getSubject()), request);
        return ResponseEntity.noContent().build();
    }
}
