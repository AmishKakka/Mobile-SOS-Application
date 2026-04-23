resource "aws_instance" "backend" {
  ami                    = "ami-0c02fb55956c7d316" # Amazon Linux 2023
  instance_type          = "t3.medium"
  subnet_id              = var.public_subnet_id
  vpc_security_group_ids = [var.sg_id]
  key_name               = var.key_pair_name
  iam_instance_profile   = var.iam_instance_profile_name

  user_data_base64 = base64encode(templatefile("${path.module}/user-data.sh", {
    backend_image_tag    = var.backend_image_tag
    ecr_repository_url   = var.ecr_repository_url
    aws_region           = var.aws_region
    mongo_uri            = var.mongo_uri
    fcm_server_key_b64   = base64encode(var.fcm_server_key)
    cognito_user_pool_id = var.cognito_user_pool_id
    cognito_client_id    = var.cognito_client_id
  }))

  tags = { Name = "sos-app-ec2" }
}

resource "aws_eip" "backend" {
  instance = aws_instance.backend.id
  tags     = { Name = "sos-app-eip" }
}
