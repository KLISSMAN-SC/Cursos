import { HttpClient } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { tap } from "rxjs";
import { TokenStorage } from "./token-storage.service";
export interface Account {
  id: number;
  rol: "ESTUDIANTE" | "ADMIN";
}
@Injectable({ providedIn: "root" })
export class Session {
  private generation = 0;
  private readonly http = inject(HttpClient);
  private readonly storage = inject(TokenStorage);
  readonly account = signal<Account | null>(null);
  readonly status = signal<"guest" | "loading" | "ready" | "unavailable">(
    "guest",
  );
  restore(): void {
    const token = this.storage.read();
    if (!token) {
      this.account.set(null);
      this.status.set("guest");
      return;
    }
    this.status.set("loading");
    const operation = this.generation + 1;
    this.connect(token).subscribe({
      error: (error) => {
        if (operation !== this.generation) return;
        this.account.set(null);
        if (error.status === 401) {
          this.storage.clear();
          this.status.set("guest");
        } else this.status.set("unavailable");
      },
    });
  }
  connect(token: string) {
    const operation = ++this.generation;
    return this.http
      .get<Account>("/api/comunidad/api/v1/sesion", {
        headers: { Authorization: `Bearer ${token.trim()}` },
      })
      .pipe(
        tap((account) => {
          if (operation !== this.generation) return;
          this.storage.save(token.trim());
          this.account.set(account);
          this.status.set("ready");
        }),
      );
  }
  logout(): void {
    this.generation++;
    this.storage.clear();
    this.account.set(null);
    this.status.set("guest");
  }
}
