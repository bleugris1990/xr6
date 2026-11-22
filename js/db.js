// db.js — couche de données IndexedDB pour FitLog.
// Un seul fichier, pas de framework : stores "exercises", "routines", "sessions", "bodyWeights".

const DB_NAME = "fitlog";
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("exercises")) {
        db.createObjectStore("exercises", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("routines")) {
        db.createObjectStore("routines", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("sessions")) {
        db.createObjectStore("sessions", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("bodyWeights")) {
        db.createObjectStore("bodyWeights", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode = "readonly") {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        resolve({ store, transaction });
      })
  );
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function uid() {
  return (
    Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10)
  );
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function getAll(storeName) {
  const { store } = await tx(storeName, "readonly");
  return reqToPromise(store.getAll());
}

async function getOne(storeName, id) {
  const { store } = await tx(storeName, "readonly");
  return reqToPromise(store.get(id));
}

async function putOne(storeName, obj) {
  const { store, transaction } = await tx(storeName, "readwrite");
  store.put(obj);
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(obj);
    transaction.onerror = () => reject(transaction.error);
  });
}

// ---------- Exercices ----------

async function addOrGetExercise(name) {
  const clean = name.trim();
  if (!clean) throw new Error("Nom d'exercice vide");
  const all = await getAll("exercises");
  const existing = all.find(
    (e) => e.name.toLowerCase() === clean.toLowerCase()
  );
  if (existing) return existing;
  const exercise = { id: uid(), name: clean, createdAt: Date.now() };
  await putOne("exercises", exercise);
  return exercise;
}

