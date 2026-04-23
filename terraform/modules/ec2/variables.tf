variable "public_subnet_id" { type = string }
variable "sg_id" { type = string }
variable "key_pair_name" { type = string }
variable "backend_image_tag" { type = string }
variable "ecr_repository_url" { type = string }
variable "aws_region" { type = string }
variable "mongo_uri" {
  type      = string
  sensitive = true
}
variable "fcm_server_key" {
  type      = string
  sensitive = true
}
variable "cognito_user_pool_id" { type = string }
variable "cognito_client_id" { type = string }
variable "iam_instance_profile_name" { type = string }
