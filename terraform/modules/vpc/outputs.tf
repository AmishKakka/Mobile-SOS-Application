output "vpc_id" { value = aws_vpc.main.id }
output "public_subnet_a" { value = aws_subnet.public.id }
output "public_subnet_b" { value = aws_subnet.public_b.id }
output "private_subnet_a" { value = aws_subnet.private_a.id }
output "private_subnet_b" { value = aws_subnet.private_b.id }
output "nat_gateway_ip" { value = aws_eip.nat.public_ip }