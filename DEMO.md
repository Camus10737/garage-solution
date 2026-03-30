# Commandes pour la démo

## 1. Lancer le backend

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload
```

> Le backend tourne sur http://localhost:8000

---

## 2. Lancer le frontend (nouveau terminal)

```bash
cd frontend
npm run dev
```

> L'app est accessible sur http://localhost:3000

---

## 3. Si Twilio / une dépendance manque

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

---

## En cas de problème

- Vérifier que `(venv)` apparaît dans le terminal avant de lancer uvicorn
- Les deux terminaux doivent rester ouverts pendant la démo
- Ne pas fermer VS Code pendant la démo
