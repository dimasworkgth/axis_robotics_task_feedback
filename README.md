# AXIS Task Monitor Translate System

Versi ini tidak lagi mengandalkan kamus/pola hardcode sebagai inti terjemahan.
Backend mengambil task AXIS, lalu menerjemahkan `name`, `description`, dan `steps` memakai service LibreTranslate.

## Deploy VPS

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin unzip
sudo systemctl enable --now docker
```

Upload zip ke VPS, lalu:

```bash
unzip axis-task-monitor-translate-system.zip
cd axis-task-monitor-translate-system
cp .env.example .env
docker compose up -d --build
```

Buka:

```text
http://IP_VPS:8080
```

## Catatan penting

- `AXIS_COOKIE` kosongkan dulu.
- Isi `AXIS_COOKIE` hanya kalau sync task AXIS gagal 401/403.
- Service LibreTranslate pertama kali bisa butuh waktu untuk siap. Cek:

```bash
docker logs -f axis-libretranslate
```

- Web tetap refresh 5 detik, tapi hasil terjemahan disimpan cache agar task yang sama tidak diterjemahkan berulang.
