# Blueprint Arsitektur Aplikasi Modern Full-Stack

## 🎯 Overview Arsitektur

Aplikasi ini menggunakan **arsitektur hybrid** dengan pemisahan concern yang jelas antara backend (Laravel + Filament) dan frontend (Astro), berkomunikasi melalui REST API dan WebSocket untuk real-time features.

---

## 🏗️ Stack Teknologi

### Backend Layer

- **Framework**: Laravel 11.x dengan Laravel Octane (RoadRunner/Swoole)
- **Admin Panel**: Filament v3
- **Database**: MariaDB 10.11+
- **Cache & Session**: Redis 7.x
- **Queue**: Redis Queue Driver
- **WebSocket**: Laravel Reverb (native WebSocket server)
- **AI Integration**: Google Gemini AI API
- **Storage**: Local/S3-compatible (MinIO recommended)

### Frontend Layer

- **Framework**: Astro 4.x (SSG/SSR Hybrid)
- **Styling**: Tailwind CSS 3.x
- **WebSocket Client**: Laravel Echo + Pusher JS
- **HTTP Client**: Axios/Fetch API
- **State Management**: Nano Stores (lightweight)
- **i18n**: astro-i18next

### Infrastructure

- **Server**: Dedicated Server (self-hosted)
- **Reverse Proxy**: Cloudflare Tunnel
- **SSL**: Cloudflare SSL/TLS
- **Process Manager**: Supervisor

---

## 📐 Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE TUNNEL                        │
│                  (SSL/TLS Termination)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴──────────────┐
        │                            │
┌───────▼────────┐         ┌─────────▼────────┐
│  ASTRO FRONTEND│         │  LARAVEL BACKEND │
│  (Port 4321)   │         │  (Octane :8000)  │
│                │         │                  │
│  - SSG/SSR     │◄────────┤  - REST API      │
│  - Tailwind    │  HTTP   │  - Filament      │
│  - i18n        │         │  - Auth (Sanctum)│
└────────┬───────┘         └────────┬─────────┘
         │                          │
         │                          │
    ┌────▼────┐              ┌──────▼──────┐
    │  Echo   │◄─WebSocket──►│   Reverb    │
    │ Client  │              │  (Port 8080)│
    └─────────┘              └─────────────┘
                                    │
                    ┌───────────────┼──────────────┐
                    │               │              │
            ┌───────▼──────┐ ┌─────▼─────┐ ┌─────▼──────┐
            │   MariaDB    │ │   Redis   │ │  Gemini AI │
            │  (Port 3306) │ │(Port 6379)│ │    API     │
            └──────────────┘ └───────────┘ └────────────┘
