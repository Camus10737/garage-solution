"""
Migration unique vers l'architecture multi-tenant (P9a).

Crée un premier garage, provisionne un compte Firebase existant comme Admin de ce garage
(`users/{uid}`), et tague `garage_id` sur tous les documents déjà présents dans les collections en
usage. Le document unique `parametres/general` est déplacé vers `parametres/{garage_id}`.

Aperçu par défaut (aucune écriture) — ajouter --apply pour exécuter réellement.

Usage :
  python scripts/migrate_multitenant.py --email admin@example.com
  python scripts/migrate_multitenant.py --email admin@example.com --apply
"""
import argparse
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(override=True)

from firebase_admin import auth

from core.firebase import get_db

COLLECTIONS = [
    "clients", "commandes_fournisseur", "commandes_speciales", "devis", "factures",
    "fournisseurs", "modeles_rappel", "mouvements_stock", "notifications", "pieces",
    "promotions", "rappels_envoyes", "rendez_vous", "services", "vehicules",
]

NOM_GARAGE_DEFAUT = "Mon Garage"
TAILLE_LOT = 400  # limite Firestore par batch : 500 opérations


def _tagger_collection(db, coll: str, garage_id: str) -> int:
    docs_a_tagger = [d for d in db.collection(coll).stream() if not d.to_dict().get("garage_id")]
    for i in range(0, len(docs_a_tagger), TAILLE_LOT):
        batch = db.batch()
        for doc in docs_a_tagger[i:i + TAILLE_LOT]:
            batch.update(doc.reference, {"garage_id": garage_id})
        batch.commit()
    return len(docs_a_tagger)


def main():
    parser = argparse.ArgumentParser(description="Migration vers l'architecture multi-tenant")
    parser.add_argument("--email", required=True, help="Email du compte Firebase à provisionner comme Admin")
    parser.add_argument("--apply", action="store_true", help="Exécute réellement la migration (sinon, aperçu seul)")
    args = parser.parse_args()

    db = get_db()

    try:
        user = auth.get_user_by_email(args.email)
    except auth.UserNotFoundError:
        print(f"Aucun utilisateur Firebase trouvé pour {args.email}")
        return
    print(f"Utilisateur trouvé : {user.uid} ({user.email})")

    print("\n--- Aperçu ---")
    for coll in COLLECTIONS:
        n = len(list(db.collection(coll).stream()))
        print(f"  {coll}: {n} document(s)")
    parametres_doc = db.collection("parametres").document("general").get()
    print(f"  parametres/general: {'existe' if parametres_doc.exists else 'absent'}")

    if not args.apply:
        print("\nAperçu seul (pas de --apply). Aucune écriture effectuée.")
        return

    print("\n--- Application ---")
    now = datetime.now(timezone.utc).isoformat()

    garage_ref = db.collection("garages").document()
    garage_ref.set({"nom": NOM_GARAGE_DEFAUT, "date_creation": now})
    garage_id = garage_ref.id
    print(f"Garage créé : {garage_id}")

    db.collection("users").document(user.uid).set({
        "garage_id": garage_id,
        "role": "admin",
        "actif": True,
        "date_creation": now,
    })
    print(f"Utilisateur provisionné : {user.uid} -> garage {garage_id}, role admin")

    for coll in COLLECTIONS:
        n = _tagger_collection(db, coll, garage_id)
        print(f"  {coll}: {n} document(s) tagués")

    if parametres_doc.exists:
        db.collection("parametres").document(garage_id).set(parametres_doc.to_dict())
        db.collection("parametres").document("general").delete()
        print(f"  parametres: migré de 'general' vers '{garage_id}'")

    print(f"\nMigration terminée. garage_id = {garage_id}")


if __name__ == "__main__":
    main()
