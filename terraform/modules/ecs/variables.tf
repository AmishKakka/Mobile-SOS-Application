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

variable "backend_image_tag" {
  type = string
}

variable "mongo_uri_secret_value" {
  type      = string
  sensitive = true
}

variable "fcm_server_key_secret_value" {
  type      = string
  sensitive = true
}

variable "container_cpu_architecture" {
  type    = string
  default = "X86_64"
}
