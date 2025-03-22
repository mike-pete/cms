# Local Development
```bash
npx @upstash/qstash-cli dev



```

docker pull postgres

docker run -d \
  --name cms \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=cms \
  -p 5432:5432 \
  postgres

http://localhost:3000/api/v1/queue/handle-chunks


brew install ngrok
