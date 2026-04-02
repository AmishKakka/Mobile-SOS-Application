output "redis_endpoint" {
  value = aws_elasticache_cluster.redis.cache_nodes[0].address
}