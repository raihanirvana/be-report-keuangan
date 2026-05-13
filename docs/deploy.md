# Deploy Backend

Backend ini sekarang paling enak dideploy ke Render.

## Kenapa Render

- Setup paling cepat untuk NestJS biasa.
- Bisa deploy langsung dari GitHub.
- Repo ini sudah disiapkan dengan `render.yaml`.
- Health check sudah diarahkan ke `/v1/health`.
- Cocok untuk hobby app dan testing production-like.

Catatan:

- Free web service di Render akan sleep setelah sekitar 15 menit idle.
- Request pertama setelah sleep bisa kena cold start beberapa detik sampai sekitar 1 menit.

Sumber resmi:
- Render Blueprint spec: https://render.com/docs/blueprint-spec
- Render free services: https://render.com/free
- Render pricing: https://render.com/pricing

## Environment variables

Isi variable berikut di Render service:

- `APP_NAME`
- `PORT`
- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`

Contoh awal ada di `.env.example`.

## File yang sudah disiapkan

- `render.yaml` untuk konfigurasi service Render
- `Dockerfile` kalau nanti mau pindah ke platform lain
- `railway.json` tetap dibiarkan untuk fallback

## Deploy via GitHub

1. Push repo ini ke GitHub.
2. Buka Render.
3. Klik `New` -> `Blueprint`.
4. Connect GitHub repo `be-keuangan`.
5. Render akan membaca `render.yaml` otomatis.
6. Isi env yang masih `sync: false`:
   - `MONGODB_URI`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
7. Deploy.
8. Setelah live, cek health:

```bash
curl https://<domain-render>/v1/health
```

## Kalau mau setup manual tanpa Blueprint

1. Buka Render.
2. Klik `New` -> `Web Service`.
3. Pilih repo `be-keuangan`.
4. Isi konfigurasi berikut:

```text
Environment: Node
Build Command: npm ci && npm run build
Start Command: npm run start:prod
```

5. Tambahkan health check path:

```text
/v1/health
```

6. Isi semua environment variables.

## URL frontend

Set `API_BASE_URL` di frontend ke domain Render kamu.

Kalau constant frontend kamu belum menambahkan `/v1`, pakai:

```text
https://<domain-render>/v1
```

Kalau constant frontend kamu sudah menambahkan `/v1` sendiri, pakai base domain saja:

```text
https://<domain-render>
```

## Alternatif

Kalau nanti mau pindah dari Render, repo ini juga masih siap untuk:

- Railway
- Fly.io
- VPS sendiri dengan Docker
- Google Cloud Run
