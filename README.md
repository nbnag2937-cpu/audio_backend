# Music Backend

Backend cho web nghe nhạc: **Express + TypeScript + Prisma (MySQL) + Cloudflare R2**, deploy trên **Railway**.

## Tổng quan phân quyền

| Role            | Cần login?              | Quyền                                                                                     |
| --------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| **USER**        | Không                   | Nghe nhạc (phải bấm quảng cáo mở khóa 1 lần/ngày)                                         |
| **ADMIN**       | Có (do SUPER_ADMIN cấp) | CRUD audio của chính mình                                                                 |
| **SUPER_ADMIN** | Có                      | Cấp/xóa tài khoản ADMIN, xem toàn bộ audio & thống kê của mọi ADMIN, CRUD audio như ADMIN |

> **Giả định về `totalListening` / `totalListened`** (đề bài không nói rõ, tôi chọn nghĩa sau — bạn có thể đổi lại nếu muốn):
>
> - `totalListening`: số lần người nghe **bấm phát** bài hát (tăng khi gọi API `stream`)
> - `totalListened`: số lần người nghe **nghe hết** bài hát (tăng khi FE gọi API `complete`, ví dụ lúc bắt sự kiện `ended` của thẻ `<audio>`)

## Cấu trúc dữ liệu Audio trả về (khớp FE)

Mỗi Audio **chỉ có 1 file thật** trên R2 (admin chỉ upload 1 file). Response API tách file đó thành **2 "part"** (chia đôi theo `durationSec` — thời lượng thật, tự đọc từ file lúc upload bằng thư viện `music-metadata`, admin không cần nhập tay). Cả 2 part dùng chung 1 `audioUrl` vì thực chất chỉ có 1 file.

```json
{
  "id": "audio-uuid",
  "title": "Audio 1",
  "description": "Hello",
  "totalListened": 2000,
  "totalListening": 20,
  "createdAt": "2026-08-01T10:00:00.000Z",
  "status": "ready",
  "parts": [
    {
      "id": "audio-uuid-p1",
      "partNumber": 1,
      "title": "Audio 1",
      "durationSec": 1587,
      "audioUrl": "https://..."
    },
    {
      "id": "audio-uuid-p2",
      "partNumber": 2,
      "title": "Audio 1",
      "durationSec": 1587,
      "audioUrl": "https://..."
    }
  ]
}
```

- `status`: `"processing"` (đang xử lý, hiện tại upload là đồng bộ nên hiếm khi thấy trạng thái này) → `"ready"` (đọc duration thành công, sẵn sàng phát) → `"failed"` (không đọc được thời lượng file — file có thể bị hỏng hoặc sai định dạng, admin nên xóa và upload lại).
- Trường `audioUrl` trong `parts` **chỉ xuất hiện** khi được phép xem file thật:
  - ADMIN/SUPER_ADMIN xem chi tiết audio của mình (`GET /api/audios/:id`)
  - USER đã mở khóa hôm nay và gọi API stream (`GET /api/public/audios/:id/stream`)
  - Các trường hợp còn lại (danh sách audio, xem chi tiết public khi chưa mở khóa) sẽ **không có** `audioUrl` để tránh lộ link file.
- API public (`/api/public/*`) chỉ trả về audio có `status = "ready"` — audio đang `processing`/`failed` sẽ không hiện với USER.

## Cơ chế "mở khóa bằng quảng cáo"

- Frontend tự tạo 1 `deviceId` (UUID) ngay lần đầu vào web, lưu vào `localStorage`, dùng lại cho mọi request.
- FE gọi `GET /api/unlock/ad-link` để lấy link quảng cáo, hiển thị cho người dùng bấm (mở tab mới).
- Sau khi người dùng bấm, FE gọi `POST /api/unlock/click` để ghi nhận đã mở khóa **cho ngày hôm đó** (server tính theo UTC).
- Trước khi phát nhạc, FE gọi `GET /api/public/audios/:id/stream?deviceId=...`. Nếu chưa mở khóa hôm nay, API trả về lỗi `403 UNLOCK_REQUIRED` — FE lúc này hiển thị lại nút quảng cáo.
- Ngày hôm sau, `deviceId` đó phải bấm lại (vì record `UnlockLog` được lưu theo `(deviceId, date)`).

