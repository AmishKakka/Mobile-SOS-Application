output "elastic_ip" {
  value = aws_eip.backend.public_ip
}

output "backend_origin" {
  value = "http://${aws_eip.backend.public_ip}:3000"
}

output "ssh_command" {
  value = "ssh -i <path-to-your-key.pem> ec2-user@${aws_eip.backend.public_ip}"
}
