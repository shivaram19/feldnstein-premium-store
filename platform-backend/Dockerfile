# Multi-stage build: Maven builds the Quarkus app, a slim JRE image runs it.
# Built by GitHub Actions and deployed by Render (see render.yaml / ADR-0012).

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -q -B package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/quarkus-app ./
EXPOSE 8080
# Render free tier gives the container 512 MB — leave headroom for metaspace/threads
ENV JAVA_OPTS="-Xms128m -Xmx320m"
# Pre-flight probe: print the effective DB wiring and test TCP reachability BEFORE Java
# starts, so a failed deploy's log shows whether the env vars even arrived.
ENTRYPOINT ["bash", "-c", "\
  echo \"[startup-probe] DB_HOST=$${DB_HOST:-<unset>} DB_PORT=$${DB_PORT:-<unset>} DB_NAME=$${DB_NAME:-<unset>} DB_USER=$${DB_USER:-<unset>} DB_JDBC_URL=$${DB_JDBC_URL:-<unset>}\"; \
  if [ -n \"$${DB_HOST}\" ] && [ -n \"$${DB_PORT}\" ]; then \
    timeout 6 bash -c \"echo > /dev/tcp/$${DB_HOST}/$${DB_PORT}\" \
      && echo \"[startup-probe] TCP $${DB_HOST}:$${DB_PORT} reachable\" \
      || echo \"[startup-probe] TCP $${DB_HOST}:$${DB_PORT} UNREACHABLE\"; \
  fi; \
  exec java $${JAVA_OPTS} -jar quarkus-run.jar"]