## Cấu trúc thư mục

```
src/
├── app.ts                # Khởi tạo Express app, gắn middleware & routes
├── server.ts              # Entry point, start server
├── config/                 # env, prisma client, r2 client
├── middlewares/             # auth, upload (multer), validate (zod), error handler
├── utils/                    # ApiError, asyncHandler, jwt, date
├── types/                     # mở rộng type Express.Request
├── seed/                       # script tạo Super Admin đầu tiên
└── modules/
    ├── auth/          # login, /me  (ADMIN + SUPER_ADMIN)
    ├── audio/         # CRUD audio (ADMIN + SUPER_ADMIN)
    ├── superAdmin/    # quản lý admin & thống kê toàn hệ thống
    ├── public/        # API công khai cho USER (nghe nhạc)
    ├── unlock/        # cơ chế mở khóa bằng quảng cáo theo ngày
    └── storage/        # upload/xóa/lấy URL phát audio trên Cloudflare R2
```

Mỗi module gồm: `*.routes.ts` (khai báo route) → `*.controller.ts` (đọc request, gọi service) → `*.service.ts` (business logic + Prisma) → `*.validation.ts` (schema Zod).

## Response format

Thành công:

```json
{ "success": true, "data": { ... } }
```

Lỗi:

```json
{
  "success": false,
  "code": "UNLOCK_REQUIRED",
  "message": "Ban can bam vao quang cao..."
}
```

## Danh sách API

### 1. Auth — `/api/auth` (ADMIN, SUPER_ADMIN)

| Method | Path              | Body / Query                              | Header                          | Mô tả                                  |
| ------ | ----------------- | ----------------------------------------- | ------------------------------- | -------------------------------------- |
| POST   | `/api/auth/login` | `{ "email": string, "password": string }` | -                               | Đăng nhập, trả về `accessToken` (JWT)  |
| GET    | `/api/auth/me`    | -                                         | `Authorization: Bearer <token>` | Lấy thông tin tài khoản đang đăng nhập |

Response `login`:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "account": { "id": "...", "email": "...", "name": "...", "role": "ADMIN" }
  }
}
```

### 2. Audio — `/api/audios` (ADMIN, SUPER_ADMIN — cần `Authorization: Bearer <token>`)

ADMIN chỉ thao tác được audio **của chính mình**. SUPER_ADMIN thao tác được **audio của mọi ADMIN**.

| Method | Path               | Body / Query                                                                                            | Mô tả                                                                                    |
| ------ | ------------------ | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| GET    | `/api/audios/mine` | -                                                                                                       | Danh sách audio của chính mình (`parts` không có `audioUrl`)                             |
| GET    | `/api/audios/:id`  | -                                                                                                       | Chi tiết 1 audio (`parts` có `audioUrl` để preview lại) — phải là owner hoặc SUPER_ADMIN |
| POST   | `/api/audios`      | `multipart/form-data`: `audioFile` (file), `title` (string, bắt buộc), `description` (string, optional) | Tạo audio mới (upload file lên R2, tự đọc `durationSec` từ file)                         |
| PUT    | `/api/audios/:id`  | `{ "title"?: string, "description"?: string }`                                                          | Cập nhật audio                                                                           |
| DELETE | `/api/audios/:id`  | -                                                                                                       | Xóa audio (xóa cả file trên R2)                                                          |

Giới hạn upload: tối đa **100MB**, chỉ nhận `mp3, m4a, wav, ogg, flac`.

Ví dụ tạo audio bằng `curl`:

```bash
curl -X POST http://localhost:4000/api/audios \
  -H "Authorization: Bearer <token>" \
  -F "title=Bai hat moi" \
  -F "description=Mo ta bai hat" \
  -F "audioFile=@/path/to/file.mp3"
