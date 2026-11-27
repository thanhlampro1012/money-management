# Money Management 1.4 · Khóa sổ và đồng bộ Gist mã hóa

## Mục đích và nguyên tắc

GitHub Pages chỉ phục vụ mã ứng dụng. **Không đưa tên, giao dịch, tài khoản hoặc sao lưu JSON chưa mã hóa vào repository Public.** Lưu trữ trên máy vẫn hoạt động như phiên bản 1.3 khi bạn chưa bật khóa sổ.

Các tính năng trong bản 1.4:

1. **Khóa sổ tùy chọn:** mật khẩu riêng tối thiểu 12 ký tự; mã hóa sổ chính và bản phục hồi trước khi lưu bằng PBKDF2-SHA256 (420.000 vòng) và AES-256-GCM (nonce ngẫu nhiên 96-bit, salt ngẫu nhiên 128-bit).
2. **Lịch sử khôi phục mã hóa:** bản phục hồi mới được mã hóa trong IndexedDB; sau khi bật mã hóa, app cố gắng chuyển 30 bản lịch sử cũ sang dạng mã hóa. Nếu chuyển thất bại, sẽ báo để bạn kiểm tra; dữ liệu từng ghi vào vùng lưu trữ cũ có thể còn dấu vết trên hệ điều hành.
3. **File tự cập nhật được mã hóa** khi đã bật khóa sổ. File xuất JSON thủ công mặc định vẫn là bản rõ để người dùng dễ khôi phục; sử dụng **Tải bản sao mã hóa** nếu muốn giữ dữ liệu kín. Những bản JSON đã xuất từ trước không được mã hóa lại tự động.
4. **Sao lưu đám mây bằng GitHub Gist:** chỉ upload tệp AES-GCM đã mã hóa, tạo Gist ở chế độ không liệt kê công khai (`public: false`), rồi tự kiểm tra phiên bản trước khi ghi tiếp. Mã truy cập GitHub và khóa đám mây được lưu **bên trong sổ mã hóa** trên thiết bị, không đưa vào GitHub Pages hay source code.
5. **Nhận thay đổi từ thiết bị khác:** app kiểm tra phiên bản Gist, dừng ghi đè nếu phát hiện thay đổi và cho bạn chủ động xác nhận thay sổ. Không hợp nhất hai giao dịch nhập song song và không có giao dịch đồng bộ nguyên tử phía máy chủ.

## Bắt đầu trên thiết bị thứ nhất

1. Mở website chính thức, **xuất một file JSON để dự phòng trước khi kích hoạt mã hóa**. Kiểm tra file thực sự tồn tại trong Tệp/Tải xuống.
2. Vào **Cài đặt & dữ liệu → Mã hóa dữ liệu trên thiết bị**. Nhập mật khẩu riêng từ 12 ký tự trở lên, nhắc lại rồi chọn **Bật mã hóa sổ**. Không có cách lấy lại sổ nếu bạn quên mật khẩu mà không có bản sao khác.
3. Chọn **Tải bản sao mã hóa**, cất file và mật khẩu an toàn ở nơi khác nhau. Sau đó khóa ứng dụng rồi thử mở lại, kiểm tra số giao dịch/ví.
4. Để dùng Gist, tạo **fine-grained personal access token** tại `https://github.com/settings/personal-access-tokens/new` và cấp riêng quyền người dùng **Gists: Read and write**. Không nhập mật khẩu tài khoản GitHub vào app. Nếu tính năng này không có trong tài khoản, dùng phương án sao lưu file JSON riêng.
5. Trong **Sao lưu và đồng bộ qua GitHub**, dán token, đặt **mật khẩu đám mây** từ 12 ký tự trở lên (có thể khác mật khẩu khóa sổ) và **để trống Gist ID** để tạo Gist mã hóa mới. Ghi lại ID Gist. Kiểm tra trạng thái đã kết nối. Mỗi lần lưu một giao dịch, app sẽ thử đẩy bản mã hóa mới khi đang mở và có mạng.

## Kết nối thiết bị thứ hai