```

---

## 🗂️ Struktur Direktori

```
/var/www/
├── backend/                    # Laravel Backend
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── Api/
│   │   │   │   │   ├── V1/
│   │   │   │   │   │   ├── AuthController.php
│   │   │   │   │   │   ├── ChatController.php
│   │   │   │   │   │   ├── UserController.php
│   │   │   │   │   │   └── WebhookController.php
│   │   │   │   └── WebhookController.php
│   │   │   ├── Middleware/
│   │   │   │   ├── LocalizationMiddleware.php
│   │   │   │   ├── ApiVersionMiddleware.php
│   │   │   │   └── WebhookSignatureVerification.php
│   │   │   └── Resources/
│   │   │       └── Api/
│   │   │           ├── UserResource.php
│   │   │           └── ChatMessageResource.php
│   │   ├── Models/
│   │   │   ├── User.php
│   │   │   ├── ChatRoom.php
│   │   │   ├── ChatMessage.php
│   │   │   └── WebhookLog.php
│   │   ├── Services/
│   │   │   ├── GeminiAIService.php
│   │   │   ├── ChatService.php
│   │   │   └── WebhookService.php
│   │   ├── Events/
│   │   │   ├── MessageSent.php
│   │   │   └── UserStatusChanged.php
│   │   ├── Listeners/
│   │   │   └── BroadcastMessageSent.php
│   │   ├── Filament/
│   │   │   ├── Resources/
│   │   │   │   ├── UserResource.php
│   │   │   │   ├── ChatRoomResource.php
│   │   │   │   └── WebhookLogResource.php
│   │   │   └── Pages/
│   │   └── Jobs/
│   │       ├── ProcessWebhook.php
│   │       └── ProcessAIResponse.php
│   ├── config/
│   │   ├── octane.php
│   │   ├── reverb.php
│   │   ├── broadcasting.php
│   │   └── services.php (Gemini AI config)
│   ├── routes/
│   │   ├── api.php              # REST API routes
│   │   ├── web.php              # Filament routes
│   │   ├── channels.php         # WebSocket channels
│   │   └── webhooks.php         # Webhook endpoints
│   ├── database/
│   │   └── migrations/
│   ├── resources/
│   │   └── lang/
│   │       ├── en/
│   │       ├── id/
│   │       └── ja/
│   └── tests/
│
├── frontend/                   # Astro Frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── index.astro
│   │   │   ├── chat/
│   │   │   │   └── [room].astro
│   │   │   └── [...lang]/
│   │   ├── components/
│   │   │   ├── Chat/
│   │   │   │   ├── ChatRoom.tsx
│   │   │   │   ├── MessageList.tsx
│   │   │   │   └── MessageInput.tsx
│   │   │   └── Layout/
│   │   │       ├── Header.astro
│   │   │       └── Footer.astro
│   │   ├── layouts/
│   │   │   └── BaseLayout.astro
│   │   ├── lib/
│   │   │   ├── api.ts           # API client
│   │   │   ├── websocket.ts     # WebSocket connection
│   │   │   └── auth.ts          # Auth helpers
│   │   ├── stores/
│   │   │   ├── chatStore.ts
│   │   │   └── authStore.ts
│   │   └── locales/
│   │       ├── en.json
│   │       ├── id.json
│   │       └── ja.json
│   ├── public/
│   └── astro.config.mjs
│
└── configs/                    # Server Configs
    ├── supervisor/
    │   ├── octane.conf
    │   ├── reverb.conf
    │   ├── queue-worker.conf
    │   └── astro.conf
    ├── nginx/
    │   └── sites-available/
    │       └── app.conf
    └── cloudflare/
        └── tunnel-config.yml
```

---

## 🔧 Konfigurasi Backend (Laravel)

### 1. **Laravel Octane Setup**

**`config/octane.php`**

```php
<?php

return [
    'server' => env('OCTANE_SERVER', 'roadrunner'), // or 'swoole'

    'https' => env('OCTANE_HTTPS', false),

    'listeners' => [
        WorkerStarting::class => [
            EnsureUploadedFilesAreValid::class,
        ],
        RequestReceived::class => [
            ...Octane::prepareApplicationForNextOperation(),
            ...Octane::prepareApplicationForNextRequest(),
        ],
        RequestHandled::class => [],
        RequestTerminated::class => [],
        TaskReceived::class => [],
        TaskTerminated::class => [],
        TickReceived::class => [],
        TickTerminated::class => [],
        OperationTerminated::class => [
            FlushUploadedFiles::class,
        ],
        WorkerErrorOccurred::class => [
            ReportException::class,
            StopWorkerIfNecessary::class,
        ],
        WorkerStopping::class => [],
    ],

    'warm' => [
        ...Octane::defaultServicesToWarm(),
    ],

    'cache' => [
        'driver' => env('OCTANE_CACHE_DRIVER', 'array'),
    ],

    'tables' => [
        'example:1000',
    ],

    'max_execution_time' => 30,
    'swoole' => [
        'options' => [
            'http_compression' => true,
            'http_compression_level' => 6,
            'compression_min_length' => 20,
            'package_max_length' => 10 * 1024 * 1024,
            'open_http2_protocol' => true,
        ],
    ],
];
```

**Command untuk start Octane:**

```bash
php artisan octane:start --host=127.0.0.1 --port=8000 --workers=4 --task-workers=6
```

---

### 2. **Laravel Reverb (WebSocket) Setup**

**`config/reverb.php`**

```php
<?php

