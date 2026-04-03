variable "private_subnet_ids" {
  type = list(string)
}

variable "ecs_sg_id" {
  type = string
}

variable "target_group_arn" {
  type = string
}

variable "ecs_execution_role_arn" {
  type = string
}

variable "ecs_task_role_arn" {
  type = string
}

variable "redis_endpoint" {
  type = string
}

variable "http_listener_arn" {
  type = string
}

variable "cognito_user_pool_id" {
  type = string
}

variable "cognito_client_id" {
  type = string
}