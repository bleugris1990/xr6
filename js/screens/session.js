// screens/session.js — déroulé d'une séance : saisie, minuteur, choix, correction.
//
// Le hash reste "#/session" du début à la fin ; cet écran gère lui-même ses
// phases internes (saisie / minuteur / choix) sans repasser par le routeur.
// Rien n'est perdu si l'appli est fermée : seule la phase en cours (minuteur
// ou choix) n'est pas restaurée, on retombe sur la saisie de la série suivante.

import { DB } from "../db.js";
import { go } from "../router.js";
import { escapeHTML } from "../util.js";

const REST_SECONDS = 60;
const BASE_SETS = 3;

export async function renderSession(container) {
  const session = await DB.getInProgressSession();
  if (!session) {
    go("#/");
    return;
  }
  await showInputPhase(container, session.id);
}

function topBarHTML(routine) {
  return `
    <div class="session-top">
      <button class="icon-btn" id="open-correction" type="button" aria-label="Corriger une série précédente">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 6l-6 6 6 6"/>
        </svg>
      </button>
      <div class="routine-name">${escapeHTML(routine ? routine.name : "")}</div>
    </div>
    <div id="correction-modal-slot"></div>
  `;
}

function bindTopBar(container, session) {
  container.querySelector("#open-correction").addEventListener("click", () => {
    openCorrectionModal(container, session.id);
  });
}

