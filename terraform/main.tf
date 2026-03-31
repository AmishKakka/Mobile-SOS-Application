module "vpc" {
  source = "./modules/vpc"
}

module "security-groups" {
  source = "./modules/security-groups"
  vpc_id = module.vpc.vpc_id
}

module "elasticache" {
  source             = "./modules/elasticache"
  private_subnet_a   = module.vpc.private_subnet_a
  private_subnet_b   = module.vpc.private_subnet_b
  redis_sg_id        = module.security-groups.redis_sg_id
}

module "alb" {
  source           = "./modules/alb"
  vpc_id           = module.vpc.vpc_id
  public_subnet_a  = module.vpc.public_subnet_a
  public_subnet_b  = module.vpc.public_subnet_b
  alb_sg_id        = module.security-groups.alb_sg_id
}

module "iam" {
  source = "./modules/iam"
}

module "ecs" {
  source             = "./modules/ecs"
  private_subnet_a   = module.vpc.private_subnet_a
  ecs_sg_id          = module.security-groups.ecs_sg_id
  target_group_arn   = module.alb.target_group_arn
  ecs_execution_role = module.iam.ecs_execution_role_arn
  ecs_task_role      = module.iam.ecs_task_role_arn
  redis_host         = module.elasticache.redis_host

  # Ensures ALB listener is fully created before ECS service tries to attach to the target group
  depends_on = [module.alb]
}