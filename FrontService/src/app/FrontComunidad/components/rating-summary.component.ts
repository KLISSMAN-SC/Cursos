import { Component, input } from "@angular/core";
import { DecimalPipe } from "@angular/common";
import { ReviewSummary } from "../models/review";
@Component({
  selector: "app-rating-summary",
  imports: [DecimalPipe],
  template: `<section class="panel summary" aria-labelledby="rating-title">
    <p class="eyebrow">LO QUE DICE LA COMUNIDAD</p>
    <h2 id="rating-title">Cada opinión cuenta</h2>
    <div class="score">
      <strong>{{
        summary().promedio === null
          ? "—"
          : (summary().promedio | number: "1.1-1")
      }}</strong
      ><span>de 5</span>
    </div>
    <div class="stars" aria-hidden="true">★★★★★</div>
    <p class="muted">
      {{ summary().total }}
      {{ summary().total === 1 ? "reseña compartida" : "reseñas compartidas" }}
    </p>
    <div class="distribution">
      @for (rating of [5, 4, 3, 2, 1]; track rating) {
        <div class="distribution-row">
          <span>{{ rating }} <span aria-hidden="true">★</span></span>
          <div
            class="track"
            role="meter"
            [attr.aria-label]="rating + ' estrellas'"
            aria-valuemin="0"
            [attr.aria-valuemax]="summary().total || 1"
            [attr.aria-valuenow]="summary().distribucion['' + rating] || 0"
          >
            <i
              [style.width.%]="
                summary().total
                  ? (100 * (summary().distribucion['' + rating] || 0)) /
                    summary().total
                  : 0
              "
            ></i>
          </div>
          <small>{{ summary().distribucion["" + rating] || 0 }}</small>
        </div>
      }
    </div>
    <div class="summary-note">
      <span aria-hidden="true">✦</span>
      <p>
        Una experiencia compartida puede ser el impulso que alguien necesita.
      </p>
    </div>
  </section>`,
  styles: `
    :host {
      display: block;
    }
    h2 {
      font-size: 1.12rem;
    }
    .score {
      display: flex;
      align-items: baseline;
      gap: 0.6rem;
      margin-top: 1.4rem;
    }
    .score strong {
      font-size: 3.5rem;
      line-height: 1;
      color: var(--forest);
      letter-spacing: -0.06em;
    }
    .score span {
      color: var(--muted);
    }
    .stars {
      font-size: 1.5rem;
      letter-spacing: 0.15em;
      color: var(--amber);
      margin: 0.6rem 0;
    }
    .distribution {
      display: grid;
      gap: 0.8rem;
      margin: 1.7rem 0;
    }
    .distribution-row {
      display: grid;
      grid-template-columns: 2.1rem 1fr 1.3rem;
      align-items: center;
      gap: 0.7rem;
      font-size: 0.8rem;
      color: var(--muted);
    }
    .distribution-row small {
      text-align: right;
    }
    .track {
      height: 7px;
      border-radius: 8px;
      background: #edf0e9;
      overflow: hidden;
    }
    .track i {
      height: 100%;
      display: block;
      background: #6d9f7e;
      border-radius: 8px;
    }
    .summary-note {
      border-top: 1px solid var(--line);
      padding-top: 1.3rem;
      display: flex;
      gap: 0.8rem;
      align-items: start;
    }
    .summary-note span {
      color: var(--forest);
      font-size: 1.7rem;
    }
    .summary-note p {
      margin: 0;
      font-size: 0.84rem;
      color: var(--muted);
      line-height: 1.6;
    }
  `,
})
export class RatingSummary {
  readonly summary = input.required<ReviewSummary>();
}
