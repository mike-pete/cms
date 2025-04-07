# Local Development

```bash

npx @upstash/qstash-cli dev

```

docker pull postgres

docker run -d \
 --name dex \
 -e POSTGRES_PASSWORD=postgres \
 -e POSTGRES_USER=postgres \
 -e POSTGRES_DB=dex \
 -e POSTGRES_HOST_AUTH_METHOD=scram-sha-256 \
 -e POSTGRES_INITDB_ARGS="--auth-host=scram-sha-256" \
 -p 5432:5432 \
 postgres

http://localhost:3000/api/v1/queue/handle-chunks

