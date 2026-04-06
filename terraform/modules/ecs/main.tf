resource "aws_secretsmanager_secret" "mongo_uri" {
  name                    = "sos-app/mongo-uri"
  description             = "MongoDB Atlas connection string for SOS app backend"
  recovery_window_in_days = 0
  tags                    = { Name = "sos-app-mongo-uri" }
}

# resource "aws_secretsmanager_secret" "jwt_secret" {
#   name                    = "sos-app/jwt-secret"
#   description             = "JWT signing secret for authentication tokens"
#   recovery_window_in_days = 0
#   tags                    = { Name = "sos-app-jwt-secret" }
# }

resource "aws_secretsmanager_secret" "fcm_key" {
  name                    = "sos-app/fcm-server-key"
  description             = "Firebase Cloud Messaging server key for push notifications"
  recovery_window_in_days = 0
  tags                    = { Name = "sos-app-fcm-key" }
}

resource "aws_ecr_repository" "backend" {
  name                 = "sos-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
  tags = { Name = "sos-backend" }
}

resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/sos-app-backend"
  retention_in_days = 7
  tags              = { Name = "sos-app-ecs-logs" }
}

resource "aws_ecs_cluster" "main" {
  name = "sos-app-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  tags = { Name = "sos-app-cluster" }
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "sos-app-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = var.ecs_execution_role_arn
  task_role_arn            = var.ecs_task_role_arn

  container_definitions = jsonencode([{
    name      = "sos-backend"
    image     = "${aws_ecr_repository.backend.repository_url}:latest"
    essential = true

    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]

    secrets = [
      {
        name      = "MONGO_URI"
        valueFrom = aws_secretsmanager_secret.mongo_uri.arn
      },
      # {
      #   name      = "JWT_SECRET"
      #   valueFrom = aws_secretsmanager_secret.jwt_secret.arn
      # },
      {
        name      = "FCM_SERVER_KEY"
        valueFrom = aws_secretsmanager_secret.fcm_key.arn
      }
    ]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3000" },
      { name = "REDIS_HOST", value = var.redis_endpoint },
      { name = "COGNITO_USER_POOL_ID", value = var.cognito_user_pool_id },
      { name = "COGNITO_CLIENT_ID", value = var.cognito_client_id }
    ]

    healthCheck = {
      command     = ["CMD-SHELL", "wget -qO- http://localhost:3000/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 15
    }

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

resource "aws_ecs_service" "backend" {
  name            = "sos-app-backend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_sg_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "sos-backend"
    container_port   = 3000
  }

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  depends_on = [
    var.http_listener_arn
  ]
}
