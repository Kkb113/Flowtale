terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket = "pvt-mics"
    key    = "tf-states/fable_api"
    region = "ap-south-1"
  }
}

locals {
  env_mapping = {
    dev     = 0
    staging = 1
    prod    = 2
  }

  region = terraform.workspace == "staging" ? "ap-southeast-1" : ""
  env    = terraform.workspace
}

provider "aws" {
  region  = local.region
  profile = "fable"
}
