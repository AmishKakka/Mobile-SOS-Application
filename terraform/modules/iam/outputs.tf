output "ecs_execution_role_arn" { value = aws_iam_role.ecs_execution.arn }
output "ecs_task_role_arn" { value = aws_iam_role.ecs_task.arn }

# Needed by the Cognito module to attach the Cognito access policy
output "ecs_task_role_name"     { value = aws_iam_role.ecs_task.name }