// screens/stats.js — un graphe de volume par exercice, point coloré par routine.

import { DB } from "../db.js";
import { renderVolumeChartSVG } from "../charts.js";
import { escapeHTML } from "../util.js";

export async function renderStats(container) {
  const exercises = await DB.getExercisesWithHistory();

  if (exercises.length === 0) {
    container.innerHTML = `
      <div class="screen-header"><h1 class="screen-title">Stats</h1></div>
      <div class="empty-state">Pas encore de séance terminée.<br>Tes graphes apparaîtront ici après ta première séance.</div>
    `;
    return;
  }

  const blocks = [];
  for (const exercise of exercises) {
    const history = await DB.getExerciseVolumeHistory(exercise.id);
    if (history.length === 0) continue;
    blocks.push(`
      <div class="exercise-chart-block">
        <div class="exo-title">${escapeHTML(exercise.name)}</div>
        <div class="chart-svg-wrap">${renderVolumeChartSVG(history)}</div>
      </div>
    `);
  }

  container.innerHTML = `
    <div class="screen-header"><h1 class="screen-title">Stats</h1></div>
    ${blocks.join("")}
  `;
}
