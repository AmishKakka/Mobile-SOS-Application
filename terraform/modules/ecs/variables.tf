variable "private_subnet_a" { type = string }
variable "ecs_sg_id" { type = string }
variable "target_group_arn" { type = string }
variable "ecs_execution_role" { type = string }
variable "ecs_task_role" { type = string }
variable "redis_host" { type = string }

variable "cognito_user_pool_id" {
  description = "Cognito User Pool ID passed into the container as an env var"
  type        = string
}

variable "cognito_user_pool_client_id" {
  description = "Cognito App Client ID passed into the container as an env var"
  type        = string
}
