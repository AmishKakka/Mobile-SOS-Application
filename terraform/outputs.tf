output "alb_dns_name" {
  description = "Backend URL — share with Parth and Harsh for frontend"
  value       = module.alb.alb_dns_name
}

output "nat_gateway_ip" {
  description = "Whitelist this IP in MongoDB Atlas Network Access"
  value       = module.vpc.nat_gateway_ip
}

output "ecr_repository_url" {
  description = "ECR URL for docker push and CI/CD pipeline"
  value       = module.ecs.ecr_repository_url
}

output "redis_endpoint" {
  description = "Redis host (ECS connects via REDIS_URL env var automatically)"
  value       = module.elasticache.redis_endpoint
}

output "cognito_user_pool_id" {
  description = "Share with Parth and Harsh for frontend auth config"
  value       = module.cognito.user_pool_id
}

output "cognito_client_id" {
  description = "Share with Parth and Harsh for frontend auth config"
  value       = module.cognito.client_id
}
