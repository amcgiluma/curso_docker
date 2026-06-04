group "default" {
  targets = ["app", "worker"]
}

target "app" {
  context    = "."
  dockerfile = "Dockerfile"
  tags       = ["curso/bake-app:1.0"]
  platforms  = ["linux/amd64"]
}

target "worker" {
  context    = "."
  dockerfile = "Dockerfile.worker"
  tags       = ["curso/bake-worker:1.0"]
  platforms  = ["linux/amd64"]
}

target "multiarch" {
  context    = "."
  dockerfile = "Dockerfile"
  tags       = ["<usuario>/bake-app:1.0"]
  platforms  = ["linux/amd64", "linux/arm64"]
}