return [
    'default' => env('REVERB_SERVER', 'reverb'),

    'servers' => [
        'reverb' => [
            'host' => env('REVERB_SERVER_HOST', '0.0.0.0'),
            'port' => env('REVERB_SERVER_PORT', 8080),
            'hostname' => env('REVERB_HOST', 'localhost'),
            'options' => [
                'tls' => [],
            ],
            'max_request_size' => 10_000,
            'scaling' => [
                'enabled' => env('REVERB_SCALING_ENABLED', false),
                'channel' => env('REVERB_SCALING_CHANNEL', 'reverb'),
            ],
            'pulse_ingest_interval' => env('REVERB_PULSE_INGEST_INTERVAL', 15),
        ],
    ],

    'apps' => [
        'providers' => [
            AppProvider::class,
        ],

        'apps' => [
            [
                'id' => env('REVERB_APP_ID'),
                'key' => env('REVERB_APP_KEY'),
                'secret' => env('REVERB_APP_SECRET'),
                'options' => [
                    'host' => env('REVERB_HOST'),
                    'port' => env('REVERB_PORT', 443),
                    'scheme' => env('REVERB_SCHEME', 'https'),
                    'useTLS' => env('REVERB_SCHEME', 'https') === 'https',
                ],
                'allowed_origins' => ['*'],
                'ping_interval' => env('REVERB_PING_INTERVAL', 60),
                'max_message_size' => 10000,
            ],
        ],
    ],
];
```

**`.env` Configuration:**

```env
REVERB_APP_ID=your-app-id
REVERB_APP_KEY=your-app-key
REVERB_APP_SECRET=your-app-secret
REVERB_HOST=your-domain.com
REVERB_PORT=443
REVERB_SCHEME=https
```

**Command untuk start Reverb:**

```bash
php artisan reverb:start --host=0.0.0.0 --port=8080
```

---

### 3. **Broadcasting Configuration**

**`config/broadcasting.php`**

```php
<?php

return [
    'default' => env('BROADCAST_DRIVER', 'reverb'),

    'connections' => [
        'reverb' => [
            'driver' => 'reverb',
            'key' => env('REVERB_APP_KEY'),
            'secret' => env('REVERB_APP_SECRET'),
            'app_id' => env('REVERB_APP_ID'),
            'options' => [
                'host' => env('REVERB_HOST', '127.0.0.1'),
                'port' => env('REVERB_PORT', 8080),
                'scheme' => env('REVERB_SCHEME', 'http'),
                'useTLS' => env('REVERB_SCHEME', 'https') === 'https',
            ],
        ],

        'redis' => [
            'driver' => 'redis',
            'connection' => 'default',
        ],
    ],
];
```

---

### 4. **Redis Configuration**

**`config/database.php`** (Redis section):

```php
'redis' => [
    'client' => env('REDIS_CLIENT', 'phpredis'),

    'options' => [
        'cluster' => env('REDIS_CLUSTER', 'redis'),
        'prefix' => env('REDIS_PREFIX', Str::slug(env('APP_NAME', 'laravel'), '_').'_database_'),
    ],

    'default' => [
        'url' => env('REDIS_URL'),
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'username' => env('REDIS_USERNAME'),
        'password' => env('REDIS_PASSWORD'),
        'port' => env('REDIS_PORT', '6379'),
        'database' => env('REDIS_DB', '0'),
    ],

    'cache' => [
        'url' => env('REDIS_URL'),
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'username' => env('REDIS_USERNAME'),
        'password' => env('REDIS_PASSWORD'),
        'port' => env('REDIS_PORT', '6379'),
        'database' => env('REDIS_CACHE_DB', '1'),
    ],

    'session' => [
        'url' => env('REDIS_URL'),
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'username' => env('REDIS_USERNAME'),
        'password' => env('REDIS_PASSWORD'),
        'port' => env('REDIS_PORT', '6379'),
        'database' => env('REDIS_SESSION_DB', '2'),
    ],

    'queue' => [
        'url' => env('REDIS_URL'),
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'username' => env('REDIS_USERNAME'),
        'password' => env('REDIS_PASSWORD'),
        'port' => env('REDIS_PORT', '6379'),
        'database' => env('REDIS_QUEUE_DB', '3'),
    ],
],
```

---

### 5. **API Routes Structure**

**`routes/api.php`**

```php
<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ChatController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::prefix('v1')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
});

