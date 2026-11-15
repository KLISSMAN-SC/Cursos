
package com.aulabreve.usuario.security;

import com.aulabreve.usuario.model.Usuario;
import com.aulabreve.usuario.repository.UsuarioRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class UsuarioDetailsService
        implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email)
            throws UsernameNotFoundException {

        String correoNormalizado = email
                .strip()
                .toLowerCase(Locale.ROOT);

        Usuario usuario = usuarioRepository
                .findByEmail(correoNormalizado)
                .orElseThrow(() ->
                        new UsernameNotFoundException(
                                "Credenciales invalidas"
                        ));

        String[] autoridades = usuario.getRoles()
                .stream()
                .map(rol -> rol.getCodigo().name())
                .toArray(String[]::new);

        return User.builder()
                .username(usuario.getId().toString())
                .password(usuario.getPasswordHash())
                .authorities(autoridades)
                .disabled(!usuario.isActivo())
                .build();
    }
}
