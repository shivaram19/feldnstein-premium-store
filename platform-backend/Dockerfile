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
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
EXPOSE 8080
# Render free tier gives the container 512 MB — leave headroom for metaspace/threads
ENV JAVA_OPTS="-Xms128m -Xmx320m"
ENTRYPOINT ["bash", "/app/docker-entrypoint.sh"]
