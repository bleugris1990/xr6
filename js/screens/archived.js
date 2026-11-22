// screens/archived.js — routines désactivées, avec réactivation.

import { DB } from "../db.js";
import { escapeHTML } from "../util.js";

export async function renderArchived(container) {
  const routines = await DB.getRoutines();
  const archived = routines.filter((r) => !r.active);

  container.innerHTML = `
    <div class="screen-header">
      <a class="back-link" href="#/">‹ Retour</a>
    </div>
    <h1 class="screen-title" style="margin-bottom:20px;">Routines archivées</h1>
    ${
      archived.length === 0
        ? `<div class="empty-state">Aucune routine archivée pour l'instant.</div>`
        : archived
            .map(
              (r) => `
          <div class="routine-card" style="--card-color:${r.color}">
            <div class="routine-card-top">
              <div class="name">${escapeHTML(r.name)}</div>
              <button class="btn btn-sm" data-reactivate="${r.id}" type="button">Réactiver</button>
            </div>
            <div class="meta">${r.exerciseIds.length} exercice${r.exerciseIds.length > 1 ? "s" : ""}</div>
          </div>
        `
            )
            .join("")
    }
  `;

  container.querySelectorAll("[data-reactivate]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await DB.setRoutineActive(btn.dataset.reactivate, true);
      renderArchived(container);
    });
  });
}
