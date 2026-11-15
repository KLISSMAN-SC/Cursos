
package com.aulabreve.usuario.model;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "roles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Rol {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Enumerated(EnumType.STRING)
    @Column(name = "codigo", nullable = false,
            unique = true, length = 40)
    private CodigoRol codigo;

    @Column(name = "descripcion", nullable = false,
            length = 200)
    private String descripcion;

}
