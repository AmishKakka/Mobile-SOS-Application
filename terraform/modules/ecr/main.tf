resource "aws_ecr_repository" "backend" {
  name                 = "sos-backend"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
  tags = { Name = "sos-backend" }
}