```

### 3. Super Admin — `/api/super-admin` (chỉ SUPER_ADMIN — cần `Authorization: Bearer <token>`)

| Method | Path                          | Body                                                                  | Mô tả                                                                                                           |
| ------ | ----------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/super-admin/admins`     | `{ "email": string, "password": string (>=6 ký tự), "name": string }` | Cấp tài khoản ADMIN mới                                                                                         |
| GET    | `/api/super-admin/admins`     | -                                                                     | Danh sách ADMIN kèm thống kê (`totalAudios`, `totalListening`, `totalListened`)                                 |
| DELETE | `/api/super-admin/admins/:id` | -                                                                     | Xóa tài khoản ADMIN (audio của admin đó cũng bị xóa theo — **file trên R2 không tự xóa**, xem ghi chú bên dưới) |
| GET    | `/api/super-admin/audios`     | -                                                                     | Toàn bộ audio của mọi ADMIN (kèm tên/email chủ sở hữu)                                                          |
| GET    | `/api/super-admin/stats`      | -                                                                     | Thống kê tổng quan hệ thống                                                                                     |

> ⚠️ Khi xóa admin, Prisma cascade sẽ xóa record `Audio` trong DB, nhưng **file thật trên R2 sẽ bị mồ côi** (không tốn thêm code phức tạp trong lần đầu này). Nếu cần dọn dẹp, bạn có thể lấy danh sách `fileKey` trước khi xóa và gọi `deleteAudioFromR2` cho từng file, hoặc chạy 1 script dọn rác định kỳ.

### 4. Public — `/api/public` (USER — không cần login)