// Protected routes
Route::prefix('v1')->middleware(['auth:sanctum', 'localization'])->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/user', [AuthController::class, 'user']);

    // Chat endpoints
    Route::prefix('chat')->group(function () {
        Route::get('/rooms', [ChatController::class, 'rooms']);
        Route::post('/rooms', [ChatController::class, 'createRoom']);
        Route::get('/rooms/{room}/messages', [ChatController::class, 'messages']);
        Route::post('/rooms/{room}/messages', [ChatController::class, 'sendMessage']);
        Route::post('/rooms/{room}/join', [ChatController::class, 'joinRoom']);
    });
});
```

**`routes/channels.php`** (WebSocket channels):

```php
<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\ChatRoom;

Broadcast::channel('chat.{roomId}', function ($user, $roomId) {
    return ChatRoom::where('id', $roomId)
        ->whereHas('members', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })
        ->exists();
});

Broadcast::channel('user.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

Broadcast::channel('presence.chat.{roomId}', function ($user, $roomId) {
    if (ChatRoom::where('id', $roomId)
        ->whereHas('members', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })
        ->exists()) {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'avatar' => $user->avatar_url,
        ];
    }
});
```

---

### 6. **Chat Service Example**

**`app/Services/ChatService.php`**

```php
<?php

namespace App\Services;

use App\Models\ChatMessage;
use App\Models\ChatRoom;
use App\Events\MessageSent;
use App\Jobs\ProcessAIResponse;
use Illuminate\Support\Facades\Cache;

class ChatService
{
    public function __construct(
        private GeminiAIService $aiService
    ) {}

    public function sendMessage(ChatRoom $room, $userId, string $content): ChatMessage
    {
        $message = $room->messages()->create([
            'user_id' => $userId,
            'content' => $content,
            'type' => 'text',
        ]);

        // Broadcast via WebSocket
        broadcast(new MessageSent($message))->toOthers();

        // Cache recent messages
        $this->cacheMessage($room->id, $message);

        // Trigger AI response if needed
        if ($this->shouldTriggerAI($content)) {
            ProcessAIResponse::dispatch($room, $message);
        }

        return $message;
    }

    public function getMessages(ChatRoom $room, int $limit = 50)
    {
        $cacheKey = "chat.{$room->id}.messages";

        return Cache::tags(['chat', "room.{$room->id}"])->remember(
            $cacheKey,
            now()->addMinutes(5),
            fn() => $room->messages()
                ->with('user:id,name,avatar')
                ->latest()
                ->limit($limit)
                ->get()
        );
    }

    private function cacheMessage(int $roomId, ChatMessage $message): void
    {
        $cacheKey = "chat.{$roomId}.messages";
        Cache::tags(['chat', "room.{$roomId}"])->forget($cacheKey);
    }

    private function shouldTriggerAI(string $content): bool
    {
        return str_starts_with(strtolower($content), '@ai');
    }
}
```

---

### 7. **Gemini AI Service**

**`app/Services/GeminiAIService.php`**

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class GeminiAIService
{
    private string $apiKey;
    private string $baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

    public function __construct()
    {
        $this->apiKey = config('services.gemini.api_key');
    }

    public function generateResponse(string $prompt, array $context = []): ?string
    {
        $cacheKey = 'ai.response.' . md5($prompt . json_encode($context));

        return Cache::remember($cacheKey, now()->addHours(24), function () use ($prompt, $context) {
            try {
                $response = Http::withHeaders([
                    'Content-Type' => 'application/json',
                ])
                ->timeout(30)
                ->post("{$this->baseUrl}/models/gemini-pro:generateContent?key={$this->apiKey}", [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => $this->buildPromptWithContext($prompt, $context)]
                            ]
                        ]
                    ],
                    'generationConfig' => [
                        'temperature' => 0.7,
                        'topK' => 40,
                        'topP' => 0.95,
                        'maxOutputTokens' => 1024,
                    ],
                ]);

                if ($response->successful()) {
                    return $response->json('candidates.0.content.parts.0.text');
                }

                return null;
            } catch (\Exception $e) {
                logger()->error('Gemini AI Error: ' . $e->getMessage());
                return null;
            }
        });
    }

    private function buildPromptWithContext(string $prompt, array $context): string
    {
        $contextText = '';
        if (!empty($context)) {
            $contextText = "Context:\n" . implode("\n", $context) . "\n\n";
        }

        return $contextText . "User: " . $prompt;
    }
}
```

