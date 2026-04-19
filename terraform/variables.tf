variable "aws_region" {
  type    = string
  default = "us-east-1"
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
