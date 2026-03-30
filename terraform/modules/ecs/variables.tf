variable "private_subnet_a" { type = string }
variable "ecs_sg_id" { type = string }
variable "target_group_arn" { type = string }
variable "ecs_execution_role" { type = string }
variable "ecs_task_role" { type = string }
variable "redis_host" { type = string }