async function openCorrectionModal(container, sessionId) {
  const session = await DB.getSession(sessionId);
  if (!session) return;

  const groups = [];
  for (let i = 0; i < session.exerciseLogs.length; i++) {
    const log = session.exerciseLogs[i];
    if (log.sets.length === 0) continue;
    const exercise = await DB.getExerciseById(log.exerciseId);
    groups.push({
      exerciseIndex: i,
      exerciseName: exercise ? exercise.name : "",
      sets: log.sets,
    });
  }

  const slot = container.querySelector("#correction-modal-slot");
  slot.innerHTML = `
    <div class="modal-overlay" id="correction-overlay">
      <div class="modal-sheet">
        <h3>Corriger une série de cette séance</h3>
        ${
          groups.length === 0
            ? `<p class="empty-state">Aucune série enregistrée pour l'instant.</p>`
            : groups
                .map(
                  (g) => `
            <div class="correction-exo-group">
              <div class="exo-name">${escapeHTML(g.exerciseName)}</div>
              ${g.sets
                .map(
                  (s, si) => `
                <div class="correction-set-row">
                  <span class="set-no">#${s.setNumber}</span>
                  <input type="number" step="0.5" min="0" data-exo="${g.exerciseIndex}" data-set="${si}" data-field="weight" value="${s.weight}" />
                  <span class="unit">kg</span>
                  <input type="number" step="1" min="0" data-exo="${g.exerciseIndex}" data-set="${si}" data-field="reps" value="${s.reps}" />
                  <span class="unit">reps</span>
                </div>
              `
                )
                .join("")}
            </div>
          `
                )
                .join("")
        }
        <button class="btn btn-primary" id="close-correction" type="button" style="margin-top:10px;">Fermer</button>
      </div>
    </div>
  `;

  slot.querySelectorAll(".correction-set-row input").forEach((input) => {
    input.addEventListener("change", async () => {
      const row = input.closest(".correction-set-row");
      const exoIdx = Number(input.dataset.exo);
      const setIdx = Number(input.dataset.set);
      const weight = parseFloat(row.querySelector('[data-field="weight"]').value);
      const reps = parseInt(row.querySelector('[data-field="reps"]').value, 10);
      if (isNaN(weight) || isNaN(reps)) return;
      await DB.editSet(sessionId, exoIdx, setIdx, weight, reps);
    });
  });

  slot.querySelector("#close-correction").addEventListener("click", () => {
    slot.innerHTML = "";
  });
}

async function showInputPhase(container, sessionId) {
  const session = await DB.getSession(sessionId);
  if (!session) {
    go("#/");
    return;
  }
  if (session.currentExerciseIndex >= session.exerciseLogs.length) {
    // Garde-fou : ne devrait pas arriver, on termine proprement.
    await DB.completeSession(sessionId);
    go("#/recap");
    return;
  }

  const routine = await DB.getRoutineById(session.routineId);
  const log = session.exerciseLogs[session.currentExerciseIndex];
  const exercise = await DB.getExerciseById(log.exerciseId);
  const lastSet = await DB.getLastSetForExercise(log.exerciseId);
  const setNumber = session.currentSetNumber;
  const isLastExercise =
    session.currentExerciseIndex === session.exerciseLogs.length - 1;

  container.innerHTML = `
    ${topBarHTML(routine)}
    <div class="exercise-name">${escapeHTML(exercise ? exercise.name : "")}</div>
    <div class="set-progress">Série ${setNumber}${setNumber > BASE_SETS ? " (supplémentaire)" : " / " + BASE_SETS}</div>

    <div class="input-row">
      <div class="input-group">
        <label>Poids (kg)</label>
        <input type="number" inputmode="decimal" step="0.5" min="0" id="weight-input"
          value="${lastSet ? lastSet.weight : ""}" placeholder="${lastSet ? "" : "—"}" />
      </div>
      <div class="input-group">
        <label>Répétitions</label>
        <input type="number" inputmode="numeric" step="1" min="0" id="reps-input"
          value="${lastSet ? lastSet.reps : ""}" placeholder="${lastSet ? "" : "—"}" />
      </div>
    </div>

    <button class="btn btn-primary" id="validate-btn" type="button">Valider la série</button>
  `;

  bindTopBar(container, session);

  container.querySelector("#validate-btn").addEventListener("click", async () => {
    const weight = parseFloat(container.querySelector("#weight-input").value);
    const reps = parseInt(container.querySelector("#reps-input").value, 10);
    if (isNaN(weight) || isNaN(reps)) return;
    const updated = await DB.logSet(sessionId, weight, reps);
    const justLoggedSetNumber = updated.currentSetNumber - 1;
    await showTimerPhase(container, sessionId, justLoggedSetNumber, isLastExercise);
  });
}

async function showTimerPhase(container, sessionId, justLoggedSetNumber, isLastExercise) {
  const session = await DB.getSession(sessionId);
  if (!session) {
    go("#/");
    return;
  }
  const routine = await DB.getRoutineById(session.routineId);
  let remaining = REST_SECONDS;

  container.innerHTML = `
    ${topBarHTML(routine)}
    <div class="timer-screen">
      <div class="timer-label">Récupération</div>
      <div class="timer-countdown" id="countdown">01:00</div>
      <a href="#" class="subtle-link" id="skip-link">Passer</a>
    </div>
  `;

  bindTopBar(container, session);

  const countdownEl = container.querySelector("#countdown");
  const updateDisplay = () => {
    const m = String(Math.floor(remaining / 60)).padStart(2, "0");
    const s = String(remaining % 60).padStart(2, "0");
    countdownEl.textContent = `${m}:${s}`;
  };

  let finished = false;
  const goNext = () => {
    if (finished) return;
    finished = true;
    clearInterval(intervalId);
    if (justLoggedSetNumber >= BASE_SETS) {
      showChoicePhase(container, sessionId, isLastExercise);
    } else {
      showInputPhase(container, sessionId);
    }
  };

  const intervalId = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      updateDisplay();
      goNext();
      return;
    }
    updateDisplay();
  }, 1000);

  container.querySelector("#skip-link").addEventListener("click", (e) => {
    e.preventDefault();
    goNext();
  });
}

async function showChoicePhase(container, sessionId, isLastExercise) {
  const session = await DB.getSession(sessionId);
  if (!session) {
    go("#/");
    return;
  }
  const routine = await DB.getRoutineById(session.routineId);

  container.innerHTML = `
    ${topBarHTML(routine)}
    <div class="exercise-name" style="margin-top:40px;">Série suivante ?</div>
    <div class="choice-stack">
      <button class="btn" id="add-set-btn" type="button">Ajouter une série</button>
      <button class="btn btn-primary" id="next-btn" type="button">${
        isLastExercise ? "Terminer la séance" : "Exercice suivant"
      }</button>
    </div>
  `;

  bindTopBar(container, session);

  container.querySelector("#add-set-btn").addEventListener("click", () => {
    showInputPhase(container, sessionId);
  });

  container.querySelector("#next-btn").addEventListener("click", async () => {
    if (isLastExercise) {
      await DB.completeSession(sessionId);
      go("#/recap");
    } else {
      await DB.advanceToNextExercise(sessionId);
      showInputPhase(container, sessionId);
    }
  });
}
