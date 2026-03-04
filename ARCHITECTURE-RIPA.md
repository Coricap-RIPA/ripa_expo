# Architecture RIPA – mobileapp

## Charte graphique (à respecter partout)

- **Couleurs** : primaire `#270345`, secondaire `#A59AF7`, tertiaire `#FFFFFF`, quatrième `#000000`
- **Polices** : Microgramma Bold Extended (titres / logo), Roboto (texte)
- Fichier de thème : **`src/constants/theme.js`** (import : `import { colors, fonts } from '../constants/theme'`)

## Structure des dossiers

```
mobileapp/
├── App.js
├── app.json
├── assets/
│   ├── fonts/       ← Polices (Microgramma, Roboto)
│   └── images/      ← Logo, splash
└── src/
    ├── components/  ← Composants réutilisables
    ├── constants/   ← theme.js (charte)
    ├── context/     ← ApiContext
    ├── navigation/   ← RootNavigator
    ├── screens/      ← Loader, Welcome, Inscription, OTP, Accueil
    ├── services/     ← api.js, storage.js
    └── utils/        ← Validation, formatage
```

Phase 1 : interfaces et code à venir au prochain go.
