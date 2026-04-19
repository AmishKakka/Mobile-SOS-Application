module "vpc" {
  source = "./modules/vpc"
}

module "security_groups" {
  source = "./modules/security-groups"
  vpc_id = module.vpc.vpc_id
}

module "elasticache" {
  source             = "./modules/elasticache"
  private_subnet_ids = module.vpc.private_subnet_ids
  redis_sg_id        = module.security_groups.redis_sg_id
}

module "alb" {
  source            = "./modules/alb"
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  alb_sg_id         = module.security_groups.alb_sg_id
}

module "iam" {
  source = "./modules/iam"
}

module "ecs" {
  source                      = "./modules/ecs"
  private_subnet_ids          = module.vpc.private_subnet_ids
  ecs_sg_id                   = module.security_groups.ecs_sg_id
  target_group_arn            = module.alb.target_group_arn
  ecs_execution_role_arn      = module.iam.ecs_execution_role_arn
  ecs_task_role_arn           = module.iam.ecs_task_role_arn
  redis_endpoint              = module.elasticache.redis_endpoint
  http_listener_arn           = module.alb.http_listener_arn
  cognito_user_pool_id        = module.cognito.user_pool_id
  cognito_client_id           = module.cognito.client_id
  backend_image_tag           = var.backend_image_tag
  mongo_uri_secret_value      = var.mongo_uri_secret_value
  fcm_server_key_secret_value = var.fcm_server_key_secret_value
  container_cpu_architecture  = var.container_cpu_architecture

  depends_on = [module.alb]
}

module "cognito" {
  source = "./modules/cognito"
}
