module "vpc" {
  source = "./modules/vpc"
}

module "security_groups" {
  source            = "./modules/security-groups"
  vpc_id            = module.vpc.vpc_id
  developer_ip_cidr = var.developer_ip_cidr
}

module "ecr" {
  source = "./modules/ecr"
}

module "iam" {
  source = "./modules/iam"
}

module "cognito" {
  source = "./modules/cognito"
}

module "ec2" {
  source = "./modules/ec2"

  public_subnet_id          = module.vpc.public_subnet_id
  sg_id                     = module.security_groups.ec2_sg_id
  key_pair_name             = var.key_pair_name
  backend_image_tag         = var.backend_image_tag
  ecr_repository_url        = module.ecr.ecr_repository_url
  aws_region                = var.aws_region
  mongo_uri                 = var.mongo_uri_secret_value
  fcm_server_key            = var.fcm_server_key_secret_value
  cognito_user_pool_id      = module.cognito.user_pool_id
  cognito_client_id         = module.cognito.client_id
  iam_instance_profile_name = module.iam.ec2_instance_profile_name
}