1. Mở ứng dụng trên thiết bị thứ hai; **không nhập giao dịch mới vào sổ trống trước khi kết nối**.
2. Tạo một mật khẩu khóa sổ cho thiết bị thứ hai. Không bắt buộc trùng mật khẩu của thiết bị thứ nhất.
3. Trong kết nối GitHub, nhập token có quyền Gist, **ID Gist của thiết bị thứ nhất**, cùng **mật khẩu đám mây** đã dùng khi tạo Gist.
4. Chọn **Xem & khôi phục bản đám mây**, đọc số ví/giao dịch, tải JSON hiện tại nếu cần rồi xác nhận thay sổ cục bộ.
5. Từ đó, thay đổi trên thiết bị này sẽ tự gửi phiên bản mã hóa mới khi ứng dụng đang mở, có mạng và không phát sinh xung đột. Trên thiết bị còn lại, chọn **Kiểm tra bản đám mây → Xem & khôi phục** để nhận thay đổi. App cũng kiểm tra khi có mạng lại và theo định kỳ khi đang mở.

**Không nhập/chỉnh sổ ở hai thiết bị cùng lúc.** GitHub Gist không cung cấp giao dịch cơ sở dữ liệu hoặc đồng bộ tự động hợp nhất. App so sánh revision mới nhất trước khi ghi, nhưng hai yêu cầu ghi đồng thời vẫn có thể tranh chấp trong khoảng thời gian rất ngắn. Giữ thêm bản sao riêng.

## Không làm điều này

- Không chia sẻ token GitHub hoặc mật khẩu trong chat, email, ảnh chụp màn hình, file `.env` đưa lên Public hay mã nguồn.
- Không dùng chung mật khẩu đám mây với mật khẩu GitHub.
- Không xóa dữ liệu website/hủy cài đặt trước khi đã xuất và thử mở bản JSON đã lưu ở nơi khác.
- Không lưu Gist dưới dạng Public có nội dung rõ; Gist "secret" **không phải kho riêng tư tuyệt đối**: ai có URL có thể xem ciphertext.
- Không cho rằng việc trình duyệt báo bắt đầu tải JSON chứng minh file đã tồn tại. Hãy kiểm tra trong Tệp/Tải xuống.

## Giới hạn quan trọng

- Mã hóa mặc định **tắt** để không làm gián đoạn sổ hiện có. Người dùng cần bật thủ công và lưu mật khẩu.
- Bản sao JSON chưa mã hóa từng tải trước đây, bản phục hồi hệ điều hành và bản lưu có thể còn dấu vết vật lý không được xóa an toàn chỉ bằng việc bật khóa sổ.
- Dữ liệu chỉ được bảo vệ **khi lưu**. Nếu thiết bị/extension/trang web chạy mã độc khi sổ đã được mở khóa, mã hóa không ngăn được việc đọc dữ liệu trong phiên.
- File xuất Excel và bản JSON thủ công chưa mã hóa; chỉ file được chọn tự cập nhật sau khi bật khóa sổ và bản **Tải bản sao mã hóa** được mã hóa. Hãy giữ chúng ở nơi riêng tư.
- Gist cần token người dùng cấp và có giới hạn kích thước/tốc độ. Không có máy chủ của app nhận dữ liệu hoặc tài khoản đăng nhập độc lập. Đây là **đồng bộ qua một dịch vụ bên ngoài**, không phải tự đồng bộ hoàn toàn không cần thiết lập.
- Ghi Gist không có compare-and-swap nguyên tử đảm bảo ở phía API; app không tự hợp nhất dữ liệu và ưu tiên dừng khi thấy khác revision, không tuyên bố bảo đảm không mất dữ liệu 100%.
- Không có kiểm thử thiết bị iPhone/Android vật lý trong môi trường tạo mã này. Cần thực hiện thử trên thiết bị thật (thêm 1 giao dịch, tải lại, khóa/mở, kiểm tra sao lưu, thử nhận dữ liệu ở thiết bị thứ hai) trước khi dựa hoàn toàn vào cloud.
