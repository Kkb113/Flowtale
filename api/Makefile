.PHONY: teardown setup gen clean-data setup db-schema-migrate env

include env.now

teardown:
	docker compose down;

clean-data:
	docker rm fable-db; docker rm fable-db-flyway; docker volume rm api_mysql-data

setup:
	docker compose --profile ${APP_ENV} up -d

db-schema-migrate:
	docker compose up schema_api && docker compose up schema_analytics;

gen:
	mvn process-classes
	cp -r ./gen/api-contract.d.ts ../app/workspace/packages/common/src/api-contract.ts
	cp -r ./gen/api-contract.d.ts ../sqs_jobs/src/api-contract.ts

# --------------------------------------------------------------
# Different env file is required for different tool. Like idea
# needs env file in a different format which could be loaded via
# env plugin. This commands generate those file format.
# This is the first command that needs to be ran
# --------------------------------------------------------------
env:
	@echo "Generating env file"
	@echo "docker compose version must be >= 1.28.0. docker compose version found (see below)"

	@if [ "$(staging)" ]; then \
        cp env.staging env.now; \
        sed -r 's/^export[[:space:]]+//' env.staging > env.idea; \
        echo "[staging]"; \
    elif [ "$(dev)" ]; then \
        sed -r 's/^export[[:space:]]+//' env.dev > env.idea; \
        cp env.dev env.now; \
        echo "[dev]"; \
    elif [ "$(prod)" ]; then \
        cp env.prod env.now && \
        `aws ssm get-parameters-by-path --region us-east-2 --path / | jq -r '.Parameters[] | "export \(.Name)=\(.Value)"' >> env.now` && \
        sed -i -e 's/prod\.api\.//' env.now && \
        sed -r 's/^export[[:space:]]+//' env.now > env.idea && \
        echo "[PROD!!!]"; \
    else \
        echo "Not known. Allowed [ide, staging, dev, prod]"; \
    fi


# --------------------------------------------------------------
# Command for application build + execution steps
# --------------------------------------------------------------
build:
	mvn clean compile

run:
	mvn spring-boot:run

containerize: export SERVICE_NAME=`jq -r '.SERVICE_NAME' service.json`
containerize: export AWS_ORG=`aws sts get-caller-identity --query "Account" --output text`
containerize: export AWS_REGION=ap-southeast-1
containerize: export ECR_IMAGE_TAG=$(AWS_ORG).dkr.ecr.$(AWS_REGION).amazonaws.com/$(SERVICE_NAME):$(v)
containerize:
	@if [ -z "$(v)" ]; then \
        echo "[v]ersion is mandatory. Usage: make containerize v=2.1.0"; \
        false ; \
	fi
	@echo "ECR tag: $(ECR_IMAGE_TAG)"
	docker build -t $(SERVICE_NAME) -t $(ECR_IMAGE_TAG) .
	aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(AWS_ORG).dkr.ecr.$(AWS_REGION).amazonaws.com
	docker push $(ECR_IMAGE_TAG)

# If you are running this in local make sure in env.idea file
# DB_CONN_URL=jdbc:mysql://host.docker.internal:3306 is set
container-run:
	sed -r 's/^export[[:space:]]+//' env.now > env.dkr.tmp
	sed -r 's/\\#/#/' env.dkr.tmp > env.dkr
	rm env.dkr.tmp
	docker rm fa; docker run --name fa --env-file env.dkr -p 8080:8080 fable-api
