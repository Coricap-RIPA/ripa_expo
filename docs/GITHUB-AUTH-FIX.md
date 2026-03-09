# Résoudre l'erreur 401 / Authentication failed avec GitHub

## Ce que signifient les messages

- **401 / Missing or invalid credentials** : GitHub refuse ton identifiant (mot de passe ou token invalide/expiré).
- **Repository not found** : Soit le dépôt n’existe pas, soit ton compte n’a pas le droit d’y accéder (organisation **Coricap-RIPA**).

---

## 1. Vérifier le dépôt et tes droits

1. Ouvre **https://github.com/Coricap-RIPA/ripa_expo** dans le navigateur (en étant connecté à GitHub).
2. Si tu vois une 404 ou "Not found" : le dépôt n’existe pas ou tu n’es pas membre de l’organisation **Coricap-RIPA** avec accès à ce repo.
3. Si le dépôt existe : **Settings** du repo → vérifier que ton compte (ou ton équipe) a les droits **Write** ou **Admin**.

---

## 2. Ne plus utiliser le mot de passe (HTTPS)

GitHub n’accepte plus le mot de passe pour `git push` en HTTPS. Il faut utiliser un **Personal Access Token (PAT)**.

### Créer un token (Classic)

1. GitHub → **Settings** (ton profil, en haut à droite) → **Developer settings** (menu de gauche) → **Personal access tokens** → **Tokens (classic)**.
2. **Generate new token (classic)**.
3. Donne un nom (ex. `ripa-expo-push`), choisis une expiration (ex. 90 jours ou No expiration).
4. Coche au minimum : **repo** (accès aux dépôts).
5. **Generate token** → **copie le token** tout de suite (il ne sera plus affiché).

### Utiliser le token pour push

Quand Git demande le mot de passe, **colle le token** (et non ton mot de passe GitHub).

Pour ne pas le retaper à chaque fois :

```bash
# Option A : Git te demandera user + token une fois, puis les enregistrera (macOS Keychain)
git config --global credential.helper osxkeychain
git push -u origin main
# Username : ton identifiant GitHub
# Password : colle le PAT (token)
```

---

## 3. Utiliser SSH (recommandé, plus simple à long terme)

Avec SSH, plus besoin de saisir token à chaque push.

### Vérifier si tu as déjà une clé SSH

```bash
ls -la ~/.ssh
# Tu cherches id_ed25519.pub ou id_rsa.pub
```

### Créer une clé SSH (si besoin)

```bash
ssh-keygen -t ed25519 -C "ton-email@example.com"
# Entrée pour accepter le chemin par défaut, puis mot de passe (optionnel)
```

### Ajouter la clé à GitHub

1. Affiche la clé publique :
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
2. GitHub → **Settings** → **SSH and GPG keys** → **New SSH key**.
3. Colle le contenu de `id_ed25519.pub`, donne un titre, **Add SSH key**.

### Changer l’URL du remote en SSH

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/ripa/mobileapp

# Remplacer HTTPS par SSH
git remote set-url origin git@github.com:Coricap-RIPA/ripa_expo.git

# Vérifier
git remote -v

# Tester le push
git push -u origin main
```

Si c’est la première fois, macOS peut demander de confirmer l’empreinte de GitHub (taper `yes`).

---

## 4. Si « Repository not found » alors que le dépôt existe

- Tu n’es pas connecté au bon compte : vérifie avec `gh auth status` (si tu as GitHub CLI) ou en ouvrant github.com en navigation privée et en te connectant avec le compte qui a accès à **Coricap-RIPA/ripa_expo**.
- Le dépôt est sous une **organisation** : un admin doit t’ajouter au repo (ou à l’équipe qui y a accès).
- Nom du repo : confirmer qu’il s’agit bien de **ripa_expo** (sans faute de frappe).

---

## 5. Effacer des identifiants incorrects (macOS)

Si Git continue à utiliser un ancien mot de passe ou un mauvais token :

1. **Trousseau d’accès** (Keychain Access) → chercher **github.com**.
2. Supprimer l’entrée liée à GitHub.
3. Refaire un `git push` : Git redemandera identifiant + token (ou utiliser SSH).

En ligne de commande :

```bash
git credential-osxkeychain erase
host=github.com
protocol=https
# Puis Entrée deux fois
```

---

## Récapitulatif rapide

| Problème | Action |
|----------|--------|
| 401 / credentials | Utiliser un **Personal Access Token** au lieu du mot de passe, ou passer en **SSH**. |
| Repository not found | Vérifier que **ripa_expo** existe sous **Coricap-RIPA** et que ton compte a les droits **Write**. |
| Toujours 401 après token | Changer l’URL en SSH : `git remote set-url origin git@github.com:Coricap-RIPA/ripa_expo.git` puis `git push`. |
