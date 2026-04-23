resource "aws_cognito_user_pool" "main" {
  name = "sos-app-user-pool"

  # Users will log in with their email
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # UPDATED: Synced to exactly match your React Native regex!
  password_policy {
    minimum_length    = 8
    require_lowercase = false
    require_numbers   = true
    require_symbols   = true
    require_uppercase = false
  }

  # Tell AWS to expect the First Name from React Native
  schema {
    attribute_data_type = "String"
    name                = "given_name"
    required            = true
    mutable             = true
  }

  # Tell AWS to expect the Last Name from React Native
  schema {
    attribute_data_type = "String"
    name                = "family_name"
    required            = true
    mutable             = true
  }

  tags = { Name = "sos-app-user-pool" }
}

resource "aws_cognito_user_pool_client" "client" {
  name         = "sos-app-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # Keep this false. If Parth and Harsh are building a React/React Native frontend,
  # they cannot securely store a client secret.
  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]
}
