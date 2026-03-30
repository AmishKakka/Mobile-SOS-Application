terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region  = "us-east-1"
  profile = "amish-kakka"
}

# ═══════════════════════════════════════════════════════
# 1. THE CUSTOM VPC & NETWORK LAYER
# ═══════════════════════════════════════════════════════
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "sos-app-vpc" }
}

# Public Subnet (For the Load Balancer & NAT Gateway)
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true
  tags = { Name = "sos-app-public" }
}

# Public Subnet B (Required for ALB multi-AZ support)
resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.4.0/24"
  availability_zone       = "us-east-1b"
  map_public_ip_on_launch = true
  tags = { Name = "sos-app-public-b" }
}

# Private Subnet A (For ECS Backend and Redis)
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1a"
  tags = { Name = "sos-app-private-a" }
}

# Private Subnet B (Redis requires a second AZ)
resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "us-east-1b"
  tags = { Name = "sos-app-private-b" }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "sos-app-igw" }
}

# NAT Gateway (Allows private ECS tasks to reach MongoDB Atlas)
resource "aws_eip" "nat" {
  domain     = "vpc"
  depends_on = [aws_internet_gateway.main]
  tags       = { Name = "sos-app-nat-eip" }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public.id
  depends_on    = [aws_internet_gateway.main]
  tags          = { Name = "sos-app-nat-gw" }
}

# ═══════════════════════════════════════════════════════
# 2. ROUTE TABLES
# ═══════════════════════════════════════════════════════
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = { Name = "sos-app-public-rt" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }
  tags = { Name = "sos-app-private-rt" }
}

resource "aws_route_table_association" "private_a" {
  subnet_id      = aws_subnet.private_a.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_b" {
  subnet_id      = aws_subnet.private_b.id
  route_table_id = aws_route_table.private.id
}

# ═══════════════════════════════════════════════════════
# 3. SECURITY GROUPS
# ═══════════════════════════════════════════════════════
resource "aws_security_group" "alb_sg" {
  name        = "sos-app-alb-sg"
  description = "ALB accepts requests from internet"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "ecs_sg" {
  name        = "sos-app-ecs-sg"
  description = "ECS tasks only ALB can send traffic in"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "redis_sg" {
  name        = "sos-app-redis-sg"
  description = "ElastiCache Redis only ECS can connect"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_sg.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ═══════════════════════════════════════════════════════
# 4. REDIS DATABASE (In Private Subnets)
# ═══════════════════════════════════════════════════════
resource "aws_elasticache_subnet_group" "redis" {
  name       = "sos-app-redis-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
}

resource "aws_elasticache_cluster" "safeguard_redis" {
  cluster_id           = "sos-app-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.0"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = [aws_security_group.redis_sg.id]
}

# ═══════════════════════════════════════════════════════
# 5. LOAD BALANCER
# ═══════════════════════════════════════════════════════
resource "aws_lb" "safeguard_alb" {
  name               = "sos-app-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.public.id, aws_subnet.public_b.id]
}

resource "aws_lb_target_group" "safeguard_tg" {
  name        = "sos-app-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }
}

resource "aws_lb_listener" "safeguard_listener" {
  load_balancer_arn = aws_lb.safeguard_alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.safeguard_tg.arn
  }
}

# ═══════════════════════════════════════════════════════
# 6. IAM ROLES
# ═══════════════════════════════════════════════════════
resource "aws_iam_role" "ecs_execution" {
  name = "sos-app-ecs-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_basic" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task" {
  name = "sos-app-ecs-task-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# ═══════════════════════════════════════════════════════
# 7. ECS FARGATE
# ═══════════════════════════════════════════════════════
# Create a CloudWatch Log Group to hold your Node.js console logs
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
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "sos-backend"
    
    # Keep your exact ECR image URL here!
    image     = "464716974665.dkr.ecr.us-east-1.amazonaws.com/sos-backend:latest"
    
    essential = true
    portMappings = [{ containerPort = 3000, protocol = "tcp" }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3000" },
      { name = "REDIS_HOST", value = aws_elasticache_cluster.safeguard_redis.cache_nodes[0].address }
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
    subnets          = [aws_subnet.private_a.id]
    security_groups  = [aws_security_group.ecs_sg.id]
    
    # CRITICAL CHANGE: The task is now completely private and uses the NAT Gateway
    assign_public_ip = false 
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.safeguard_tg.arn
    container_name   = "sos-backend"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.safeguard_listener]
}

# ═══════════════════════════════════════════════════════
# 8. OUTPUTS (Critical for your Team)
# ═══════════════════════════════════════════════════════
output "alb_dns_name" {
  description = "Share this with Parth and Harsh for the frontend"
  value       = "http://${aws_lb.safeguard_alb.dns_name}"
}

output "nat_gateway_ip" {
  description = "Give this IP to Nisarg to whitelist in MongoDB Atlas Network Access!"
  value       = aws_eip.nat.public_ip
}