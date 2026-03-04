# Branches – dépôt mobileapp RIPA

## Branche de travail : `travaille`

- On travaille sur la branche **`travaille`** pour les développements courants.
- Les commits doivent être **clairs** (messages explicites à chaque push).
- La fusion vers `main` se fait via **Pull Request** (workflow PCI DSS).

### Commandes utiles

```bash
# Créer et passer sur la branche travaille (une fois)
git checkout -b travaille

# Travailler, committer avec un message clair, pousser
git add .
git commit -m "feat(kyc): ajout écran formulaire KYC en 5 étapes"
git push origin travaille
```

### Exemples de messages de commit

- `feat(accueil): chargement des moyens de paiement depuis l’API`
- `fix(kyc): correction erreur 500 à l’envoi du dossier`
- `style(unlock): écran déverrouillage scrollable`
- `chore(deps): mise à jour expo-image-picker`

Ensuite : ouvrir une **Pull Request** `travaille` → `main` sur GitHub, revue puis merge.
