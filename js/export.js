// export.js — génère un fichier .xlsx à partir des données locales (SheetJS vendorisé).

import { DB } from "./db.js";

function formatDateTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

// Construit les lignes de chaque feuille à partir des données brutes.
// Fonction pure (pas d'accès à XLSX ni au DOM) pour rester testable facilement.
export function buildExportSheets({ exercises, routines, sessions, bodyWeights }) {
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const routineById = new Map(routines.map((r) => [r.id, r]));

  // ---- Feuille "Séances" (une ligne par série) ----
  const seancesRows = [];
  for (const session of sessions) {
    const routine = routineById.get(session.routineId);
    for (const log of session.exerciseLogs) {
      const exercise = exerciseById.get(log.exerciseId);
      for (const set of log.sets) {
        seancesRows.push({
          Date: session.date,
          Routine: routine ? routine.name : "(supprimée)",
          Statut: session.status === "completed" ? "Terminée" : "En cours",
          Exercice: exercise ? exercise.name : "(inconnu)",
          "N° série": set.setNumber,
          "Poids (kg)": set.weight,
          Répétitions: set.reps,
          "Volume série": +(set.weight * set.reps).toFixed(2),
          Horodatage: formatDateTime(set.timestamp),
        });
      }
    }
  }

  // ---- Feuille "Routines" ----
  const routinesRows = routines.map((r) => ({
    Nom: r.name,
    Couleur: r.color,
    Statut: r.active ? "Active" : "Archivée",
    "Nb exercices": r.exerciseIds.length,
    "Créée le": formatDateTime(r.createdAt),
  }));

  // ---- Feuille "Exercices" ----
  const exercicesRows = exercises.map((e) => ({
    Nom: e.name,
    "Créé le": formatDateTime(e.createdAt),
  }));

  // ---- Feuille "Poids corporel" ----
  const poidsRows = bodyWeights.map((w) => ({
    Date: w.date,
    "Poids (kg)": w.weight,
  }));

  return {
    Séances: seancesRows,
    Routines: routinesRows,
    Exercices: exercicesRows,
    "Poids corporel": poidsRows,
  };
}

export function buildFilename(now = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `fitlog_export_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}_${pad(now.getHours())}h${pad(now.getMinutes())}.xlsx`;
}

export async function exportToExcel() {
  if (typeof XLSX === "undefined") {
    throw new Error("Librairie d'export non chargée");
  }

  const data = await DB.getExportData();
  const sheets = buildExportSheets(data);

  const wb = XLSX.utils.book_new();
  for (const [sheetName, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName);
  }

  const filename = buildFilename();
  XLSX.writeFile(wb, filename);
  return filename;
}
