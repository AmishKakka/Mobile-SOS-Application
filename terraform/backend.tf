terraform {
  backend "s3" {
    bucket       = "sos-terraform-state-app"
    key          = "sos-app/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}