package com.aulabreve.usuario.config;

import com.aulabreve.usuario.dto.RegistroRequest;
import com.aulabreve.usuario.dto.UsuarioResponse;
import com.aulabreve.usuario.model.CodigoRol;
import com.aulabreve.usuario.service.UsuarioService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import java.io.Console;
import java.util.Arrays;

@Component
@Profile("provision")
@RequiredArgsConstructor
public class ProvisionCuentaRunner implements ApplicationRunner {

    private final UsuarioService usuarioService;
    private final ConfigurableApplicationContext context;

    @Override
    public void run(ApplicationArguments args) {
        int codigoSalida = ejecutar();
        System.exit(SpringApplication.exit(context, () -> codigoSalida));
    }

    private int ejecutar() {
        Console consola = System.console();
        if (consola == null) {
            System.err.println("Se necesita una terminal interactiva con TTY.");
            return 1;
        }
        char[] password = null;
        char[] confirmacion = null;
        try {
            String opcion = consola.readLine("Rol [1=ADMIN_CATALOGO, 2=MODERADOR_COMUNIDAD]: ");
            CodigoRol rol;
            if ("1".equals(opcion)) {
                rol = CodigoRol.ADMIN_CATALOGO;
            } else if ("2".equals(opcion)) {
                rol = CodigoRol.MODERADOR_COMUNIDAD;
            } else {
                consola.printf("Rol invalido.%n");
                return 1;
            }
            String nombre = consola.readLine("Nombre: ");
            String email = consola.readLine("Correo: ");
            password = consola.readPassword("Contrasena: ");
            confirmacion = consola.readPassword("Confirmar contrasena: ");
            if (password == null || confirmacion == null || !Arrays.equals(password, confirmacion)) {
                consola.printf("Las contrasenas no coinciden.%n");
                return 1;
            }
            UsuarioResponse usuario = usuarioService.provisionarCuenta(
                    new RegistroRequest(nombre, email, new String(password)), rol);
            consola.printf("Cuenta creada. ID=%d, rol=%s%n", usuario.id(), rol.name());
            return 0;
        } catch (ResponseStatusException ex) {
            consola.printf("No se creo la cuenta: %s%n", ex.getReason());
            return 1;
        } catch (RuntimeException ex) {
            System.err.println("No se pudo completar la provision. Revise la configuracion.");
            return 1;
        } finally {
            if (password != null) Arrays.fill(password, '\0');
            if (confirmacion != null) Arrays.fill(confirmacion, '\0');
        }
    }
}
