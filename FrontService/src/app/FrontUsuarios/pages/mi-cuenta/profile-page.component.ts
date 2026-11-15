import { HttpErrorResponse } from "@angular/common/http";
import { Component, DestroyRef, effect, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {AbstractControl,NonNullableFormBuilder,ReactiveFormsModule,ValidationErrors,ValidatorFn,Validators,} from "@angular/forms";
import { RouterLink } from "@angular/router";
import { finalize } from "rxjs";
import { Session } from "../../../core/auth/session.service";
import { ActualizarPerfilRequest } from "../../models/actualizar-perfil-request";
import { Rol } from "../../models/usuario";
import { UsuarioApi } from "../../services/usuario-api.service";
const noBlank: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  return typeof control.value === "string" && control.value.trim().length === 0
    ? { blank: true }
    : null;
};

const maxUtf8Bytes = (max: number): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? "");
    const actual = new TextEncoder().encode(value).length;

    return actual > max
      ? { maxUtf8Bytes: { max, actual } }
      : null;
  };
};

const validarCambioPassword: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const actual = control.get("passwordActual")?.value ?? "";
  const nueva = control.get("passwordNueva")?.value ?? "";
  const confirmacion = control.get("confirmarPassword")?.value ?? "";

  const errors: ValidationErrors = {};

  if (actual && nueva && actual === nueva) {
    errors["sameAsCurrent"] = true;
  }

  if (confirmacion && nueva !== confirmacion) {
    errors["passwordMismatch"] = true;
  }

  return Object.keys(errors).length > 0 ? errors : null;
};
@Component({
  selector: "app-profile-page",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: "./profile-page.component.html",
  styleUrl: "./profile-page.component.scss",
})
export class ProfilePage {
  readonly session = inject(Session);
  private readonly api = inject(UsuarioApi);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  readonly busy = signal(false);
  readonly success = signal("");
  readonly error = signal("");
  readonly passwordBusy = signal(false);
  readonly passwordSuccess = signal("");
  readonly passwordError = signal("");
  readonly form = this.fb.group({
    nombre: ["", [Validators.required, Validators.maxLength(120)]],
    email: ["", [Validators.required, Validators.email, Validators.maxLength(254)]],
    passwordActual: [""],
  });
  readonly passwordForm = this.fb.group(
  {
    passwordActual: [
      "",
      [Validators.required, noBlank, maxUtf8Bytes(72)],
    ],
    passwordNueva: [
      "",
      [
        Validators.required,
        noBlank,
        Validators.minLength(12),
        Validators.maxLength(72),
        maxUtf8Bytes(72),
      ],
    ],
    confirmarPassword: [
      "",
      [
        Validators.required,
        noBlank,
        Validators.maxLength(72),
        maxUtf8Bytes(72),
      ],
    ],
  },
  {
    validators: validarCambioPassword,
  },
);
  readonly labels: Record<Rol, string> = {
    ESTUDIANTE: "Estudiante",
    ADMIN_CATALOGO: "Administrador de catálogo",
    MODERADOR_COMUNIDAD: "Moderador de comunidad",
  };
  private previousId: number | null = null;

  constructor() {
    // Sincroniza el formulario imperativo con la identidad verificada.
    effect(() => {
      const account = this.session.account();
      this.form.reset({ nombre: account?.nombre ?? "", email: account?.email ?? "", passwordActual: "" });
      this.passwordForm.reset({passwordActual: "",passwordNueva: "",confirmarPassword: "",});
      if ((account?.id ?? null) !== this.previousId) {
        this.error.set("");
        this.success.set("");
        this.passwordError.set("");
        this.passwordSuccess.set("");
        this.previousId = account?.id ?? null;
      }
    });
  }

  get fields() { return this.form.controls; }
  get passwordFields() {return this.passwordForm.controls;}
  initials(nombre: string): string {
    return nombre.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0] ?? "").join("").toUpperCase();
  }

  cambiaCorreo(): boolean {
    const account = this.session.account();
    return !!account && this.fields.email.value.trim().toLowerCase() !== account.email;
  }

  submit(): void {
    if (this.busy()) return;
    const account = this.session.account();
    const token = this.session.accessToken();
    if (!account || !token) return;
    this.error.set("");
    this.success.set("");
    this.fields.nombre.setValue(this.fields.nombre.value.trim());
    this.fields.email.setValue(this.fields.email.value.trim().toLowerCase());
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set("Revisa el nombre y el correo electrónico.");
      return;
    }
    const { nombre, email, passwordActual } = this.form.getRawValue();
    const body: ActualizarPerfilRequest = {};
    if (nombre !== account.nombre) body.nombre = nombre;
    if (email !== account.email) {
      if (!passwordActual.trim() || new TextEncoder().encode(passwordActual).length > 72) {
        this.error.set("Ingresa tu contraseña actual válida para cambiar el correo.");
        return;
      }
      body.email = email;
      body.passwordActual = passwordActual;
    }
    if (body.nombre === undefined && body.email === undefined) {
      this.fields.passwordActual.reset();
      this.success.set("No hay cambios por guardar.");
      return;
    }
    this.busy.set(true);
    this.fields.passwordActual.reset();
    this.api.actualizarPerfil(body).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.busy.set(false)),
    ).subscribe({
      next: updated => {
        if (this.session.aplicarPerfilActualizado(updated, token)) {
          this.success.set("Tus datos se actualizaron correctamente.");
        }
      },
      error: (err: HttpErrorResponse) => {
        if (this.session.accessToken() !== token) return;
        if (err.status === 409) this.error.set("El correo electrónico ya está registrado.");
        else if (err.status === 403) this.error.set("No se autorizó el cambio. Verifica tu contraseña actual y el estado de tu cuenta.");
        else if (err.status === 400) this.error.set("Los datos no son válidos. Revisa el formulario.");
        else this.error.set("No pudimos confirmar los cambios. Vuelve a consultar tu perfil antes de reintentar.");
      },
    });
  }
  submitPassword(): void {
  if (this.passwordBusy()) return;

  const account = this.session.account();
  const token = this.session.accessToken();

  if (!account || !token) return;

  this.passwordError.set("");
  this.passwordSuccess.set("");

  this.passwordForm.markAllAsTouched();

  if (this.passwordForm.invalid) return;

  const { passwordActual, passwordNueva } =
    this.passwordForm.getRawValue();

  this.passwordBusy.set(true);

  this.api.cambiarPassword({
    passwordActual,
    passwordNueva,
  }).pipe(
    takeUntilDestroyed(this.destroyRef),
    finalize(() => this.passwordBusy.set(false)),
  ).subscribe({
    next: () => {
      if (this.session.accessToken() !== token) return;

      this.passwordForm.reset();

      this.passwordSuccess.set(
        "Tu contraseña se actualizó correctamente.",
      );
    },
    error: (err: HttpErrorResponse) => {
      if (this.session.accessToken() !== token) return;

      if (err.status === 400) {
        this.passwordError.set(
          "La nueva contraseña no cumple las reglas o debe ser diferente de la actual.",
        );
      } else if (err.status === 403) {
        this.passwordError.set(
          "La contraseña actual es incorrecta o tu cuenta no está habilitada.",
        );
      } else {
        this.passwordError.set(
          "No pudimos actualizar tu contraseña. Inténtalo nuevamente.",
        );
      }
    },
  });
}
}
