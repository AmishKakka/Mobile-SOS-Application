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

variable "developer_ip_cidr" {
  type        = string
  description = "Your public IP/32 for SSH"
}

variable "key_pair_name" {
  type = string
}
