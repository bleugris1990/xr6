// app.js — point d'entrée : routage, navigation du bas, service worker.

import { go, setRenderer, currentHash } from "./router.js";
import { renderHome } from "./screens/home.js";
import { renderArchived } from "./screens/archived.js";
import { renderNewRoutine } from "./screens/newRoutine.js";
import { renderSession } from "./screens/session.js";
import { renderRecap } from "./screens/recap.js";
import { renderStats } from "./screens/stats.js";
import { renderPerso } from "./screens/perso.js";

const screenEl = document.getElementById("screen");
const navEl = document.getElementById("bottom-nav");

const routes = {
  "#/": { render: renderHome, nav: "routines", navVisible: true },
  "#/archived": { render: renderArchived, nav: "routines", navVisible: true },
  "#/new-routine": { render: renderNewRoutine, nav: null, navVisible: false },
  "#/session": { render: renderSession, nav: null, navVisible: false },
  "#/recap": { render: renderRecap, nav: null, navVisible: false },
  "#/stats": { render: renderStats, nav: "stats", navVisible: true },
  "#/perso": { render: renderPerso, nav: "perso", navVisible: true },
};

async function render() {
  const hash = currentHash();
  const route = routes[hash] || routes["#/"];

  screenEl.innerHTML = "";
  screenEl.scrollTop = 0;
  navEl.classList.toggle("hidden", !route.navVisible);
  screenEl.classList.toggle("no-nav-padding", !route.navVisible);

  document.querySelectorAll("#bottom-nav button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.nav === route.nav);
  });

  try {
    await route.render(screenEl);
  } catch (err) {
    console.error(err);
    screenEl.innerHTML = `<div class="empty-state">Une erreur est survenue.<br>Recharge l'appli.</div>`;
  }
}

setRenderer(render);
window.addEventListener("hashchange", render);

document.querySelectorAll("#bottom-nav button").forEach((btn) => {
  btn.addEventListener("click", () => go(btn.dataset.hash));
});

render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
