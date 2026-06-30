# NEXUS - Mensajeria Institucional

Sistema de mensajeria seguro y exclusivo para Prefectura. Inspirado en WhatsApp, con encriptacion E2E y control total de datos.

## Caracteristicas

- Mensajes de texto en tiempo real (WebSocket)
- Envio de archivos (imagenes, documentos, etc.)
- Chat 1:1 y grupal
- Control de acceso por DNI y contraseña
- Panel de administracion para gestionar usuarios
- Interface moderna y responsiva
- 100% gratuito usando Cloudflare Free Tier

## Stack Tecnologico

### Backend
- **Runtime**: Cloudflare Workers
- **Base de datos**: Cloudflare D1 (SQLite)
- **Almacenamiento**: Cloudflare R2
- **Cache/Sesiones**: Cloudflare KV
- **WebSocket**: Cloudflare Durable Objects
- **Framework**: Hono

### Frontend
- **UI**: React 18 + TypeScript
- **Estilos**: TailwindCSS
- **State**: Zustand
- **Build**: Vite

## Configuracion

### 1. Instalar dependencias

```bash
# Backend
npm install

# Frontend
cd web && npm install
```

### 2. Configurar Cloudflare

```bash
# Login
wrangler login

# Crear D1 Database
wrangler d1 create nexus-db

# Crear R2 Bucket
wrangler r2 bucket create nexus-files

# Crear KV Namespace
wrangler kv namespace create SESSIONS
```

Actualiza `wrangler.toml` con los IDs generados.

### 3. Configurar secrets

```bash
wrangler secret put JWT_SECRET
```

### 4. Inicializar base de datos

```bash
npm run db:init
```

### 5. Crear usuario admin

```bash
npm run db:seed
```

### 6. Desarrollo

```bash
# Backend (puerto 8787)
npm run dev

# Frontend (puerto 3000)
cd web && npm run dev
```

### 7. Deploy

```bash
# Backend
npm run deploy

# Frontend
cd web && npm run deploy
```

## Estructura

```
NEXUS/
├── src/                    # Backend (Cloudflare Workers)
│   ├── index.ts           # Entry point
│   ├── routes/            # API routes
│   ├── lib/               # Utilities
│   ├── durable-objects/   # WebSocket handler
│   └── types.ts           # TypeScript types
├── web/                   # Frontend (React)
│   └── src/
│       ├── pages/         # Page components
│       ├── components/    # UI components
│       ├── hooks/         # Custom hooks
│       ├── services/      # API client
│       └── store/         # State management
├── schema.sql             # Database schema
└── wrangler.toml          # Cloudflare config
```

## API Endpoints

| Methodo | Ruta | Descripcion |
|---------|------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Registrar usuario (admin) |
| GET | `/api/auth/me` | Obtener usuario actual |
| GET | `/api/users` | Listar usuarios |
| POST | `/api/conversations` | Crear conversacion |
| GET | `/api/conversations` | Listar conversaciones |
| GET | `/api/messages/:id` | Obtener mensajes |
| POST | `/api/messages/:id` | Enviar mensaje |
| POST | `/api/files/upload` | Subir archivo |
| WS | `/ws/chat/:id` | WebSocket chat |

## Licencia

Uso institucional - Prefectura