**`config/services.php`** (add Gemini config):

```php
'gemini' => [
    'api_key' => env('GEMINI_API_KEY'),
    'model' => env('GEMINI_MODEL', 'gemini-pro'),
],
```

---

### 8. **WebSocket Event & Broadcasting**

**`app/Events/MessageSent.php`**

```php
<?php

namespace App\Events;

use App\Models\ChatMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public ChatMessage $message
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PresenceChannel('chat.' . $this->message->chat_room_id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'content' => $this->message->content,
            'user' => [
                'id' => $this->message->user->id,
                'name' => $this->message->user->name,
                'avatar' => $this->message->user->avatar_url,
            ],
            'created_at' => $this->message->created_at->toISOString(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }
}
```

---

### 9. **Multi-Language Middleware**

**`app/Http/Middleware/LocalizationMiddleware.php`**

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;

class LocalizationMiddleware
{
    private array $supportedLocales = ['en', 'id', 'ja'];

    public function handle(Request $request, Closure $next)
    {
        $locale = $request->header('Accept-Language')
               ?? $request->get('lang')
               ?? 'en';

        $locale = substr($locale, 0, 2);

        if (!in_array($locale, $this->supportedLocales)) {
            $locale = 'en';
        }

        App::setLocale($locale);

        return $next($request);
    }
}
```

---

## 🎨 Konfigurasi Frontend (Astro)

### 1. **Astro Configuration**

**`astro.config.mjs`**

```javascript
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import node from "@astrojs/node";

export default defineConfig({
  output: "hybrid", // SSG + SSR
  adapter: node({
    mode: "standalone",
  }),

  integrations: [tailwind(), react()],

  server: {
    port: 4321,
    host: true,
  },

  vite: {
    ssr: {
      noExternal: ["@astrojs/react"],
    },
  },

  i18n: {
    defaultLocale: "en",
    locales: ["en", "id", "ja"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
```

---

### 2. **API Client Library**

**`src/lib/api.ts`**

```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.PUBLIC_API_URL || "https://api.yourdomain.com",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000,
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        const locale = this.getLocale();

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        if (locale) {
          config.headers["Accept-Language"] = locale;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          this.clearToken();
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string): void {
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== "undefined") {
      this.token = localStorage.getItem("auth_token");
    }
    return this.token;
  }

  clearToken(): void {
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
    }
  }

  getLocale(): string {
    if (typeof window !== "undefined") {
      return localStorage.getItem("locale") || "en";
    }
    return "en";
  }

  // Auth methods
  async login(email: string, password: string) {
    const { data } = await this.client.post("/v1/auth/login", {
      email,
      password,
    });
    this.setToken(data.token);
    return data;
  }

  async register(userData: any) {
    const { data } = await this.client.post("/v1/auth/register", userData);
    return data;
  }

  async logout() {
    await this.client.post("/v1/auth/logout");
    this.clearToken();
  }

  // Chat methods
  async getChatRooms() {
    const { data } = await this.client.get("/v1/chat/rooms");
    return data;
  }

  async getMessages(roomId: string, page = 1) {
    const { data } = await this.client.get(
      `/v1/chat/rooms/${roomId}/messages`,
      {
        params: { page },
      }
    );
    return data;
  }

  async sendMessage(roomId: string, content: string) {
    const { data } = await this.client.post(
      `/v1/chat/rooms/${roomId}/messages`,
      {
        content,
      }
    );
    return data;
  }

  // Generic methods
  async get(url: string, config?: AxiosRequestConfig) {
    const { data } = await this.client.get(url, config);
    return data;
  }

  async post(url: string, payload?: any, config?: AxiosRequestConfig) {
    const { data } = await this.client.post(url, payload, config);
    return data;
  }

  async put(url: string, payload?: any, config?: AxiosRequestConfig) {
    const { data } = await this.client.put(url, payload, config);
    return data;
  }

  async delete(url: string, config?: AxiosRequestConfig) {
    const { data } = await this.client.delete(url, config);
    return data;
  }
}

export const apiClient = new ApiClient();
```

---

### 3. **WebSocket Client**

**`src/lib/websocket.ts`**

```typescript
import Echo from "laravel-echo";
import Pusher from "pusher-js";

declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo: Echo;
  }
}

