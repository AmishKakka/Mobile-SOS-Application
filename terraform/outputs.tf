output "backend_origin" {
  description = "Preferred backend URL for frontend configuration"
  value       = module.ec2.backend_origin
}

output "elastic_ip" {
  description = "Stable public IP for the EC2 instance. Whitelist this in MongoDB Atlas."
  value       = module.ec2.elastic_ip
}

output "ssh_command" {
  description = "SSH command for the EC2 backend instance"
  value       = module.ec2.ssh_command
}

output "ecr_repository_url" {
  description = "ECR URL for docker push and CI/CD pipeline"
  value       = module.ecr.ecr_repository_url
}

output "cognito_user_pool_id" {
  description = "Share with Parth and Harsh for frontend auth config"
  value       = module.cognito.user_pool_id
}

output "cognito_client_id" {
  description = "Share with Parth and Harsh for frontend auth config"
  value       = module.cognito.client_id
}
