# syntax=docker/dockerfile:1

FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY cmd ./cmd
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /bin/app ./cmd/app

FROM alpine:3.20
COPY --from=build /bin/app /usr/local/bin/app
EXPOSE 8080
ENTRYPOINT ["app"]
