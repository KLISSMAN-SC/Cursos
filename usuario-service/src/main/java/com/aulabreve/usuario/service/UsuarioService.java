package com.aulabreve.usuario.service;

import com.aulabreve.usuario.dto.ActualizarPerfilRequest;
import com.aulabreve.usuario.dto.CambiarPasswordRequest;
import com.aulabreve.usuario.dto.RegistroRequest;
import com.aulabreve.usuario.dto.UsuarioResponse;
import com.aulabreve.usuario.model.CodigoRol;
import com.aulabreve.usuario.model.Rol;
import com.aulabreve.usuario.model.Usuario;
import com.aulabreve.usuario.repository.RolRepository;
import com.aulabreve.usuario.repository.UsuarioRepository;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;
    private final Validator validator;

    @Transactional
    public UsuarioResponse registrar(RegistroRequest request) {
        return crearCuenta(request, CodigoRol.ESTUDIANTE);
    }

    // Operacion interna: no existe un endpoint HTTP para invocarla.
    @Transactional
    public UsuarioResponse provisionarCuenta(RegistroRequest request, CodigoRol codigo) {
        if (codigo != CodigoRol.ADMIN_CATALOGO
                && codigo != CodigoRol.MODERADOR_COMUNIDAD) {
            throw error(HttpStatus.BAD_REQUEST, "Rol privilegiado no permitido");
        }
        return crearCuenta(request, codigo);
    }

    private UsuarioResponse crearCuenta(RegistroRequest request, CodigoRol codigo) {
        if (!validator.validate(request).isEmpty()) {
            throw error(HttpStatus.BAD_REQUEST, "Datos de registro invalidos");
        }
        validarLongitudPassword(request.password());
        verificarCorreoDisponible(request.email());

        Rol rol = rolRepository.findByCodigo(codigo)
                .orElseThrow(() -> new IllegalStateException("Rol no configurado"));
        Usuario usuario = new Usuario(request.nombre(), request.email(),
                passwordEncoder.encode(request.password()));
        usuario.asignarRol(rol);
        return UsuarioResponse.desde(guardar(usuario));
    }

    @Transactional(readOnly = true)
    public UsuarioResponse consultarPerfil(Integer usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> error(HttpStatus.FORBIDDEN, "Cuenta no disponible"));
        verificarActivo(usuario);
        return UsuarioResponse.desde(usuario);
    }

    @Transactional
    public UsuarioResponse actualizarPerfil(Integer usuarioId, ActualizarPerfilRequest request) {
        if (!validator.validate(request).isEmpty()
                || (request.nombre() == null && request.email() == null)) {
            throw error(HttpStatus.BAD_REQUEST, "Datos de perfil invalidos");
        }
        Usuario usuario = cargarParaActualizar(usuarioId);

        if (request.email() != null && !request.email().equals(usuario.getEmail())) {
            verificarPasswordActual(usuario, request.passwordActual());
            verificarCorreoDisponible(request.email());
            usuario.cambiarEmail(request.email());
        }
        if (request.nombre() != null) {
            usuario.cambiarNombre(request.nombre());
        }
        return UsuarioResponse.desde(guardar(usuario));
    }

    @Transactional
    public void cambiarPassword(Integer usuarioId, CambiarPasswordRequest request) {
        if (!validator.validate(request).isEmpty()) {
            throw error(HttpStatus.BAD_REQUEST, "Datos de contrasena invalidos");
        }
        validarLongitudPassword(request.passwordNueva());
        Usuario usuario = cargarParaActualizar(usuarioId);
        verificarPasswordActual(usuario, request.passwordActual());
        if (passwordEncoder.matches(request.passwordNueva(), usuario.getPasswordHash())) {
            throw error(HttpStatus.BAD_REQUEST, "La nueva contrasena debe ser diferente");
        }
        usuario.cambiarPasswordHash(passwordEncoder.encode(request.passwordNueva()));
        guardar(usuario);
    }

    private Usuario cargarParaActualizar(Integer usuarioId) {
        Usuario usuario = usuarioRepository.findByIdParaActualizar(usuarioId)
                .orElseThrow(() -> error(HttpStatus.FORBIDDEN, "Cuenta no disponible"));
        verificarActivo(usuario);
        return usuario;
    }

    private void verificarActivo(Usuario usuario) {
        if (!usuario.isActivo()) {
            throw error(HttpStatus.FORBIDDEN, "La cuenta esta deshabilitada");
        }
    }

    private void verificarPasswordActual(Usuario usuario, String password) {
        if (password == null || password.isBlank()
                || password.getBytes(StandardCharsets.UTF_8).length > 72
                || !passwordEncoder.matches(password, usuario.getPasswordHash())) {
            throw error(HttpStatus.FORBIDDEN, "Contrasena actual incorrecta");
        }
    }

    private void validarLongitudPassword(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw error(HttpStatus.BAD_REQUEST, "La contrasena no debe superar 72 bytes");
        }
    }

    private void verificarCorreoDisponible(String email) {
        if (usuarioRepository.existsByEmail(email)) {
            throw error(HttpStatus.CONFLICT, "El correo electronico ya esta registrado");
        }
    }

    // La restriccion UNIQUE protege tambien contra solicitudes simultaneas.
    private Usuario guardar(Usuario usuario) {
        try {
            return usuarioRepository.saveAndFlush(usuario);
        } catch (DataIntegrityViolationException ex) {
            Throwable causa = ex;
            while (causa != null) {
                if (causa instanceof org.hibernate.exception.ConstraintViolationException restriccion
                        && "usuarios_email_key".equalsIgnoreCase(restriccion.getConstraintName())) {
                    throw error(HttpStatus.CONFLICT, "El correo electronico ya esta registrado");
                }
                causa = causa.getCause();
            }
            throw ex;
        }
    }

    private ResponseStatusException error(HttpStatus status, String mensaje) {
        return new ResponseStatusException(status, mensaje);
    }
}
