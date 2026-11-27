# Money Management 1.5.1 - Safety and account recovery

Ngày phát hành: 27/11/2026.

## Sửa lỗi và hoàn thiện

- Giảm nguy cơ mất giao dịch khi một bản sổ Firebase đang được giải mã nhưng thiết bị đồng thời vừa lưu giao dịch mới: kiểm tra lại dấu vân tay sổ ngay trước khi tự nhận bản cloud.
- Chặn một thông báo Firestore cũ (giải mã chậm) tự thay thế một phiên bản cloud mới hơn. Các lượt nhận bất đồng bộ chỉ được áp dụng khi cùng tài khoản và đúng phiên bản chờ xử lý.
- Khi người dùng xác nhận nhận sổ Firebase, xác minh lại trạng thái biểu mẫu và nội dung trước khi ghi, tránh ghi đè khi dữ liệu vừa thay đổi.
- Sau thao tác giải quyết xung đột, nếu có chỉnh sửa mới trong lúc tác vụ đang chạy, dữ liệu tiếp tục được đánh dấu là chưa đồng bộ và đưa vào hàng đợi.
- Thêm **Quên mật khẩu?** cho tài khoản Firebase Email/Password (gửi email đặt lại bằng Firebase Auth). Đây **không** phải cách khôi phục mật khẩu mã hóa AES-GCM, vốn vẫn phải được chủ sổ lưu riêng.
- Yêu cầu nhập lại mật khẩu mã hóa đám mây khi tạo bản sổ đầu tiên, ngăn lỗi gõ sai khiến thiết bị khác không mở được.
- Cập nhật ứng dụng PWA sẽ chờ tác vụ sao lưu/Firebase/Gist hoàn tất và từ chối cập nhật nếu vẫn đang lưu giao dịch hoặc thực hiện thao tác đám mây.

## Kiểm tra

- Kiểm thử hồi quy tài chính/Excel, localStorage, IndexedDB, PWA, mã hóa, Gist, Firebase; thêm kịch bản đua dữ liệu giữa hai thiết bị, sign-out trong khi giải mã, nhận thông báo Firestore cũ, email đặt lại mật khẩu và xác nhận khóa.
- Kiểm thử SDK giả lập không thay thế việc bật dự án Firebase Auth/Firestore thật và xác nhận trên hai thiết bị vật lý.
- Trong môi trường kiểm tra này trình duyệt tự động bị giới hạn truy cập URL nội bộ; không xác nhận kiểm tra Safari/Chrome trên thiết bị thật.

## Còn cần thiết lập bởi chủ dự án

**Chưa có Firebase project thực tế được kết nối.** Để kích hoạt: tạo/chọn Firebase project trong Firebase Console, bật Email/Password, tạo Cloud Firestore, xuất bản `firestore.rules`, nhập `firebaseConfig` của Web App vào Cài đặt của website, đăng nhập và xác nhận tạo bản cloud. Trên thiết bị thứ hai đăng nhập cùng tài khoản và nhận sổ bằng mật khẩu giải mã.

Không đưa service-account key hoặc mật khẩu vào mã nguồn GitHub. Giữ JSON riêng trước lần bật đồng bộ.
