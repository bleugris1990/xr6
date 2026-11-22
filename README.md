# FitLog

Appli perso de suivi de musculation — PWA, 100% locale, thème sombre.

## Mise en ligne sur GitHub Pages (une fois)

1. Crée un nouveau dépôt sur GitHub (Settings → New repository). Peux être privé ou public, peu importe, c'est toi seul qui l'ouvriras.
2. Dans un terminal, place-toi dans ce dossier (`fitlog-pwa`) et exécute :

   ```bash
   git init
   git add .
   git commit -m "Première version de FitLog"
   git branch -M main
   git remote add origin https://github.com/TON-PSEUDO/TON-DEPOT.git
   git push -u origin main
   ```

3. Sur GitHub, va dans **Settings → Pages** de ton dépôt.
4. Sous "Build and deployment", choisis **Source : Deploy from a branch**, puis branche `main`, dossier `/ (root)`. Sauvegarde.
5. Attends 1-2 minutes, GitHub te donne une URL du type :
   `https://TON-PSEUDO.github.io/TON-DEPOT/`

## Installer l'appli sur ton Pixel 10

1. Ouvre cette URL dans **Chrome** sur ton téléphone.
2. Chrome propose normalement automatiquement "Ajouter à l'écran d'accueil" / "Installer l'application" (une bannière en bas, ou dans le menu ⋮ en haut à droite si elle n'apparaît pas).
3. Valide. Une icône FitLog apparaît sur ton écran d'accueil, elle s'ouvre en plein écran comme une appli normale.

C'est tout : pas de Play Store, pas de compte développeur.

## Pour la suite (mises à jour)

Quand le code change (nouvelles fonctionnalités, corrections) :

```bash
git add .
git commit -m "Description du changement"
git push
```

GitHub Pages republie automatiquement en 1-2 minutes. L'appli installée sur ton téléphone se met à jour toute seule au prochain lancement (grâce au service worker).

**Important** : si tu modifies le code, pense à changer `CACHE_NAME` dans `service-worker.js` (ex : `fitlog-v1` → `fitlog-v2`), sinon ton téléphone risque de continuer à utiliser l'ancienne version mise en cache au lieu de charger la nouvelle.

## Tes données

Tout est stocké uniquement sur ton téléphone (IndexedDB, dans Chrome). Rien n'est envoyé où que ce soit. Depuis l'onglet **Perso**, le bouton "Exporter en Excel" télécharge un fichier `.xlsx` avec tout ton historique (séances, routines, exercices, poids) — à faire régulièrement, par exemple après chaque séance, et à sauvegarder où tu veux (Drive, etc.) pour ne rien perdre en cas de changement de téléphone ou de nettoyage du cache de l'appli.

## Fonctionnement en bref

- **Routines** : créées une fois pour toutes (pas de modification après coup), possibilité de les désactiver/réactiver depuis l'onglet "Archivées".
- **Catalogue d'exercices** : partagé entre toutes les routines, un exercice garde son historique même s'il change de routine.
- **Séance** : poids/reps pré-remplis avec ta toute dernière série (peu importe la routine ou la date), minuteur de repos visuel de 60s, 3 séries de base par exercice + possibilité d'en ajouter, bouton de correction (retour) pour fixer une faute de frappe sans pouvoir refaire une série.
- **Reprise automatique** : si tu fermes l'appli en pleine séance, tu la retrouves exactement où tu en étais en rouvrant.
- **Stats** : un graphe de volume (poids × reps, somme des séries) par exercice, points colorés selon la routine d'origine.
- **Perso** : poids corporel (graphe), calendrier avec un point par routine effectuée et par jour, export Excel.
