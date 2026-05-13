# Deploy Backend

Backend ini paling mudah dideploy ke Railway.

## Kenapa Railway

- Railway bisa deploy langsung dari GitHub atau CLI.
- Repo ini sudah disiapkan dengan `Dockerfile` dan `railway.json`.
- Healthcheck sudah diarahkan ke `/v1/health`.

Sumber resmi:
- Railway config as code: https://docs.railway.com/config-as-code
- Railway healthchecks: https://docs.railway.com/reference/healthchecks
- Railway build and start commands: https://docs.railway.com/reference/build-and-start-commands

## Environment variables

Isi variable berikut di Railway service:

- `APP_NAME`
- `PORT`
- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`

Contoh awal ada di `.env.example`.

## Deploy via GitHub

1. Push repo ini ke GitHub.
2. Buat project baru di Railway.
3. Pilih `Deploy from GitHub repo`.
4. Pilih repo `be-keuangan`.
5. Tambahkan semua environment variables.
6. Railway akan membaca `railway.json` dan `Dockerfile` otomatis.
7. Setelah deploy selesai, cek:

```bash
curl https://<domain-railway>/v1/health
```

## Deploy via Railway CLI

Install CLI:

```bash
npm i -g @railway/cli
```

Login dan deploy:

```bash
railway login
railway link
railway up
```

## URL frontend

Set `API_BASE_URL` di frontend ke domain Railway kamu, misalnya:

```text
https://be-keuangan-production.up.railway.app/v1
```

atau kalau constant frontend kamu memang menambahkan `/v1` sendiri, pakai base domain tanpa suffix itu.

## Alternatif

Karena repo ini sudah punya `Dockerfile`, kamu juga bisa deploy ke:

- Render
- Fly.io
- VPS sendiri dengan Docker

Command container-nya tetap sama:

```bash
npm run start:prod
```
