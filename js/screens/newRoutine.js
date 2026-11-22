// screens/newRoutine.js — création d'une routine (définitive, pas de modif après coup).

import { DB } from "../db.js";
import { go } from "../router.js";
import { escapeHTML } from "../util.js";

const COLORS = [
  { name: "Bleu", value: "#5aa9ff" },
  { name: "Vert", value: "#4caf7d" },
  { name: "Orange", value: "#f2994a" },
  { name: "Violet", value: "#a87ff0" },
  { name: "Rouge", value: "#f2666b" },
  { name: "Jaune", value: "#e0bf3a" },
];

let draft = null;

function resetDraft() {
  draft = { name: "", color: null, exercises: [] }; // exercises: [{id, name}]
}

export async function renderNewRoutine(container) {
  if (!draft) resetDraft();

  const catalogue = await DB.getExercises();
  const available = catalogue.filter(
    (e) => !draft.exercises.some((sel) => sel.id === e.id)
  );
  const canSave =
    draft.name.trim().length > 0 && draft.color && draft.exercises.length > 0;

  container.innerHTML = `
    <div class="screen-header">
      <a class="back-link" href="#/" id="cancel-link">‹ Annuler</a>
    </div>
    <h1 class="screen-title" style="margin-bottom:20px;">Nouvelle routine</h1>

    <div class="field">
      <label>Nom de la routine</label>
      <input type="text" id="name-input" value="${escapeHTML(draft.name)}" placeholder="ex : Push A" />
    </div>

    <div class="field">
      <label>Couleur</label>
      <div class="color-picker">
        ${COLORS.map(
          (c) => `
          <button type="button" class="color-swatch ${draft.color === c.value ? "selected" : ""}"
            style="--swatch-color:${c.value}" data-color="${c.value}" aria-label="${c.name}"></button>
        `
        ).join("")}
      </div>
    </div>

    <div class="field">
      <label>Exercices de la routine (dans l'ordre d'ajout)</label>
      ${
        draft.exercises.length > 0
          ? `<ul class="selected-exercise-list">
              ${draft.exercises
                .map(
                  (e, i) => `
                <li>
                  <span>${i + 1}. ${escapeHTML(e.name)}</span>
                  <button type="button" class="remove-x" data-remove="${i}" aria-label="Retirer">✕</button>
                </li>
              `
                )
                .join("")}
            </ul>`
          : ""
      }

      ${
        available.length > 0
          ? `<label style="margin-top:4px;">Depuis le catalogue</label>
             <div class="exercise-chip-list">
               ${available
                 .map(
                   (e) =>
                     `<button type="button" class="exercise-chip" data-pick="${e.id}">${escapeHTML(e.name)}</button>`
                 )
                 .join("")}
             </div>`
          : ""
      }

      <label style="margin-top:4px;">Nouvel exercice</label>
      <div class="weight-add-row">
        <input type="text" id="new-exo-input" placeholder="ex : Développé couché" />
        <button type="button" class="btn btn-sm" id="add-exo-btn">Ajouter</button>
      </div>
    </div>

    <button class="btn btn-primary" id="save-btn" ${canSave ? "" : "disabled"}>Créer la routine</button>
  `;

  const saveBtn = container.querySelector("#save-btn");

  container.querySelector("#name-input").addEventListener("input", (e) => {
    draft.name = e.target.value;
    const ok =
      draft.name.trim().length > 0 && draft.color && draft.exercises.length > 0;
    saveBtn.toggleAttribute("disabled", !ok);
  });

  container.querySelectorAll("[data-color]").forEach((btn) => {
    btn.addEventListener("click", () => {
      draft.color = btn.dataset.color;
      renderNewRoutine(container);
    });
  });

  container.querySelectorAll("[data-pick]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ex = catalogue.find((e) => e.id === btn.dataset.pick);
      if (ex) draft.exercises.push({ id: ex.id, name: ex.name });
      renderNewRoutine(container);
    });
  });

  container.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      draft.exercises.splice(Number(btn.dataset.remove), 1);
      renderNewRoutine(container);
    });
  });

  container.querySelector("#add-exo-btn").addEventListener("click", async () => {
    const input = container.querySelector("#new-exo-input");
    const name = input.value.trim();
    if (!name) return;
    const exercise = await DB.addOrGetExercise(name);
    if (!draft.exercises.some((e) => e.id === exercise.id)) {
      draft.exercises.push({ id: exercise.id, name: exercise.name });
    }
    renderNewRoutine(container);
  });

  container.querySelector("#cancel-link").addEventListener("click", () => {
    resetDraft();
  });

  saveBtn.addEventListener("click", async () => {
    const ok =
      draft.name.trim().length > 0 && draft.color && draft.exercises.length > 0;
    if (!ok) return;
    await DB.createRoutine({
      name: draft.name,
      color: draft.color,
      exerciseIds: draft.exercises.map((e) => e.id),
    });
    resetDraft();
    go("#/");
  });
}
