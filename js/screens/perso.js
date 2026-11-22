// screens/perso.js — poids corporel + calendrier des séances + export.

import { DB } from "../db.js";
import { renderWeightChartSVG } from "../charts.js";

const DOW_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTH_LABELS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

let calendarYear = null;
let calendarMonth = null; // 0-11

export async function renderPerso(container) {
  const now = new Date();
  if (calendarYear === null) {
    calendarYear = now.getFullYear();
    calendarMonth = now.getMonth();
  }

  const [weights, calendarMap] = await Promise.all([
    DB.getBodyWeights(),
    DB.getCalendarColorsForMonth(calendarYear, calendarMonth),
  ]);

  container.innerHTML = `
    <div class="screen-header"><h1 class="screen-title">Perso</h1></div>

    <div class="section-block">
      <div class="section-title">Poids corporel</div>
      <div class="weight-add-row">
        <input type="number" inputmode="decimal" step="0.1" min="0" id="weight-input" placeholder="Poids en kg" />
        <button class="btn btn-primary btn-sm" id="add-weight-btn" type="button">Ajouter</button>
      </div>
      ${
        weights.length > 0
          ? `<div class="chart-svg-wrap">${renderWeightChartSVG(weights)}</div>`
          : `<div class="empty-state">Pas encore de poids enregistré.</div>`
      }
    </div>

    <div class="section-block">
      <div class="section-title">Calendrier</div>
      ${renderCalendarHTML(calendarYear, calendarMonth, calendarMap)}
    </div>

    <div class="section-block export-block">
      <div class="section-title">Export des données</div>
      <p>Génère un fichier Excel avec toutes tes séances, routines, exercices et poids enregistrés.</p>
      <button class="btn" id="export-btn" type="button">Exporter en Excel</button>
    </div>
  `;

  container.querySelector("#add-weight-btn").addEventListener("click", async () => {
    const input = container.querySelector("#weight-input");
    const value = parseFloat(input.value);
    if (isNaN(value)) return;
    await DB.addBodyWeight(value);
    renderPerso(container);
  });

  container.querySelector("#prev-month").addEventListener("click", () => {
    calendarMonth -= 1;
    if (calendarMonth < 0) {
      calendarMonth = 11;
      calendarYear -= 1;
    }
    renderPerso(container);
  });

  container.querySelector("#next-month").addEventListener("click", () => {
    calendarMonth += 1;
    if (calendarMonth > 11) {
      calendarMonth = 0;
      calendarYear += 1;
    }
    renderPerso(container);
  });

  container.querySelector("#export-btn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = "Export en cours…";
    try {
      const { exportToExcel } = await import("../export.js");
      await exportToExcel();
      btn.textContent = "Exporté ✓";
    } catch (err) {
      console.error(err);
      btn.textContent = "Échec de l'export";
    } finally {
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = "Exporter en Excel";
      }, 2000);
    }
  });
}

function renderCalendarHTML(year, month, calendarMap) {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // semaine commence le lundi
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayISO = DB.todayISO();

  const cells = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push('<div class="calendar-day empty"></div>');
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const colors = calendarMap.get(iso) || [];
    const isToday = iso === todayISO;
    cells.push(`
      <div class="calendar-day ${isToday ? "today" : ""}">
        <span>${day}</span>
        <div class="calendar-dots">
          ${colors.map((c) => `<span class="calendar-dot" style="background:${c}"></span>`).join("")}
        </div>
      </div>
    `);
  }

  return `
    <div class="calendar-nav">
      <button id="prev-month" type="button" aria-label="Mois précédent">‹</button>
      <div class="month-label">${MONTH_LABELS[month]} ${year}</div>
      <button id="next-month" type="button" aria-label="Mois suivant">›</button>
    </div>
    <div class="calendar-grid">
      ${DOW_LABELS.map((l) => `<div class="calendar-dow">${l}</div>`).join("")}
      ${cells.join("")}
    </div>
  `;
}
