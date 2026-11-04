import { Injectable } from "@angular/core";
@Injectable({ providedIn: "root" })
export class TokenStorage {
  private readonly key = "cursos.access_token";
  read(): string | null {
    return sessionStorage.getItem(this.key);
  }
  save(value: string): void {
    sessionStorage.setItem(this.key, value);
  }
  clear(): void {
    sessionStorage.removeItem(this.key);
  }
}
