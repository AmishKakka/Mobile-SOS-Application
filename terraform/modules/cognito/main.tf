# ------------- User Pool ------------------
resource "aws_cognito_user_pool" "sos_pool" {
  name = "sos-app-user-pool"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length                   = 8
    require_uppercase                = true
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  # When YOU create a user via admin API, they get a temp password via email
  admin_create_user_config {
    allow_admin_create_user_only = false  # false = users can also self-register via app

    invite_message_template {
      email_subject = "SafeGuard SOS — Your account has been created"
      email_message = "Hello {username}, your temporary password is {####}. Please log in and change it."
      sms_message   = "Your SafeGuard temp password: {####}"
    }
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "SafeGuard SOS — Verify your email"
    email_message        = "Your SafeGuard verification code is {####}"
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true
    string_attribute_constraints {
      min_length = 5
      max_length = 254
    }
  }

  schema {
    name                = "name"
    attribute_data_type = "String"
    required            = true
    mutable             = true
    string_attribute_constraints {
      min_length = 1
      max_length = 100
    }
  }

  # Custom attribute to distinguish helper vs victim role
  schema {
    name                     = "role"
    attribute_data_type      = "String"
    required                 = false
    mutable                  = true
    developer_only_attribute = false
    string_attribute_constraints {
      min_length = 1
      max_length = 20
    }
  }

  tags = {
    Project     = "sos-app"
    Environment = "production"
  }
}

# ─── Mobile App Client ────────────────────────────
resource "aws_cognito_user_pool_client" "sos_mobile_client" {
  name         = "sos-app-mobile-client"
  user_pool_id = aws_cognito_user_pool.sos_pool.id

  generate_secret = false  # React Native cannot securely store a client secret

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  access_token_validity  = 1   # hours
  id_token_validity      = 1   # hours
  refresh_token_validity = 30  # days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  prevent_user_existence_errors = "ENABLED"

  read_attributes  = ["email", "email_verified", "name", "custom:role"]
  write_attributes = ["email", "name", "custom:role"]
}

# ─── Admin Client (for YOU to create/manage users via AWS CLI or backend) ─────
# This client has a secret — only used server-side or via AWS CLI, never in the app
resource "aws_cognito_user_pool_client" "sos_admin_client" {
  name         = "sos-app-admin-client"
  user_pool_id = aws_cognito_user_pool.sos_pool.id

  generate_secret = true  # safe because this is only used server-side

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_ADMIN_USER_PASSWORD_AUTH",  # lets you set passwords directly
  ]

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 1  # short-lived for admin sessions

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  prevent_user_existence_errors = "ENABLED"

  read_attributes  = ["email", "email_verified", "name", "custom:role"]
  write_attributes = ["email", "name", "custom:role"]
}

# ─── IAM policy so ECS task can verify tokens and manage users ────────────────
resource "aws_iam_policy" "cognito_access" {
  name        = "sos-app-cognito-access"
  description = "Allows ECS backend to verify Cognito tokens and manage users"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CognitoReadVerify"
        Effect = "Allow"
        Action = [
          "cognito-idp:GetUser",
          "cognito-idp:AdminGetUser",
          "cognito-idp:ListUsers",
          "cognito-idp:AdminListGroupsForUser",
        ]
        Resource = aws_cognito_user_pool.sos_pool.arn
      },
      {
        Sid    = "CognitoAdminManage"
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminSetUserPassword",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:AdminDeleteUser",
          "cognito-idp:AdminDisableUser",
          "cognito-idp:AdminEnableUser",
          "cognito-idp:AdminConfirmSignUp",
        ]
        Resource = aws_cognito_user_pool.sos_pool.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_cognito" {
  role       = var.ecs_task_role_name
  policy_arn = aws_iam_policy.cognito_access.arn
}
