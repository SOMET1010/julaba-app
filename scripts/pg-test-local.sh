#!/usr/bin/env bash
# Postgres JETABLE pour les tests d'invariants (backend).
#
# Les invariants bootent l'app Nest complete contre une vraie base : c'est la
# seule maniere de prouver qu'une requete SQL brute s'execute vraiment. Sans
# base, `npm run test:invariants` ne tourne pas du tout, et on se retrouve a
# ne valider que des tests unitaires - qui observent le SQL sans jamais
# l'executer. Un defaut comme « la colonne n'existe pas » leur echappe
# entierement.
#
#   ./scripts/pg-test-local.sh start   # demarre (idempotent)
#   ./scripts/pg-test-local.sh stop
#   ./scripts/pg-test-local.sh status
#
# Puis : npm run test:invariants -w backend
#
# Le port 55432 et l'utilisateur julaba_user sont ceux attendus par
# backend/test/invariants/test-db.ts. La base elle-meme est recreee (DROP +
# CREATE) par le globalSetup a chaque execution : ce script ne fournit que le
# serveur.
#
# Jamais destine a la production : authentification `trust`, donnees jetables.
set -euo pipefail

PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PGDATA="${PGDATA:-/var/lib/postgresql/testdata}"
PORT="${PGPORT:-55432}"
USER_DB="${DB_USERNAME:-julaba_user}"

export PATH="$PGBIN:$PATH"

# initdb et postgres refusent de tourner en root : on delegue au compte
# postgres, et PGDATA doit vivre dans un repertoire qu'il peut traverser
# (un repertoire de travail personnel ne l'est generalement pas).
run_as_pg() {
  if [ "$(id -u)" = "0" ]; then
    su postgres -c "PATH=$PGBIN:\$PATH $1"
  else
    bash -c "PATH=$PGBIN:\$PATH $1"
  fi
}

case "${1:-start}" in
  start)
    if [ "$(id -u)" = "0" ]; then
      id postgres >/dev/null 2>&1 || useradd -m postgres
      mkdir -p "$PGDATA"
      chown postgres "$PGDATA"
    fi
    if [ ! -d "$PGDATA/base" ]; then
      echo "→ initdb ($PGDATA)"
      run_as_pg "initdb -D $PGDATA -U $USER_DB --auth=trust" >/dev/null
    fi
    if pg_isready -h 127.0.0.1 -p "$PORT" >/dev/null 2>&1; then
      echo "✓ deja demarre sur le port $PORT"
    else
      run_as_pg "pg_ctl -D $PGDATA -o '-p $PORT -k /tmp' -l $PGDATA/log start" >/dev/null
      sleep 2
    fi
    pg_isready -h 127.0.0.1 -p "$PORT"
    ;;
  stop)
    run_as_pg "pg_ctl -D $PGDATA stop" || true
    ;;
  status)
    pg_isready -h 127.0.0.1 -p "$PORT" || true
    ;;
  *)
    echo "usage: $0 {start|stop|status}" >&2
    exit 2
    ;;
esac
