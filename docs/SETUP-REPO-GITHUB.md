# Mise en place du dépôt GitHub – ripa_expo (app mobile)

## 1. Sur GitHub : vider le dépôt ripa_expo

Deux options :

### Option A – Tout supprimer et repartir (recommandé si le repo est récent)

1. GitHub → dépôt **ripa_expo** → **Settings** (onglet du repo).
2. Descendre jusqu’à **Danger zone**.
3. Cliquer **Delete this repository** (écrire le nom du repo pour confirmer).
4. Créer un **nouveau dépôt** vide :
   - **New repository** → Nom : `ripa_expo` (ou le même nom).
   - Ne cocher **ni** README, **ni** .gitignore, **ni** licence (repo vide).
   - **Create repository**.

### Option B – Garder le repo mais vider la branche main

1. En local (après avoir fait ton premier commit et renommé la branche en `main`) :
   ```bash
   git remote add origin https://github.com/TON_USER/ripa_expo.git
   git push -f origin main
   ```
   Cela remplace l’historique sur GitHub par ton dépôt local (main vide ou avec ton premier commit).

---

## 2. En local : branches main et travail

À exécuter dans le dossier **mobileapp** (là où tu as fait `git init`).

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/ripa/mobileapp

# Tout ajouter et premier commit
git add .
git commit -m "chore: initial commit app mobile RIPA (Expo)"

# Renommer la branche en main
git branch -M main

# Remplacer TON_USER par ton identifiant GitHub
git remote add origin https://github.com/TON_USER/ripa_expo.git

# Pousser main (la première fois)
git push -u origin main

# Créer la branche travail et la pousser
git checkout -b travail
git push -u origin travail
```

---

## 3. Ouvrir une Pull Request

1. Va sur **https://github.com/TON_USER/ripa_expo**.
2. Un bandeau peut proposer **Compare & pull request** pour la branche `travail`.
3. Sinon : **Pull requests** → **New pull request**.
4. **Base** : `main` ← **Compare** : `travail`.
5. Titre ex. : `Initialisation app mobile RIPA`.
6. **Create pull request**.

---

## 4. Demain : après validation (merge) de la PR

En local :

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/ripa/mobileapp

# Revenir sur main
git checkout main

# Récupérer le merge fait sur GitHub
git pull origin main
```

Ensuite tu peux continuer à travailler sur `travail` (ou créer une nouvelle branche pour la prochaine feature).
