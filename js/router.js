// router.js — routage minimal par hash, sans dépendance.

let renderFn = null;

export function setRenderer(fn) {
  renderFn = fn;
}

// Navigue vers un hash. Si on y est déjà (cas des écrans qui gèrent leur
// propre sous-état, ex: #/session), force un nouveau rendu du routeur.
export function go(hash) {
  if (location.hash === hash) {
    if (renderFn) renderFn();
  } else {
    location.hash = hash;
  }
}

export function currentHash() {
  return location.hash && location.hash.length > 1 ? location.hash : "#/";
}