| Method | Path                              | Query                                                                                                                                                               | Mô tả                                                                                                                                                                                                                                                                          |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/public/audios`              | `search?`, `page?` (mặc định 1), `pageSize?` (mặc định 20, tối đa 100), `sort?` (`newest` \| `updated`, mặc định `newest`)                                          | Danh sách audio `status=ready`. `sort=newest`: mới đăng gần đây nhất (`createdAt`). `sort=updated`: mới **chỉnh sửa** gần đây nhất (`updatedAt`). `parts` không có `audioUrl`.                                                                                                 |
| GET    | `/api/public/audios/ranking`      | `metric?` (`listening` \| `listened`, mặc định `listening`), `period?` (`today` \| `month` \| `year` \| `all`, mặc định `today`), `limit?` (mặc định 10, tối đa 50) | Bảng xếp hạng: `metric=listening` → **"đang nghe nhiều"** (đếm số lần bấm phát trong `period`). `metric=listened` → **"top lượt nghe"** (đếm số lần nghe hết bài trong `period`). Mỗi item có thêm field `listenCount` (số lượt trong khoảng đó). `parts` không có `audioUrl`. |
| GET    | `/api/public/audios/:id`          | -                                                                                                                                                                   | Chi tiết 1 audio (`status=ready`). `parts` không có `audioUrl`.                                                                                                                                                                                                                |
| GET    | `/api/public/audios/:id/stream`   | `deviceId` (bắt buộc)                                                                                                                                               | Trả về audio đầy đủ, **`parts` có `audioUrl`** — yêu cầu đã mở khóa hôm nay, tăng `totalListening`                                                                                                                                                                             |
| POST   | `/api/public/audios/:id/complete` | -                                                                                                                                                                   | Báo đã nghe hết bài — tăng `totalListened`                                                                                                                                                                                                                                     |

Ví dụ response `ranking`:

```json
{
  "success": true,
  "data": [
    { "id": "...", "title": "Audio 1", "listenCount": 128, "status": "ready", "parts": [...], "...": "..." },
    { "id": "...", "title": "Audio 2", "listenCount": 97, "status": "ready", "parts": [...], "...": "..." }
  ]
}
```

> Cơ chế: mỗi lần gọi API `stream` (bấm phát) hoặc `complete` (nghe hết bài), backend ghi thêm 1 dòng vào bảng `ListenEvent` kèm thời điểm chính xác. API `ranking` gộp (`GROUP BY`) các dòng này theo `audioId`, lọc theo khoảng thời gian (`today`/`month`/`year`/`all`) rồi sắp xếp giảm dần. 2 cột `totalListening`/`totalListened` trên bảng `Audio` chỉ là số đếm dồn (all-time), không tách được theo ngày/tháng/năm — đó là lý do cần thêm bảng log riêng.

Lỗi khi chưa mở khóa:

```json
{
  "success": false,
  "code": "UNLOCK_REQUIRED",
  "message": "Ban can bam vao quang cao de mo khoa nghe nhac hom nay"
}
```

### 5. Unlock (mở khóa quảng cáo) — `/api/unlock` (không cần login)

| Method | Path                  | Body / Query             | Mô tả                                           |
| ------ | --------------------- | ------------------------ | ----------------------------------------------- |
| GET    | `/api/unlock/ad-link` | -                        | Lấy link quảng cáo (`AD_LINK_URL` trong `.env`) |
| POST   | `/api/unlock/click`   | `{ "deviceId": string }` | Ghi nhận đã mở khóa cho hôm nay                 |
| GET    | `/api/unlock/status`  | `deviceId` (query)       | Kiểm tra hôm nay đã mở khóa chưa                |

## Về URL phát nhạc (`playbackUrl`)

- Nếu bạn đặt `R2_PUBLIC_BASE_URL` trong `.env` (bật Public Access hoặc gắn custom domain cho bucket R2) → API trả về link tĩnh, phát nhanh, không hết hạn.
- Nếu để trống → API tự tạo **presigned URL**, hết hạn sau **1 giờ**, an toàn hơn vì bucket không cần public.

---

## Hướng dẫn cài đặt từng bước

### Bước 1 — Cài Node.js & khởi tạo project

Yêu cầu Node.js >= 18 (khuyến nghị 20).

```bash
mkdir music-backend && cd music-backend
# copy toàn bộ source code (đã có sẵn trong file zip) vào đây
npm install
```

### Bước 2 — Chuẩn bị file `.env`

```bash
cp .env.example .env
```

Mở `.env` và điền các giá trị thật:

- `DATABASE_URL`: connection string MySQL (local hoặc Railway), dạng `mysql://user:password@host:port/database`
- `JWT_SECRET`: chuỗi bí mật bất kỳ, càng dài càng tốt
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`: lấy từ Cloudflare Dashboard → R2 → Manage API Tokens
- `AD_LINK_URL`: link quảng cáo bạn muốn hiển thị
- `SEED_SUPER_ADMIN_EMAIL/PASSWORD/NAME`: tài khoản Super Admin đầu tiên

### Bước 3 — Chạy MySQL bằng Docker (local dev)

Nếu chưa có MySQL local, dùng `docker-compose.yml` có sẵn:

```bash
docker compose up -d db
```

Lệnh này chỉ khởi động container MySQL (`db`). Container `api` trong file compose dùng để chạy backend luôn trong Docker nếu bạn muốn (tuỳ chọn) — nếu chỉ muốn chạy MySQL và code backend chạy trực tiếp bằng `npm run dev` ở máy host thì chỉ cần `docker compose up -d db` là đủ.

Nếu chạy MySQL bằng Docker như trên, nhớ sửa `DATABASE_URL` trong `.env` thành:

```
DATABASE_URL="mysql://root:root@localhost:3306/music_db"
```

### Bước 4 — Tạo bảng trong DB bằng Prisma

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Lệnh `migrate dev` sẽ tự tạo các bảng `accounts`, `audios`, `unlock_logs` theo `prisma/schema.prisma`.

### Bước 5 — Seed tài khoản Super Admin đầu tiên

```bash
npm run seed
```

Sau bước này bạn có 1 tài khoản SUPER_ADMIN theo thông tin trong `.env` để đăng nhập lần đầu (dùng để tạo các tài khoản ADMIN khác qua API).

### Bước 6 — Chạy server ở chế độ dev (nodemon)

```bash
npm run dev
```

Server chạy tại `http://localhost:4000`. Kiểm tra nhanh: `GET http://localhost:4000/health`.

### Bước 7 — Build & chạy production

```bash
npm run build
npm start
```

### Bước 8 — Chạy toàn bộ (Postgres + API) bằng Docker Compose (tuỳ chọn)

```bash
docker compose up -d --build
```

Compose sẽ tự chạy `prisma migrate deploy` rồi start server bên trong container `api`.

### Bước 9 — Deploy lên Railway

