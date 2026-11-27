# Money Management 1.5.0 — Firebase Sync (opt-in)

Ngày: 27/11/2026.

## Đã bổ sung

- Đăng ký/đăng nhập tài khoản email-password bằng Firebase Authentication trong mục Cài đặt.
- Đồng bộ dữ liệu đã mã hóa AES-256-GCM lên Firestore trong đường dẫn chỉ chủ tài khoản UID được phép đọc/ghi.
- Tạo bản Firestore từ thiết bị chính, kết nối và giải mã trên thiết bị hai, yêu cầu xác nhận trước khi thay sổ cục bộ.
- Lắng nghe bản cloud mới khi online và tự áp dụng nếu máy không có thay đổi chưa đồng bộ; giữ các chỉnh sửa offline và gửi lại sau khi có mạng.
- Giao dịch Firestore kiểm tra tăng `revision` nguyên tử để không tự ghi đè khi hai thiết bị sửa cùng lúc.
- Phát hiện xung đột, hiển thị cảnh báo và cho người dùng chọn dùng cloud hoặc giữ máy sau xác nhận; không tự gộp giao dịch.
- Bộ kiểm thử bổ sung cho thiết lập cấu hình, mã hóa, đăng nhập khôi phục, hai thiết bị, offline, đồng bộ online, cảnh báo xung đột và phân quyền Firestore.
- Hướng dẫn thiết lập Firestore Security Rules: [`FIREBASE-SETUP.md`](FIREBASE-SETUP.md), [`../firestore.rules`](../firestore.rules).

## Giới hạn vận hành

- Firebase không thể hoạt động trước khi chủ tài khoản tạo dự án và công bố Security Rules, bật Authentication/Firestore. Cần nhập `firebaseConfig` công khai vào Cài đặt của mỗi thiết bị hoặc tích hợp cố định bằng bản phát hành sau. **Chưa triển khai server Firebase thật trong lượt này.**
- Cần bật mã hóa trên thiết bị trước khi dùng Firebase; mật khẩu giải mã đám mây độc lập với mật khẩu đăng nhập. Không có chức năng đặt lại mật khẩu giải mã.
- App dùng snapshot sổ nguyên khối (giới hạn kích thước tài liệu), chưa tự gộp hai bản offline; nếu cùng sửa offline phải chọn bản giữ lại.
- Chưa xác minh trên iPhone/Android vật lý hoặc dịch vụ Firebase project thật. Đã kiểm thử logic với máy chủ giả lập và kiểm thử các chức năng tài chính cũ trên CI.
- Ứng dụng vẫn chạy offline với dữ liệu cục bộ, không tự gửi dữ liệu lên cloud trước khi người dùng đăng nhập và tạo/liên kết sổ.
