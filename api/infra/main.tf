data "external" "env" {
  program = ["${path.module}/source-env.sh"]
}

output "env" {
  value = data.external.env.result
}

resource "aws_ecr_repository" "fable_api_server" {
  name                 = data.external.env.result["SERVICE_NAME"]
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "fable-api-${local.env}"
    env  = local.env
  }
}

resource "aws_ecr_lifecycle_policy" "retention" {
  repository = aws_ecr_repository.fable_api_server.name
  policy     = file("policy.json")
}
