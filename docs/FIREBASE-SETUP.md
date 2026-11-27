# Firebase: đồng bộ Money Management giữa điện thoại và máy tính

**Trạng thái:** Mã nguồn và giao diện đồng bộ Firebase đã tích hợp trong phiên bản 1.5.0.
**Cần bạn tạo/kết nối Firebase project và bật Authentication + Cloud Firestore theo hướng dẫn này** trước khi dịch vụ thực sự nhận dữ liệu. Không thể xác nhận đăng nhập hoặc Firestore production khi chưa có cấu hình dự án Firebase của chủ sở hữu.

## 1. Chuẩn bị dự án Firebase

1. Truy cập [Firebase Console](https://console.firebase.google.com/), tạo dự án mới (gói Spark có giới hạn tài nguyên miễn phí; xem giá hiện hành trước khi dùng thực tế).
2. Thêm ứng dụng **Web** trong Project settings → Your apps. Sao chép đối tượng JavaScript `firebaseConfig` (gồm `apiKey`, `authDomain`, `projectId`, `appId`; có thể thêm `storageBucket`, `messagingSenderId`). Đây là **cấu hình công khai**, không phải admin key. **Không bao giờ nhập service-account JSON, private key, mật khẩu hoặc token quản trị vào website/repo.**
3. Vào **Authentication → Sign-in method**, bật **Email/Password**. Khi đăng ký lần đầu, người dùng sử dụng email và mật khẩu riêng cho tài khoản Firebase, không phải GitHub.
4. Vào **Firestore Database**, tạo database ở **Production mode** và chọn region thích hợp. Sau đó vào tab **Rules**, chép nội dung file [`firestore.rules`](../firestore.rules), nhấn **Publish**. Bản rules hạn chế đường dẫn `users/{uid}/private/ledger` cho chủ UID, kiểm tra kích thước, định dạng và revision tăng đúng một đơn vị. Không dùng `allow read, write: if true`.
5. Đảm bảo domain website `thanhlampro1012.github.io` được phép nếu Firebase/Authentication yêu cầu đặt domain được ủy quyền. Tránh đưa các domain không cần thiết vào cấu hình.
6. Bật App Check hoặc hạn chế API key khi cần để giảm lạm dụng; API key của ứng dụng Web không thay thế Firestore Security Rules. Không đặt quy tắc cho phép mọi tài khoản đọc sổ của người khác.

## 2. Bật đồng bộ trên thiết bị đang giữ sổ gốc

1. Vào <https://thanhlampro1012.github.io/money-management/> → **Cài đặt & dữ liệu**. Xuất một **JSON** và giữ riêng ở nơi an toàn trước khi nâng cấp.
2. Tại **Mã hóa dữ liệu trên thiết bị**, bật khóa sổ bằng mật khẩu riêng (ít nhất 12 ký tự). Ghi nhớ mật khẩu này. Mã hóa tại chỗ không thể gỡ khóa nếu quên mật khẩu.
3. Tại **Đồng bộ điện thoại và máy tính · Firebase**, mở phần **Cấu hình Firebase Web App**, dán JSON `firebaseConfig` và lưu. Cấu hình nằm trong bộ nhớ trình duyệt thiết bị này.
4. **Tạo tài khoản** với email + mật khẩu Firebase hoặc **Đăng nhập** nếu đã đăng ký.
5. Nhập **mật khẩu mã hóa đám mây riêng** (ít nhất 12 ký tự, khác mật khẩu Firebase), rồi bấm **Tạo bản cloud từ sổ này**. Xác nhận chọn sổ chính. Dữ liệu sẽ được AES-256-GCM mã hóa **trước** khi Firestore nhận; chỉ dữ liệu mã hóa, revision, timestamp và UID được ghi lên Firestore.
6. Chỉ coi lần sao lưu thành công khi trạng thái hiển thị **Đã đồng bộ**, và đối chiếu revision trên tài khoản Firebase của bạn. Giữ file JSON độc lập để đề phòng lỗi mạng hoặc quên mật khẩu mã hóa.

## 3. Kết nối điện thoại hoặc máy tính thứ hai

1. Mở cùng link website, vào Cài đặt. Nếu bạn đã thêm app vào màn hình chính từ một trình duyệt khác, hãy coi đây là kho dữ liệu riêng và tạo bản sao JSON trước.
2. Bật khóa sổ ở thiết bị thứ hai. Dán cùng `firebaseConfig` vào phần Firebase; đăng nhập **cùng tài khoản Firebase**.
3. Nhập **đúng mật khẩu mã hóa đám mây** ở thiết bị đầu, bấm **Giải mã và xem bản cloud**.
4. Bấm **Nhận bản Firebase** và xác nhận thay sổ cục bộ bằng bản cloud. Nếu thiết bị hai đã có dữ liệu, **xuất JSON trước**; thao tác này không tự trộn hai sổ.
5. Thử thêm một giao dịch 10.000₫ ở máy 1 khi online; trên máy 2, mở website/đưa lên nền trước hoặc bấm **Kiểm tra cập nhật**. Kiểm tra đúng giao dịch và số dư. Thử chiều ngược lại.

## 4. Đồng bộ an toàn và giới hạn

- App luôn **lưu vào máy trước**, rồi đưa bản mã hóa lên Firestore khi online. Nếu mạng bị mất hoặc Firebase lỗi, sổ vẫn ở máy; trạng thái hiển thị chưa đồng bộ. Mở lại app khi có mạng để đồng bộ bù.
- Firestore dùng **giao dịch nguyên tử kiểm tra revision**. Khi hai thiết bị đồng thời ghi trên cùng revision, một lượt ghi sẽ từ chối; app **không âm thầm ghi đè**. Khi remote có bản mới và máy vẫn sạch, app tự nhận bản mới. Khi cả hai có thay đổi chưa đồng bộ, app báo xung đột để bạn tải JSON mỗi sổ và chọn bản muốn giữ. **Không tự gộp** các giao dịch khác nhau.
- Mỗi người đăng nhập có một tài liệu `users/{uid}/private/ledger`. Firestore chỉ lưu **một bản snapshot mã hóa**, không phải lịch sử nhiều phiên bản; 30 bản phục hồi cục bộ và JSON vẫn quan trọng.
- Nếu đang mở biểu mẫu chưa lưu, app chờ bạn hoàn tất rồi mới nhận bản cloud. Tránh mở nhiều tab cùng sổ hoặc chỉnh sửa khi mạng chập chờn.
- Firestore một tài liệu tối đa ~1 MiB. Bản triển khai này chủ động giới hạn JSON đã mã hóa nhỏ hơn mức đó; sổ lớn cần chuyển sang mô hình phân trang hoặc backend riêng.
- Mã hóa phía client không thay thế bảo vệ mật khẩu, hệ điều hành, khóa thiết bị hay backup. Mất **mật khẩu mã hóa đám mây** sẽ khiến bản cloud không thể giải mã; Firebase không thể đặt lại mật khẩu này.
- Việc sign out chỉ ngắt tài khoản Auth, không xóa sổ cục bộ hay dữ liệu trên Firestore. Khi chuyển sang một tài khoản khác, app không tự chuyển dữ liệu giữa các tài khoản.
- Firestore tính phí tùy gói và số lượt đọc/ghi. Cơ chế realtime có thể tạo read usage khi có nhiều thiết bị, nên theo dõi Firebase Console.

## 5. Kiểm thử và triển khai

- `npm run check && npm test` kiểm thử code và mô phỏng hai thiết bị, offline và xung đột; **không** thay thế kiểm thử với Firebase Auth và Firestore thực trên tài khoản của bạn.
- Đừng xuất bản website với cấu hình giả rồi tuyên bố “đồng bộ đã chạy” khi chưa có Firebase project được kết nối và Security Rules đã Publish.
- Nếu cập nhật app lên nhánh `main`, CI kiểm thử rồi GitHub Pages tự xuất bản. Service worker phải tăng version để không ghép module cũ/mới.
