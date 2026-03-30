output "alb_dns_name" {
  description = "Share this with Parth and Harsh for the frontend"
  value       = module.alb.alb_dns_name
}

output "nat_gateway_ip" {
  description = "Give this IP to Nisarg to whitelist in MongoDB Atlas Network Access!"
  value       = module.vpc.nat_gateway_ip
}