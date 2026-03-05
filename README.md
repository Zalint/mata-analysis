# Mata · Analysis

Outil d'analyse opérationnel pour Mata Group SA avec assistant IA intégré.

## Structure

```
mata-server/
├── server.js          # Serveur Node.js (auth + proxy API + static files)
├── package.json
├── public/
│   └── index.html     # L'outil d'analyse (tout-en-un)
└── README.md
```

## Lancer en local

```bash
# 1. Variables d'environnement
export ANTHROPIC_API_KEY=sk-ant-api03-xxx
export USER=saliou
export PASSWORD=monmotdepasse

# 2. Lancer le serveur
node server.js

# 3. Ouvrir http://localhost:3000
# → Page de login → entrer saliou / monmotdepasse
```

Par défaut (sans variables) : `mata` / `mata2026`

## Déployer sur Render

1. Push sur GitHub :
   ```bash
   cd mata-server
   git init && git add . && git commit -m "Mata Analysis v1"
   git remote add origin https://github.com/TON_USER/mata-analysis.git
   git push -u origin main
   ```

2. [render.com](https://render.com) → New → Web Service → connecter le repo

3. Configurer :
   - **Start Command** : `node server.js`
   - **Plan** : Free

4. **Environment Variables** (3 variables) :

   | Key | Value |
   |-----|-------|
   | `ANTHROPIC_API_KEY` | `sk-ant-api03-xxx` |
   | `USER` | `saliou` |
   | `PASSWORD` | `tonmotdepasse` |

5. Deploy → URL : `https://mata-analysis.onrender.com`

## Authentification

- Page `/login` avec formulaire utilisateur/mot de passe
- Session cookie (24h) — pas besoin de se reconnecter
- `/auth/logout` pour se déconnecter
- Toutes les routes sont protégées (HTML, API chat, fichiers statiques)

## Coût

- Hébergement Render Free : 0$
- Chat IA : ~0.02$/question (Claude Sonnet)
- Pas de npm install, zéro dépendance
