# REST API Documentation - Laundry Backend

Base URL for all API calls: `http://localhost:7000` (atau sesuai dengan URL server Anda).
Sebagian besar endpoint memerlukan otentikasi berupa token JWT (Bearer Token) dari **Auth0**.

---

## Response Standar (Secara Umum)

Semua endpoint yang telah di-*refactor* akan mengembalikan format konsisten seperti ini.
```json
// Berhasil
{
  "success": true,
  "message": "Pesan keberhasilan di sini",
  "data": { ... } // (Berisi objek atau array dari hasil request)
}

// Gagal / Error
{
  "success": false,
  "message": "Pesan error di sini",
  "errors": null // (Opsional)
}
```

---

## 1. System Health 🏥

### `GET /health`
Mengecek apakah server berjalan dengan normal.
- **Otentikasi:** Tidak
- **Response `200 OK`:**
```json
{
  "message": "health OK!"
}
```

---

## 2. User API 👤 (Pelanggan)
Base URL: `/api/my/user`

### `GET /`
Mendapatkan profil pengguna saat ini yang sedang login.
- **Otentikasi:** Ya (Token JWT diperlukan)
- **Response:**
  Mengembalikan object form database user saat ini.

### `POST /`
Mendaftarkan User ID Auth0 baru ke Database setelah *sign up/login* pertama kali dari frontend.
- **Otentikasi:** Ya
- **Body Request:**
```json
{
  "auth0Id": "string (opsional, jika diambil otomatis via token)"
}
```

### `PUT /`
Memperbarui/Update data profil form alamat dari pelanggan tersebut.
- **Otentikasi:** Ya
- **Body Request:**
```json
{
  "name": "Budi",
  "addressLine1": "Jl. Mawar No 12",
  "city": "Jakarta",
  "country": "Indonesia"
}
```

---

## 3. Public Laundry API 🏪 (Pencarian oleh Pelanggan)
Base URL: `/api/laundry`

