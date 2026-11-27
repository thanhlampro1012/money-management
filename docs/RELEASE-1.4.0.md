# Money Management 1.4.0 — Secure Vault & Cloud Gist

Chức năng bổ sung: khóa sổ AES-256-GCM tùy chọn, phiên bản lưu cùng sổ phục hồi, mã hóa các bản lưu IndexedDB, file tự cập nhật mã hóa khi bật khóa sổ, bản JSON mã hóa có thể nhập lại bằng mật khẩu, Gist mã hóa ngoài repo Public, xử lý xung đột, tự đẩy Gist khi lưu và nhận có xác nhận giữa các thiết bị.

Nguyên tắc nâng cấp: sổ trước đây không tự di chuyển hoặc thay thế. Mã hóa chỉ bật khi người dùng nhập hai lần mật khẩu và xác nhận. Nếu không bật, hành vi 1.3 vẫn hoạt động. GitHub/Gist kết nối tùy chọn, không lấy token người dùng tự động.

Kiểm tra bảo mật: mã hóa/giải mã sổ, từ chối mật khẩu sai, giữ sổ trên thiết bị khi ciphertext bị lỗi, phát hiện tab stale, tạo Gist chế độ secret, xác thực nội dung Gist, chặn ghi đè khi revision đổi, khôi phục cần xác nhận. Chi tiết hướng dẫn trong [SECURITY-CLOUD.md](SECURITY-CLOUD.md).

**Chưa kiểm chứng:** iPhone/Android vật lý, bàn phím và trình chọn file thực tế trên từng điện thoại; độ sẵn sàng Gist của tài khoản người dùng cho đến khi họ tạo token có quyền; khả năng đồng bộ trong tình huống hai thiết bị gửi PATCH cùng thời điểm (không có transaction máy chủ). Luôn giữ bản sao độc lập.
