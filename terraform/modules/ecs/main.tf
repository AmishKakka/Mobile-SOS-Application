resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/sos-app-backend"
  retention_in_days = 7
}

resource "aws_ecs_cluster" "safeguard_cluster" {
  name = "sos-app-cluster"
}

resource "aws_ecs_task_definition" "safeguard_task" {
  family                   = "sos-app-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = var.ecs_execution_role
  task_role_arn            = var.ecs_task_role

  container_definitions = jsonencode([{
    name      = "sos-backend"
    image     = "464716974665.dkr.ecr.us-east-1.amazonaws.com/sos-backend:latest"
    essential = true
    portMappings = [{ containerPort = 3000, protocol = "tcp" }]

    environment = [
      { name = "NODE_ENV",                      value = "production" },
      { name = "PORT",                          value = "3000" },
      { name = "REDIS_HOST",                    value = var.redis_host },
      { name = "COGNITO_USER_POOL_ID",          value = var.cognito_user_pool_id },
      { name = "COGNITO_USER_POOL_CLIENT_ID",   value = var.cognito_user_pool_client_id },
      { name = "AWS_REGION",                    value = "us-east-1" },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name
        "awslogs-region"        = "us-east-1"
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

resource "aws_ecs_service" "safeguard_service" {
  name            = "sos-app-backend-service"
  cluster         = aws_ecs_cluster.safeguard_cluster.id
  task_definition = aws_ecs_task_definition.safeguard_task.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [var.private_subnet_a]
    security_groups  = [var.ecs_sg_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "sos-backend"
    container_port   = 3000
  }
}