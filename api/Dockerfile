FROM maven:3.8.3-openjdk-17 as builder

WORKDIR /tmp/api

COPY pom.xml ./pom.xml
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B clean package -Dmaven.test.skip=true

FROM openjdk:17.0.1-jdk-slim

EXPOSE 8080

COPY --from=builder /tmp/api/target/api-*.jar /usr/local/fable/api.jar
ENTRYPOINT ["java", "-jar", "/usr/local/fable/api.jar"]