class WebSocketClient {
  private echo: Echo | null = null;

  initialize(token: string): Echo {
    if (this.echo) {
      return this.echo;
    }

    window.Pusher = Pusher;

    this.echo = new Echo({
      broadcaster: "reverb",
      key: import.meta.env.PUBLIC_REVERB_APP_KEY,
      wsHost: import.meta.env.PUBLIC_REVERB_HOST,
      wsPort: import.meta.env.PUBLIC_REVERB_PORT ?? 443,
      wssPort: import.meta.env.PUBLIC_REVERB_PORT ?? 443,
      forceTLS: (import.meta.env.PUBLIC_REVERB_SCHEME ?? "https") === "https",
      enabledTransports: ["ws", "wss"],
      authEndpoint: `${import.meta.env.PUBLIC_API_URL}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    });

    return this.echo;
  }

  joinChatRoom(
    roomId: string,
    callbacks: {
      onMessage?: (data: any) => void;
      onUserJoined?: (user: any) => void;
      onUserLeft?: (user: any) => void;
      onTyping?: (user: any) => void;
    }
  ) {
    if (!this.echo) {
      throw new Error("WebSocket not initialized. Call initialize() first.");
    }

    const channel = this.echo.join(`chat.${roomId}`);

    if (callbacks.onMessage) {
      channel.listen(".message.sent", callbacks.onMessage);
    }

    if (callbacks.onUserJoined) {
      channel
        .here((users: any[]) => {
          console.log("Users in room:", users);
        })
        .joining((user: any) => {
          callbacks.onUserJoined(user);
        });
    }

    if (callbacks.onUserLeft) {
      channel.leaving((user: any) => {
        callbacks.onUserLeft(user);
      });
    }

    if (callbacks.onTyping) {
      channel.listenForWhisper("typing", callbacks.onTyping);
    }

    return channel;
  }

  leaveChatRoom(roomId: string) {
    if (this.echo) {
      this.echo.leave(`chat.${roomId}`);
    }
  }

  whisperTyping(roomId: string, user: any) {
    if (this.echo) {
      const channel = this.echo.join(`chat.${roomId}`);
      channel.whisper("typing", user);
    }
  }

  disconnect() {
    if (this.echo) {
      this.echo.disconnect();
      this.echo = null;
    }
  }
}

export const wsClient = new WebSocketClient();
```

---

### 4. **Chat Component Example (React)**

**`src/components/Chat/ChatRoom.tsx`**

```typescript
import { useEffect, useState, useRef } from 'react';
import { apiClient } from '../../lib/api';
import { wsClient } from '../../lib/websocket';

interface Message {
  id: number;
  content: string;
  user: {
    id: number;
    name: string;
    avatar: string;
  };
  created_at: string;
}

interface ChatRoomProps {
  roomId: string;
}

export default function ChatRoom({ roomId }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    initializeWebSocket();

    return () => {
      wsClient.leaveChatRoom(roomId);
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getMessages(roomId);
      setMessages(data.messages.reverse());
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeWebSocket = () => {
    const token = apiClient.getToken();
    if (!token) return;

    wsClient.initialize(token);

    wsClient.joinChatRoom(roomId, {
      onMessage: (data: any) => {
        setMessages(prev => [...prev, data]);
      },
      onUserJoined: (user: any) => {
        setOnlineUsers(prev => [...prev, user]);
      },
      onUserLeft: (user: any) => {
        setOnlineUsers(prev => prev.filter(u => u.id !== user.id));
      },
    });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    try {
      await apiClient.sendMessage(roomId, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <h2 className="text-xl font-semibold">Chat Room</h2>
        <p className="text-sm text-gray-600">
          {onlineUsers.length} users online
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex items-start space-x-3">
            <img
              src={message.user.avatar || '/default-avatar.png'}
              alt={message.user.name}
              className="w-10 h-10 rounded-full"
            />
            <div className="flex-1">
              <div className="flex items-baseline space-x-2">
                <span className="font-semibold">{message.user.name}</span>
                <span className="text-xs text-gray-500">
                  {new Date(message.created_at).toLocaleTimeString()}
                </span>
              </div>
              <p className="mt-1 text-gray-800">{message.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t px-6 py-4">
        <form onSubmit={sendMessage} className="flex space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

### 5. **i18n Configuration**

**`src/lib/i18n.ts`**

```typescript
const translations: Record<string, Record<string, string>> = {
  en: {
    "nav.home": "Home",
    "nav.chat": "Chat",
    "chat.send": "Send",
    "chat.typing": "Type a message...",
  },
  id: {
    "nav.home": "Beranda",
    "nav.chat": "Obrolan",
    "chat.send": "Kirim",
    "chat.typing": "Ketik pesan...",
  },
  ja: {
    "nav.home": "ホーム",
    "nav.chat": "チャット",
    "chat.send": "送信",
    "chat.typing": "メッセージを入力...",
  },
};

export function t(key: string, locale: string = "en"): string {
  return translations[locale]?.[key] || translations["en"][key] || key;
}
```

---

## 🐳 Server Configuration

### 1. **Supervisor Configuration**

**`/etc/supervisor/conf.d/octane.conf`**

```ini
[program:octane]
process_name=%(program_name)s
command=php /var/www/backend/artisan octane:start --host=127.0.0.1 --port=8000 --workers=4 --task-workers=6
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/www/backend/storage/logs/octane.log
stopwaitsecs=3600
```

**`/etc/supervisor/conf.d/reverb.conf`**

```ini
[program:reverb]
process_name=%(program_name)s
command=php /var/www/backend/artisan reverb:start --host=0.0.0.0 --port=8080
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/www/backend/storage/logs/reverb.log
```

**`/etc/supervisor/conf.d/queue-worker.conf`**

```ini
[program:queue-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/backend/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
user=www-data
numprocs=4
redirect_stderr=true
stdout_logfile=/var/www/backend/storage/logs/worker.log
stopwaitsecs=3600
```

**`/etc/supervisor/conf.d/astro.conf`**

```ini
[program:astro]
process_name=%(program_name)s
command=node /var/www/frontend/dist/server/entry.mjs
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/www/frontend/astro.log
environment=HOST="0.0.0.0",PORT="4321"
```

---

### 2. **Cloudflare Tunnel Configuration**

**`~/.cloudflared/config.yml`**

```yaml
tunnel: your-tunnel-id
credentials-file: /root/.cloudflared/your-tunnel-id.json

ingress:
  # Frontend
  - hostname: yourdomain.com
    service: http://localhost:4321

  # Backend API
  - hostname: api.yourdomain.com
    service: http://localhost:8000

  # WebSocket (Reverb)
  - hostname: ws.yourdomain.com
    service: http://localhost:8080

  # Filament Admin
  - hostname: admin.yourdomain.com
    service: http://localhost:8000

  # Catch-all
  - service: http_status:404
```

**Start Cloudflare Tunnel:**

```bash
cloudflared tunnel run your-tunnel-name
```

---

### 3. **Nginx Configuration (Optional - if not using Cloudflare Tunnel directly)**

**`/etc/nginx/sites-available/app.conf`**

```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:4321;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# WebSocket (Reverb)
server {
    listen 80;
    server_name ws.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
```

---

## 🔐 Environment Variables

**Backend `.env`**

```env
APP_NAME=YourApp
APP_ENV=production
APP_KEY=base64:...
APP_DEBUG=false
APP_URL=https://api.yourdomain.com

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_database
DB_USERNAME=your_username
DB_PASSWORD=your_password

# Redis
REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

# Cache & Session
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

# Broadcasting
BROADCAST_DRIVER=reverb

# Octane
OCTANE_SERVER=roadrunner

# Reverb
REVERB_APP_ID=your-app-id
REVERB_APP_KEY=your-app-key
REVERB_APP_SECRET=your-app-secret
REVERB_HOST=ws.yourdomain.com
REVERB_PORT=443
REVERB_SCHEME=https

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-pro

# CORS
SANCTUM_STATEFUL_DOMAINS=yourdomain.com
SESSION_DOMAIN=.yourdomain.com
```

**Frontend `.env`**

```env
PUBLIC_API_URL=https://api.yourdomain.com
PUBLIC_REVERB_APP_KEY=your-app-key
PUBLIC_REVERB_HOST=ws.yourdomain.com
PUBLIC_REVERB_PORT=443
PUBLIC_REVERB_SCHEME=https
```

---

## 🚀 Deployment Steps

### 1. **Install Dependencies**

```bash
# Backend
cd /var/www/backend
composer install --optimize-autoloader --no-dev
php artisan key:generate
php artisan migrate --force
php artisan storage:link
php artisan optimize

# Frontend
cd /var/www/frontend
npm install
npm run build
```

### 2. **Start Services**

```bash
# Reload Supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start all

# Check status
sudo supervisorctl status
```

### 3. **Setup Cloudflare Tunnel**

```bash
# Login
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create your-tunnel-name

# Route DNS
cloudflared tunnel route dns your-tunnel-name yourdomain.com
cloudflared tunnel route dns your-tunnel-name api.yourdomain.com
cloudflared tunnel route dns your-tunnel-name ws.yourdomain.com

# Run tunnel as service
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

---

## 📊 Monitoring & Logging

### 1. **Laravel Telescope** (Development)

```bash
composer require laravel/telescope --dev
php artisan telescope:install
php artisan migrate
```

### 2. **Laravel Horizon** (Queue Monitoring)

```bash
composer require laravel/horizon
php artisan horizon:install
php artisan horizon
```

### 3. **Logs Location**

```
/var/www/backend/storage/logs/laravel.log
/var/www/backend/storage/logs/octane.log
/var/www/backend/storage/logs/reverb.log
/var/www/backend/storage/logs/worker.log
/var/www/frontend/astro.log
```

---

## 🔒 Security Best Practices

1. **CORS Configuration** - Set strict origins
2. **Rate Limiting** - Use Laravel's built-in rate limiter
3. **API Versioning** - Always version your APIs (v1, v2, etc)
4. **Input Validation** - Use Form Requests
5. **XSS Protection** - Sanitize all user inputs
6. **CSRF Protection** - Enable for stateful requests
7. **SQL Injection** - Always use Eloquent/Query Builder
8. **Environment Variables** - Never commit .env files
9. **SSL/TLS** - Always use HTTPS via Cloudflare
10. **WebSocket Authentication** - Verify user tokens

---

## ⚡ Performance Optimization

1. **Octane** - Keeps application in memory
2. **Redis Caching** - Cache database queries
3. **Query Optimization** - Use eager loading, indexes
4. **CDN** - Use Cloudflare CDN for static assets
5. **Image Optimization** - Use WebP format, lazy loading
6. **Code Splitting** - Astro does this automatically
7. **Database Indexing** - Index foreign keys and search fields
8. **Queue Jobs** - Offload heavy tasks to queues
9. **OpCache** - Enable PHP OpCache
10. **HTTP/2** - Enabled via Cloudflare

---

## 🧪 Testing Commands

```bash
# Backend
php artisan test
php artisan test --parallel

# Frontend
npm run test

# Load testing
# Use tools like Apache Bench, k6, or Locust
```

---

Arsitektur ini memberikan Anda **sistem yang modern, scalable, secure, dan performant**. Semua komponen dapat di-scale secara independen dan mudah untuk di-maintain atau ditambahkan fitur baru.
