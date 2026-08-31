# ---- Build stage: compile the WAR with Maven ----
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
# Download dependencies first so they're cached across rebuilds unless
# pom.xml itself changes (much faster re-deploys).
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B clean package -DskipTests

# ---- Runtime stage: run the WAR on Tomcat ----
FROM tomcat:11.0-jdk17-temurin
# Remove Tomcat's default sample apps -- we only want ours.
RUN rm -rf /usr/local/tomcat/webapps/*
# Deploy as ROOT so the app is served at "/" (its frontend uses relative
# paths that assume that context path).
COPY --from=build /app/target/*.war /usr/local/tomcat/webapps/ROOT.war
# Render's web services expect the container to listen on port 10000.
RUN sed -i 's/port="8080"/port="10000"/' /usr/local/tomcat/conf/server.xml
EXPOSE 10000
CMD ["catalina.sh", "run"]
