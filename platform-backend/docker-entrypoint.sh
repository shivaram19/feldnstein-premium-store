#!/usr/bin/env bash
# Pre-flight probe: print the effective DB wiring and test TCP reachability BEFORE Java
# starts, so a failed deploy's log shows whether the env vars even arrived.
echo "[startup-probe] DB_HOST=${DB_HOST:-<unset>} DB_PORT=${DB_PORT:-<unset>} DB_NAME=${DB_NAME:-<unset>} DB_USER=${DB_USER:-<unset>} DB_JDBC_URL=${DB_JDBC_URL:-<unset>}"

if [ -n "${DB_HOST}" ] && [ -n "${DB_PORT}" ]; then
  if timeout 6 bash -c "echo > /dev/tcp/${DB_HOST}/${DB_PORT}" 2>/dev/null; then
    echo "[startup-probe] TCP ${DB_HOST}:${DB_PORT} reachable"
  else
    echo "[startup-probe] TCP ${DB_HOST}:${DB_PORT} UNREACHABLE"
  fi
fi

exec java ${JAVA_OPTS} -jar quarkus-run.jar
