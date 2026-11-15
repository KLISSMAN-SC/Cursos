import { HttpErrorResponse } from "@angular/common/http";
import { Component, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { finalize } from "rxjs";
import { DestroyRef } from "@angular/core";
import { UsuarioApi } from "../../services/usuario-api.service";

function noSoloEspacios(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === "string" && !control.value.trim() ? { required: true } : null;
}

function maximoBytes(control: AbstractControl): ValidationErrors | null {
  return new TextEncoder().encode(control.value ?? "").length > 72 ? { maxBytes: true } : null;
}

function coinciden(control: AbstractControl): ValidationErrors | null {
  const password = control.get("password")?.value;
  const confirmacion = control.get("confirmacion")?.value;
  return password === confirmacion ? null : { noCoinciden: true };
}

@Component({
  selector: "app-register-page",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: "./register-page.component.html",
  styleUrl: "./register-page.component.scss",
})
export class RegisterPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(UsuarioApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly busy = signal(false);
  readonly success = signal(false);
  readonly error = signal("");
  readonly submitted = signal(false);

  readonly form = this.fb.group({
    nombre: ["", [Validators.required, noSoloEspacios, Validators.maxLength(120)]],
    email: ["", [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ["", [Validators.required, noSoloEspacios, Validators.minLength(12), Validators.maxLength(72), maximoBytes]],
    confirmacion: ["", [Validators.required]],
  }, { validators: coinciden });

  get fields() { return this.form.controls; }

  submit(): void {
    if (this.busy() || this.success()) return;
    this.error.set("");
    this.submitted.set(true);
    this.fields.nombre.setValue(this.fields.nombre.value.trim());
    this.fields.email.setValue(this.fields.email.value.trim().toLowerCase());
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const { nombre, email, password } = this.form.getRawValue();
    this.busy.set(true);
    this.api.registrar({ nombre, email, password }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.busy.set(false)),
    ).subscribe({
      next: () => {
        this.form.reset();
        this.submitted.set(false);
        this.success.set(true);
      },
      error: (err: HttpErrorResponse) => {
        // Mensajes controlados; nunca mostrar el cuerpo de la solicitud ni contraseñas.
        if (err.status === 409) this.error.set("El correo electrónico ya está registrado. Puedes iniciar sesión o utilizar otro correo.");
        else if (err.status === 400) this.error.set("Los datos de registro no son válidos. Revisa los campos e inténtalo nuevamente.");
        else this.error.set("No pudimos completar el registro. Inténtalo nuevamente. Si ya creaste la cuenta, inicia sesión.");
      },
    });
  }
}
