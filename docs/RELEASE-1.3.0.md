# Money Management 1.3.0

Ngày hoàn tất kiểm tra: 27/11/2026.

## Thay đổi

- Thêm biểu tượng ví cho màn hình chính, manifest cài đặt và bộ nhớ ứng dụng
  ngoại tuyến. Bản cập nhật chờ người dùng chấp nhận, giữ nguyên sổ dữ liệu.
- Tự tạo lịch sử tối đa 30 bản sau các thay đổi đã lưu thành công. Trước lần
  thay đổi đầu tiên sau nâng cấp, lưu cả trạng thái cũ vào lịch sử.
- Cho phép cập nhật một file JSON đã chọn sau mỗi lần lưu ở trình duyệt hỗ trợ.
  Có lựa chọn tải một JSON mới sau mỗi lần lưu và lưu/chia sẻ thủ công.
- Phân biệt rõ sổ đã lưu trên thiết bị, file đã ghi xong, đang ghi, cần quyền
  hoặc ghi thất bại. Giữ nguyên sổ chính khi tác vụ sao lưu gặp lỗi.
- Bổ sung xử lý sổ chính bị mất nhưng còn bản phục hồi, xung đột giữa các tab,
  hộp chọn file cũ và quyền ghi được chấp thuận sau một lựa chọn mới hơn.
- Nhận đúng cách nhập tiền `85.000`, `85,000` hoặc `85000`; không diễn giải số
  thập phân hay ký hiệu khoa học thành một số tiền khác.
- Cải thiện menu, vùng chạm, biểu mẫu, bàn phím và bố cục ở màn hình hẹp.

## Kết quả xác minh

| Phần | Kết quả |
| --- | --- |
| Cú pháp JavaScript | `npm run check` đạt. |
| Bộ kiểm thử | `npm test`: 116/116 đạt, gồm tài chính, Excel, bộ nhớ, sao lưu, nhập tiền và PWA. |
| Kiểm tra thay đổi | `git diff --check` đạt. |
| Nhập tiền trên giao diện | Nhập `85.000`, lưu và đối chiếu giao dịch hiển thị đúng −85.000 đồng. |
| IndexedDB thực tế | Có bản trước/sau thay đổi, còn sau tải lại trang, khôi phục thành công bản trước. |
| Tải JSON tự động | Trình duyệt kiểm tra phát sinh sự kiện tải sau khi lưu thay đổi trên trang ứng dụng trực tiếp. |
| Bản cập nhật | Kiểm tra cập nhật, chấp nhận và tải lại thành công; giao dịch và lịch sử còn nguyên. |
| Bố cục | Kiểm tra khung rộng 360, 390 và 768 px; chiều rộng nội dung bằng chiều rộng hiển thị, không tràn toàn trang. Nút thêm giao dịch ở 360 px cao 44 px và chiếm hàng riêng. |
| Sáng/tối và menu | Chuyển giao diện, mở/đóng menu, mở biểu mẫu và thao tác khôi phục trên màn hình hẹp. |

Kiểm tra giao diện dùng dữ liệu minh họa trong bản chạy cục bộ, độc lập với sổ
đang dùng trên GitHub Pages. Kiểm thử file tự cập nhật bao gồm các trường hợp
từ chối/thu hồi quyền, đóng file thất bại, hết dung lượng lịch sử, thay đổi nhanh
và lựa chọn giữa nhiều tab; các tình huống lỗi được mô phỏng có kiểm soát.

Chưa kiểm thử trên iPhone/Android vật lý, bàn phím hệ điều hành thật hoặc hộp
chọn file của từng điện thoại. Các kiểm tra nêu trên không khẳng định mọi
trình duyệt hỗ trợ ghi đè file. App phát hiện khả năng thực tế và hiển thị
phương án tải/chia sẻ khi không có API tương ứng.

## Bắt đầu sử dụng

Mở [website chính thức](https://thanhlampro1012.github.io/money-management/),
vào **Cài đặt & dữ liệu → Sao lưu tự động** và chọn cách giữ file riêng.
Lịch sử trên thiết bị hoạt động tự động; file bên ngoài cần người dùng chọn
nơi lưu hoặc bật tải từng bản. Xem [hướng dẫn vận hành](OPERATIONS.md).

Sổ chưa có đăng nhập hay đồng bộ cloud. Không xóa dữ liệu trình duyệt/app
màn hình chính trước khi đã giữ và kiểm tra một bản JSON ở nơi khác.
