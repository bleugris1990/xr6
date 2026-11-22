// screens/recap.js — écran de fin de séance.

import { DB } from "../db.js";
import { go } from "../router.js";
import { escapeHTML, formatDuration } from "../util.js";

export async function renderRecap(container) {
  const completed = await DB.getCompletedSessions();
  const session = completed[completed.length - 1];
  if (!session) {
    go("#/");
    return;
  }

  const routine = await DB.getRoutineById(session.routineId);
  const duration = session.endedAt - session.startedAt;

  let totalVolume = 0;
  const blocks = [];
  for (const log of session.exerciseLogs) {
    if (log.sets.length === 0) continue;
    const exercise = await DB.getExerciseById(log.exerciseId);
    const volume = log.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
    totalVolume += volume;
    blocks.push({
      name: exercise ? exercise.name : "",
      nbSets: log.sets.length,
      volume,
    });
  }

  container.innerHTML = `
    <div class="recap-hero">
      <div style="color:var(--text-dim); font-size:14px;">${escapeHTML(routine ? routine.name : "")} — séance terminée</div>
      <div class="duration">${formatDuration(duration)}</div>
      <div class="sub">${blocks.length} exercice${blocks.length > 1 ? "s" : ""} · volume total ${Math.round(totalVolume)} kg</div>
    </div>
    ${blocks
      .map(
        (b) => `
      <div class="recap-exercise">
        <div class="name">${escapeHTML(b.name)}</div>
        <div class="detail">${b.nbSets} série${b.nbSets > 1 ? "s" : ""} · volume ${Math.round(b.volume)} kg</div>
      </div>
    `
      )
      .join("")}
    <button class="btn btn-primary" id="home-btn" type="button" style="margin-top:20px;">Retour à l'accueil</button>
  `;

  container.querySelector("#home-btn").addEventListener("click", () => go("#/"));
}
