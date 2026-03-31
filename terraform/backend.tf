# This configures remote state storage. 
# You will need to update the bucket name to one that exists in your AWS account.
terraform {
  backend "s3" {
    bucket         = "sos-app-terraform-state-bucket" 
    key            = "infra/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
  }
}