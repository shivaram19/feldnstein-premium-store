# Feldnstein Platform — Backend

Quarkus 3.20 / Java 21 demo skeleton (see ADR-0003, ADR-0004). Dev profile runs on
in-memory H2; production profile targets PostgreSQL via `docker-compose.yml`.

## Run

> This machine has a JRE-only system Java. A full JDK 21 lives in
> `../.tools/jdk-21` — point `JAVA_HOME` at it (the wrapper does not do this
> automatically):
> `export JAVA_HOME=$PWD/../.tools/jdk-21` (from `platform-backend/`, or use an
> absolute path).

1. **Dev mode (H2):** `./mvnw quarkus:dev` — or, without the wrapper,
   `../.tools/apache-maven-3.9.9/bin/mvn quarkus:dev`
2. **PostgreSQL (real DB):** `docker compose up -d`
3. **OpenAPI UI:** http://localhost:8080/q/swagger-ui

CRUD endpoints (rest-data-panache): `/products`, `/stock-movements`,
`/purchase-orders`, `/loyalty-accounts`, `/loyalty-transactions`.
Analytics: `GET /analytics/summary`.