1. Tạo project mới trên Railway, add **Plugin MySQL** → Railway tự cấp `DATABASE_URL` (copy giá trị này vào biến môi trường của service backend, tên biến `DATABASE_URL`).
2. Tạo **Service** mới từ GitHub repo chứa code này (hoặc `railway up` từ CLI).
3. Vào tab **Variables** của service, khai báo toàn bộ biến trong `.env.example` (trừ `DATABASE_URL` — Railway đã tự cấp nếu bạn link Postgres plugin).
4. Vào tab **Settings**, đặt:
   - Build Command: `npm install && npm run build && npx prisma generate`
   - Start Command: `npx prisma migrate deploy && npm start`
5. Deploy. Sau khi service chạy, mở 1 lần **Railway Shell** (hoặc thêm 1 lần chạy thủ công) để chạy `npm run seed` tạo tài khoản Super Admin đầu tiên trên môi trường production.
6. Cấu hình Cloudflare R2: vào Cloudflare Dashboard → R2 → tạo bucket, tạo API Token (Object Read & Write), copy `Account ID`, `Access Key ID`, `Secret Access Key`, endpoint dạng `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` vào biến môi trường tương ứng.

### Test nhanh luồng chính bằng curl

```bash
# 1. Đăng nhập Super Admin
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@example.com","password":"ChangeMe123!"}'

# 2. Dùng accessToken trả về ở bước 1 để tạo Admin mới
curl -X POST http://localhost:4000/api/super-admin/admins \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1@example.com","password":"123456","name":"Admin 1"}'

# 3. Admin đăng nhập rồi upload audio (xem mục "Audio" phía trên)

# 4. User (không cần login) lấy link quảng cáo, bấm mở khóa, rồi nghe nhạc
curl http://localhost:4000/api/unlock/ad-link
curl -X POST http://localhost:4000/api/unlock/click -H "Content-Type: application/json" -d '{"deviceId":"abc123-device-uuid"}'
curl "http://localhost:4000/api/public/audios/<AUDIO_ID>/stream?deviceId=abc123-device-uuid"
```

## MySQL vs PostgreSQL — có ảnh hưởng gì đến code không?

Dự án này dùng **Prisma ORM**, nên toàn bộ code gọi DB (`prisma.account.findMany`, `prisma.audio.create`...) là **API chung, giống hệt nhau** dù bạn dùng MySQL hay PostgreSQL — không phải sửa service/controller. Chỉ có vài điểm khác ở tầng cấu hình:

|                                     | PostgreSQL                                          | MySQL                                                                                                                                        |
| ----------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider` trong `schema.prisma`    | `postgresql`                                        | `mysql` (đã set sẵn)                                                                                                                         |
| Định dạng `DATABASE_URL`            | `postgresql://user:pass@host:5432/db?schema=public` | `mysql://user:pass@host:3306/db`                                                                                                             |
| Cổng mặc định                       | 5432                                                | 3306                                                                                                                                         |
| Tìm kiếm không phân biệt hoa/thường | cần truyền `mode: "insensitive"`                    | không cần — mặc định MySQL (collation `utf8mb4_unicode_ci`) đã không phân biệt hoa/thường sẵn                                                |
| Độ dài `String` mặc định            | không giới hạn (`TEXT`)                             | giới hạn `VARCHAR(191)` nếu không khai rõ — nên các field `title`/`description` trong schema đã được khai rõ `@db.VarChar(255)` / `@db.Text` |
| UUID làm khóa chính                 | native                                              | vẫn dùng được bình thường qua `@default(uuid())`, Prisma tự xử lý                                                                            |

Project bạn tải ở trên **đã được chỉnh sẵn cho MySQL** (schema, `.env.example`, `docker-compose.yml`) — bạn chỉ cần làm theo đúng các bước cài đặt bên dưới, không cần sửa gì thêm.

## Ghi chú thêm

- Không dùng `any` ở bất kỳ đâu trong source code — mọi type đều được khai báo tường minh hoặc suy ra tự động từ Prisma/Zod.
- Muốn đổi vai trò lưu trữ audio public/private hoàn toàn theo ý khác (ví dụ: giới hạn play count theo IP thay vì `deviceId`) thì sửa ở `modules/unlock` và `modules/public` — 2 module này độc lập, không ảnh hưởng phần CRUD của admin.
# audio_backend
