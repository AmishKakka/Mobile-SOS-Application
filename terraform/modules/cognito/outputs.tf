output "user_pool_id" {
  description = "Cognito User Pool ID — needed by backend to verify tokens"
  value       = aws_cognito_user_pool.sos_pool.id
}

output "user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = aws_cognito_user_pool.sos_pool.arn
}

output "user_pool_client_id" {
  description = "Mobile App Client ID — put this in React Native src/config/keys.ts"
  value       = aws_cognito_user_pool_client.sos_mobile_client.id
}

output "admin_client_id" {
  description = "Admin Client ID — use this with AWS CLI to create/manage users"
  value       = aws_cognito_user_pool_client.sos_admin_client.id
}

output "cognito_endpoint" {
  description = "Cognito endpoint for token verification in backend"
  value       = "https://cognito-idp.us-east-1.amazonaws.com/${aws_cognito_user_pool.sos_pool.id}"
}
