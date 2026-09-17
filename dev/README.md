# Local Development Proxy

This folder contains the [Caddy](https://caddyserver.com) reverse proxy config for local development with a custom domain.

## What it does

| URL                                 | Target                                                     |
| ----------------------------------- | ---------------------------------------------------------- |
| `http://eco-metrics.localhost`      | Next.js — `http://localhost:3000`                          |
| `https://eco-metrics.localhost`     | Next.js — `http://localhost:3000` (TLS via Caddy local CA) |
| `http://api.eco-metrics.localhost`  | NestJS — `http://localhost:3001`                           |
| `https://api.eco-metrics.localhost` | NestJS — `http://localhost:3001` (TLS via Caddy local CA)  |

The `.localhost` TLD is resolved to `127.0.0.1` automatically by modern browsers (Chrome, Firefox, Edge) — no changes to `/etc/hosts` or Windows `hosts` file required.

---

## Setup (one time, per machine)

### 1. Install Caddy (inside WSL)

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

### 2. Disable the system Caddy service (it conflicts with our dev proxy)

```bash
sudo systemctl stop caddy && sudo systemctl disable caddy
```

### 3. Allow Caddy to bind to port 80 without sudo

```bash
sudo setcap cap_net_bind_service=+ep $(which caddy)
```

This is a one-time operation. It grants Caddy the capability to listen on privileged ports (< 1024) without running as root.

### 4. Trust Caddy's local CA (fixes the ⚠️ HTTPS warning in browser)

`caddy trust` requires Caddy to be running. Start the proxy first, then run the command from a second terminal:

```bash
# Terminal 1 — keep this running
npm run dev:local

# Terminal 2 — with dev:local already up
sudo caddy trust
```

Caddy generates its own local Certificate Authority and uses it to issue a TLS cert for `*.localhost`. This command installs that CA into the system trust store so browsers show a valid padlock instead of a warning.

After running it, **restart your browser completely** (close all windows and reopen) — the trust store is read at launch time.

> **Firefox note:** Firefox uses its own certificate store. To trust the cert in Firefox, go to `about:preferences#privacy` → Certificates → View Certificates → Authorities → Import, and add the Caddy root CA located at `$HOME/.local/share/caddy/pki/authorities/local/root.crt`.

---

## Usage

```bash
# Start everything: Next.js + NestJS + Caddy proxy
npm run dev:local

# Start only apps (standard, no custom domain)
npm run dev
```

---

## Troubleshooting

**`caddy: permission denied` on port 80**
Re-run the `setcap` command from step 3.

**Still seeing the Caddy welcome page**
The system Caddy service is likely still running. Kill it:

```bash
sudo pkill caddy
sudo systemctl stop caddy
```

Then re-run `npm run dev:local`.

**Page not loading at `eco-metrics.localhost`**
Make sure both `npm run dev` processes are running (Next.js and NestJS must be up before the proxy can forward requests).

**Caddy fails to start**
Check if another process is using port 80: `sudo lsof -i :80`

**HTTPS padlock still shows as invalid after `caddy trust`**
Restart the browser completely (close all windows). The trust store is read at launch time.
