output "alb_dns_name" { value = "http://${aws_lb.safeguard_alb.dns_name}" }
output "target_group_arn" { value = aws_lb_target_group.safeguard_tg.arn }