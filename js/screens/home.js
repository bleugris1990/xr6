// screens/home.js — écran d'accueil : routines actives.

import { DB } from "../db.js";
import { go } from "../router.js";
import { escapeHTML, formatDateFR } from "../util.js";

export async function renderHome(container) {
  const [routines, inProgress] = await Promise.all([
    DB.getRoutines(),
    DB.getInProgressSession(),
  ]);
  const active = routines.filter((r) => r.active);

  let resumeHTML = "";
  if (inProgress) {
    const routine = routines.find((r) => r.id === inProgress.routineId);
    resumeHTML = `
      <button class="resume-banner" id="resume-btn" type="button">
        <div class="label">Séance en cours</div>
        <div class="name">${escapeHTML(routine ? routine.name : "")}</div>
      </button>
    `;
  }

  const cardStats = await Promise.all(
    active.map((r) => DB.getRoutineHomeStats(r.id))
  );

  const cardsHTML = active
    .map((r, i) => {
      const stats = cardStats[i];
      return `
        <div class="routine-card ${inProgress ? "disabled" : ""}" style="--card-color:${r.color}" data-id="${r.id}">
          <div class="routine-card-top">
            <div class="name">${escapeHTML(r.name)}</div>
            <button class="archive-btn" data-archive="${r.id}" type="button" aria-label="Désactiver">⊘</button>
          </div>
          <div class="meta">
            ${r.exerciseIds.length} exercice${r.exerciseIds.length > 1 ? "s" : ""}
            · ${stats.count} séance${stats.count > 1 ? "s" : ""} effectuée${stats.count > 1 ? "s" : ""}<br>
            Dernière fois : ${formatDateFR(stats.lastDate)}
          </div>
        </div>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="screen-header">
      <h1 class="screen-title">Routines</h1>
      <a class="subtle-link" href="#/archived">Archivées</a>
    </div>
    ${resumeHTML}
    ${
      active.length === 0
        ? `<div class="empty-state">Aucune routine pour l'instant.<br>Crée-en une avec le bouton +.</div>`
        : cardsHTML
    }
    <button class="fab" id="fab-add" type="button" aria-label="Nouvelle routine">+</button>
  `;

  container.querySelector("#fab-add").addEventListener("click", () => {
    go("#/new-routine");
  });

  if (inProgress) {
    container.querySelector("#resume-btn").addEventListener("click", () => {
      go("#/session");
    });
  } else {
    container.querySelectorAll(".routine-card").forEach((card) => {
      card.addEventListener("click", async (e) => {
        if (e.target.closest(".archive-btn")) return;
        const id = card.dataset.id;
        await DB.createSession(id);
        go("#/session");
      });
    });
  }

  container.querySelectorAll(".archive-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.dataset.archive;
      const routine = active.find((r) => r.id === id);
      const ok = confirm(
        `Désactiver "${routine.name}" ? Tu pourras la réactiver depuis l'onglet Archivées.`
      );
      if (ok) {
        await DB.setRoutineActive(id, false);
        renderHome(container);
      }
    });
  });
}
