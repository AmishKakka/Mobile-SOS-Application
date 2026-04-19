output "alb_dns_name" {
  value = "http://${aws_lb.main.dns_name}"
}

output "target_group_arn" {
  value = aws_lb_target_group.backend.arn
}

output "http_listener_arn" {
  value = aws_lb_listener.http.arn
}

output "raw_alb_dns_name" {
  value = aws_lb.main.dns_name
}