async function getExercises() {
  const all = await getAll("exercises");
  return all.sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

async function getExerciseById(id) {
  return getOne("exercises", id);
}

// ---------- Routines ----------

async function createRoutine({ name, color, exerciseIds }) {
  const clean = name.trim();
  if (!clean) throw new Error("Nom de routine vide");
  if (!exerciseIds || exerciseIds.length === 0) {
    throw new Error("Une routine doit contenir au moins un exercice");
  }
  const routine = {
    id: uid(),
    name: clean,
    color,
    exerciseIds: exerciseIds.slice(),
    active: true,
    createdAt: Date.now(),
  };
  await putOne("routines", routine);
  return routine;
}

async function getRoutines() {
  const all = await getAll("routines");
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

async function getRoutineById(id) {
  return getOne("routines", id);
}

async function setRoutineActive(id, active) {
  const routine = await getOne("routines", id);
  if (!routine) throw new Error("Routine introuvable");
  routine.active = active;
  await putOne("routines", routine);
  return routine;
}

// ---------- Séances (sessions) ----------

async function getInProgressSession() {
  const all = await getAll("sessions");
  return all.find((s) => s.status === "in_progress") || null;
}

async function createSession(routineId) {
  const existing = await getInProgressSession();
  if (existing) {
    throw new Error("Une séance est déjà en cours");
  }
  const routine = await getRoutineById(routineId);
  if (!routine) throw new Error("Routine introuvable");

  const session = {
    id: uid(),
    routineId: routine.id,
    date: todayISO(),
    startedAt: Date.now(),
    endedAt: null,
    status: "in_progress",
    currentExerciseIndex: 0,
    currentSetNumber: 1,
    exerciseLogs: routine.exerciseIds.map((exId) => ({
      exerciseId: exId,
      sets: [],
    })),
  };
  await putOne("sessions", session);
  return session;
}

async function getSession(id) {
  return getOne("sessions", id);
}

async function getAllSessions() {
  return getAll("sessions");
}

async function getCompletedSessions() {
  const all = await getAll("sessions");
  return all
    .filter((s) => s.status === "completed")
    .sort((a, b) => a.startedAt - b.startedAt);
}

// Dernière série jamais enregistrée pour un exercice donné, toutes séances
// confondues (y compris la séance en cours), triée par horodatage décroissant.
async function getLastSetForExercise(exerciseId) {
  const all = await getAll("sessions");
  let best = null;
  for (const session of all) {
    for (const log of session.exerciseLogs) {
      if (log.exerciseId !== exerciseId) continue;
      for (const set of log.sets) {
        if (!best || set.timestamp > best.timestamp) {
          best = set;
        }
      }
    }
  }
  return best;
}

async function logSet(sessionId, weight, reps) {
  const session = await getSession(sessionId);
  if (!session) throw new Error("Séance introuvable");
  const log = session.exerciseLogs[session.currentExerciseIndex];
  if (!log) throw new Error("Exercice introuvable dans la séance");
  log.sets.push({
    setNumber: session.currentSetNumber,
    weight,
    reps,
    timestamp: Date.now(),
  });
  session.currentSetNumber += 1;
  await putOne("sessions", session);
  return session;
}

async function editSet(sessionId, exerciseIndex, setIndex, weight, reps) {
  const session = await getSession(sessionId);
  if (!session) throw new Error("Séance introuvable");
  const log = session.exerciseLogs[exerciseIndex];
  if (!log || !log.sets[setIndex]) throw new Error("Série introuvable");
  log.sets[setIndex].weight = weight;
  log.sets[setIndex].reps = reps;
  await putOne("sessions", session);
  return session;
}

async function advanceToNextExercise(sessionId) {
  const session = await getSession(sessionId);
  if (!session) throw new Error("Séance introuvable");
  session.currentExerciseIndex += 1;
  session.currentSetNumber = 1;
  await putOne("sessions", session);
  return session;
}

async function completeSession(sessionId) {
  const session = await getSession(sessionId);
  if (!session) throw new Error("Séance introuvable");
  session.status = "completed";
  session.endedAt = Date.now();
  await putOne("sessions", session);
  return session;
}

// ---------- Stats routines (page d'accueil) ----------

async function getRoutineHomeStats(routineId) {
  const completed = await getCompletedSessions();
  const forRoutine = completed.filter((s) => s.routineId === routineId);
  const count = forRoutine.length;
  const last = forRoutine.reduce(
    (max, s) => (!max || s.date > max ? s.date : max),
    null
  );
  return { count, lastDate: last };
}

// ---------- Stats par exercice (page Stats) ----------

// Retourne [{date, volume, routineId, routineColor}] trié par date croissante
async function getExerciseVolumeHistory(exerciseId) {
  const completed = await getCompletedSessions();
  const routines = await getRoutines();
  const routineById = new Map(routines.map((r) => [r.id, r]));
  const points = [];
  for (const session of completed) {
    const log = session.exerciseLogs.find((l) => l.exerciseId === exerciseId);
    if (!log || log.sets.length === 0) continue;
    const volume = log.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
    const routine = routineById.get(session.routineId);
    points.push({
      date: session.date,
      timestamp: session.startedAt,
      volume,
      routineId: session.routineId,
      routineColor: routine ? routine.color : "#888888",
    });
  }
  points.sort((a, b) => a.timestamp - b.timestamp);
  return points;
}

// Liste des exercices ayant au moins une séance terminée, triés par usage
// le plus récent en premier.
async function getExercisesWithHistory() {
  const completed = await getCompletedSessions();
  const lastUse = new Map();
  for (const session of completed) {
    for (const log of session.exerciseLogs) {
      if (log.sets.length === 0) continue;
      const prev = lastUse.get(log.exerciseId) || 0;
      if (session.startedAt > prev) lastUse.set(log.exerciseId, session.startedAt);
    }
  }
  const exercises = await getExercises();
  return exercises
    .filter((e) => lastUse.has(e.id))
    .sort((a, b) => lastUse.get(b.id) - lastUse.get(a.id));
}

// ---------- Poids corporel ----------

async function addBodyWeight(weight, date = null) {
  const entry = {
    id: uid(),
    date: date || todayISO(),
    weight,
    createdAt: Date.now(),
  };
  await putOne("bodyWeights", entry);
  return entry;
}

async function getBodyWeights() {
  const all = await getAll("bodyWeights");
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

// ---------- Calendrier (page Perso) ----------

// Retourne une Map "YYYY-MM-DD" -> [couleurs des routines faites ce jour-là]
async function getCalendarColorsForMonth(year, month) {
  // month: 0-11
  const completed = await getCompletedSessions();
  const routines = await getRoutines();
  const routineById = new Map(routines.map((r) => [r.id, r]));
  const map = new Map();
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  for (const session of completed) {
    if (!session.date.startsWith(prefix)) continue;
    const routine = routineById.get(session.routineId);
    const color = routine ? routine.color : "#888888";
    if (!map.has(session.date)) map.set(session.date, []);
    map.get(session.date).push(color);
  }
  return map;
}

// ---------- Export (brut, utilisé par export.js) ----------

async function getExportData() {
  const [exercises, routines, sessions, bodyWeights] = await Promise.all([
    getExercises(),
    getRoutines(),
    getAllSessions(),
    getBodyWeights(),
  ]);
  return { exercises, routines, sessions, bodyWeights };
}

export const DB = {
  uid,
  todayISO,
  dateISO,
  addOrGetExercise,
  getExercises,
  getExerciseById,
  createRoutine,
  getRoutines,
  getRoutineById,
  setRoutineActive,
  getInProgressSession,
  createSession,
  getSession,
  getAllSessions,
  getCompletedSessions,
  getLastSetForExercise,
  logSet,
  editSet,
  advanceToNextExercise,
  completeSession,
  getRoutineHomeStats,
  getExerciseVolumeHistory,
  getExercisesWithHistory,
  addBodyWeight,
  getBodyWeights,
  getCalendarColorsForMonth,
  getExportData,
};