### `GET /search/:city`
Mencari dan menampilkan daftar laundry berdasarkan nama kota ("city"). Cocok untuk halaman pencarian atau Home Page pelanggan.
- **Otentikasi:** Tidak (Publik)
- **Query Parameter (Opsional):**
  - `?searchQuery=LaundryBerkah` (Pencarian berdasarkan nama)
  - `?selectedFacilities=Antar-Jemput,Setrika` (Dipisahkan koma)
  - `?sortOption=deliveryPrice` (Atau `lastUpdated`, dll)
  - `?page=1` (Paginasi halaman)
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Search completed successfully",
  "data": {
    "data": [ ...array of laundry object ],
    "pagination": {
      "total": 50,
      "page": 1,
      "pages": 5
    }
  }
}
```

### `GET /:laundryId`
Mengambil halaman *detail* dari spesifik toko laundry (menampilkan jasa/service yang tersedia, jam, dan deskripsinya) berdasarkan ID.
- **Otentikasi:** Tidak (Publik)

---

## 4. Order API 🛒 (Pemesanan & Pembayaran Midtrans)
Base URL: `/api/order`

### `POST /checkout/create-checkout-session`
Membuat Tagihan Pemesanan via Midtrans Snap API dari keranjang pelanggan.
- **Otentikasi:** Ya (Pelanggan)
- **Body Request:**
```json
{
  "laundryId": "ObjectId String",
  "deliveryDetails": {
    "name": "Budi",
    "email": "budi@mail.com",
    "addressLine1": "Jl. Mawar",
    "city": "Jakarta"
  },
  "cartItems": [
    {
      "serviceId": "ObjectId String Layanan",
      "name": "Cuci Kering",
      "quantity": "2"
    }
  ]
}
```
- **Response `200 OK`:** Mengembalikan Link URL (Snap Redirect) untuk di-*(redirect)* oleh frontend menuju halaman pembayaran Midtrans.
```json
{
  "success": true,
  "data": {
    "url": "https://app.midtrans.com/snap/v2/vtweb/xxxxxxxxxxxx"
  },
  "message": "Checkout session created successfully"
}
```

### `GET /`
Mengambil semua *history/riwayat* pesanan milik Pelanggan saat ini.
- **Otentikasi:** Ya (Pelanggan)

### `POST /checkout/webhook`
Digunakan oleh Sistem Server Midtrans untuk memberi pemberitahuan otomatis ke belakang layar (`Background process`) apabila pembayaran berhasil/gagal.
_(Frontend Tidak memanggil endpoint ini)_

---

## 5. My Laundry API 🧺 (Dashboard Mitra/Pemilik Usaha)
Base URL: `/api/my/laundry`
_(API Ini digunakan jika Frontend memiliki fitur "Buka/Kelola Usaha Laundry Sendiri")_

### `GET /`
Mengambil spesifik detail dari "Toko Laundry" yang dimiliki user yang sedang login.
- **Otentikasi:** Ya (Mitra)

### `POST /`
Membuat toko laundry baru (Buka Toko).
- **Otentikasi:** Ya
- **Tipe Body:** `multipart/form-data` (Bukan JSON, melainkan Form HTML karena ada File Gambar)
- **Data (Key-Value):** 
  - `laundryName`: nama usaha
  - `city`: kota
  - `country`: negara
  - `deliveryPrice`: harga antar-jemput
  - `estimatedDeliveryTime`: perkiraan jam selesai
  - `facilities`: array (atau JSON string fasilitas)
  - `services`: array (JSON layanan: harga, dsb)
  - `latitude`: angka / decimal koordinat GPS (opsional)
  - `longitude`: angka / decimal koordinat GPS (opsional)
  - `imageFile`: **(File Image .png / .jpg)**

### `PUT /`
Update data properti toko (sama persis formatnya dengan metode `POST` di atas).

### `GET /order`
Melihat daftar *semua* pesanan (Order Masuk) dari pelanggan yang memesan di tokonya.

### `PATCH /order/:orderId/status`
Memperbarui Status Pesanan/pengantaran.
- **Otentikasi:** Ya (Mitra)
- **Body JSON:**
```json
{
  "status": "inProgress" // opsinya: "placed", "paid", "inProgress", "outForDelivery", "delivered"
}
```

---

## 6. Admin API 🛡️ (Dashboard Administrasi Utama)
Base URL: `/api/admin`
🚨 *Hanya user yang field `role` bernilai `"admin"` yang bisa mengakses ini.*

### `GET /stats`
Menampilkan angka *summary* atau ringkasan metrik statistik secara global (seperti jumlah total _user_, jumlah pemasukan/_revenue_, status toko, order, dll) yang cocok ditaruh di halaman beranda kotak *Dashboard Admin*.
- **Otentikasi:** Ya (Khusus Admin)

### `GET /users`
Mendapatkan tabel daftar seluruh user yang terdaftar pada sistem (termasuk Partner dan Admin lain).
- **Otentikasi:** Ya (Khusus Admin)

### `GET /laundries`
Mendapatkan tabel seluruh toko laundry beserta profile (Nama & email) pemiliknya yang tersebar di sistem.
- **Otentikasi:** Ya (Khusus Admin)

---

## 7. Withdrawal API 💸 (Pencairan Dana Mitra)
Base URL: `/api/withdrawal`
Sistem komisi di mana Mitra menarik saldo penghasilannya (setelah dipotong komisi admin 10% di setiap transaksi sukses).

### `POST /request`
Mengajukan permohonan penarikan dana/saldo bagi Mitra yang sedang login.
- **Otentikasi:** Ya (Mitra)
- **Body JSON:**
```json
{
  "amount": 50000,
  "bankName": "BCA",
  "bankAccountName": "Budi Santoso",
  "bankAccountNumber": "1234567890"
}
```

### `GET /my`
Mendapatkan histori atau riwayat pengajuan penarikan dana milik Mitra yang sedang login.
- **Otentikasi:** Ya (Mitra)

### `GET /all`
Mendapatkan semua riwayat penarikan dana dari seluruh mitra di sistem (untuk diulas dan disetujui Admin).
- **Otentikasi:** Ya (Khusus Admin)

### `PATCH /:id/status`
Digunakan Admin untuk menerima (approve) atau menolak (reject) pengajuan dana Mitra.
- **Otentikasi:** Ya (Khusus Admin)
- **Body JSON:**
```json
{
  "status": "approved" // atau "rejected"
}
```
