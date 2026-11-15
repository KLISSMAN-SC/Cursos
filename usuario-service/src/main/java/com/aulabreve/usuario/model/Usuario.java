
package com.aulabreve.usuario.model;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "usuarios")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "nombre", nullable = false,
            length = 120)
    private String nombre;

    @Column(name = "email", nullable = false,
            unique = true, length = 254)
    private String email;

    @Column(name = "password_hash", nullable = false,
            length = 255)
    private String passwordHash;

    @Column(name = "activo", nullable = false)
    private boolean activo = true;

    @Column(name = "fecha_creacion", nullable = false,
            updatable = false)
    private OffsetDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false)
    private OffsetDateTime fechaActualizacion;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "usuario_roles",
            joinColumns = @JoinColumn(name = "usuario_id"),
            inverseJoinColumns = @JoinColumn(name = "rol_id")
    )
    private Set<Rol> roles = new LinkedHashSet<>();

    public Usuario(String nombre, String email,
                   String passwordHash) {

        this.nombre = nombre;
        this.email = email;
        this.passwordHash = passwordHash;
        this.activo = true;
    }

    public void asignarRol(Rol rol) {
        this.roles.add(rol);
    }

    @PrePersist
    protected void antesDeCrear() {

        OffsetDateTime ahora =
                OffsetDateTime.now(ZoneOffset.UTC);

        this.fechaCreacion = ahora;
        this.fechaActualizacion = ahora;
    }

    @PreUpdate
    protected void antesDeActualizar() {

        this.fechaActualizacion =
                OffsetDateTime.now(ZoneOffset.UTC);
    }
    public void cambiarNombre(String nombre) {
        this.nombre = nombre;
    }

    public void cambiarEmail(String email) {
        this.email = email;
    }

    public void cambiarPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

}
