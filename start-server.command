#!/bin/bash
cd "$(dirname "$0")" || exit 1

python3 serve.py
status=$?

if [ "$status" -ne 0 ]; then
    echo
    echo "Le serveur s'est arrêté avec une erreur (code $status)."
fi

read -r -p "Appuyez sur Entrée pour fermer cette fenêtre..."
