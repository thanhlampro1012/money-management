# Đối chiếu tính năng và phạm vi bản 1.2

> **Cập nhật 1.5.1:** Ứng dụng đã có mã nguồn đăng nhập/đồng bộ Firebase, mã hóa cục bộ, sao lưu JSON và khắc phục cạnh tranh giữa hai thiết bị. **Firebase chưa tự kích hoạt trên website công khai:** chủ dự án phải tạo hoặc kết nối dự án Firebase, bật Authentication + Firestore và công bố Security Rules. Xem [hướng dẫn Firebase](FIREBASE-SETUP.md), [ghi chú 1.5.1](RELEASE-1.5.1.md). Các kiểm thử tự động không thay thế việc thử bằng hai thiết bị thực tế.


Đối chiếu ngày **27/11/2026** từ website và trung tâm trợ giúp chính thức của bốn ứng dụng. Mục tiêu là chọn các cải tiến hữu ích cho sổ cá nhân chạy tại trình duyệt; đây là đối chiếu tính năng được công bố, không phải kiểm thử trực tiếp tài khoản của các sản phẩm.

## Các khả năng có liên quan

| Sản phẩm | Khả năng được nguồn chính thức xác nhận | Điều rút ra cho Money Management |
| --- | --- | --- |
| **Money Lover** | Premium có giao dịch lặp, hóa đơn và xuất CSV/Google Sheets. Tài liệu lịch lặp nêu các chu kỳ ngày/tuần/tháng/năm. [Nguồn 1](https://moneylover.zendesk.com/hc/en-us/articles/35836986998809-Premium-Main-features-and-purchase-instructions), [Nguồn 2](https://moneylover.zendesk.com/hc/en-us/articles/36097569751833-Recurring-transactions-Definition-and-Usage). | Có mẫu cho khoản lặp giúp giảm nhập lại. Bản 1.2 chọn ghi nhận sau xác nhận để phân biệt kế hoạch với số tiền thực tế. |
| **Sổ Thu Chi MISA** | Trang sản phẩm công bố xuất Excel/PDF, hạn mức chi tiêu, theo dõi vay nợ, chia sẻ gia đình/nhóm và đồng bộ cloud. [Nguồn 3](https://sothuchi.misa.vn/?lang=vi). | Xuất Excel hữu ích ngay cho phân tích. Đồng bộ, chia sẻ và vay/nợ cần phạm vi triển khai riêng. |
| **Wallet by BudgetBakers** | Bản web hỗ trợ xuất CSV/XLS và bộ lọc khoảng ngày; xuất dữ liệu là tính năng Premium. Planned Payments có lựa chọn xác nhận thủ công/tự động trên ứng dụng di động; tài liệu ghi tính năng này chưa có trên web. [Nguồn 4](https://support.budgetbakers.com/hc/en-us/articles/7151606064018-How-to-export-transactions-from-Wallet), [Nguồn 5](https://support.budgetbakers.com/hc/en-us/articles/7149523920786-Setup-Planned-Payments). | Bộ lọc từ ngày đến ngày nên dùng chung cho danh sách và file xuất. Cần nói rõ nền tảng và cách xác nhận lịch, không suy diễn mọi khả năng đều có trên web. |
| **YNAB** | Có tạo, đổi tên và tổ chức danh mục/nhóm; có giao dịch theo lịch. Tài liệu nêu lịch ngày 31 sử dụng ngày cuối của tháng ngắn. [Nguồn 6](https://support.ynab.com/en_us/adding-removing-and-customizing-categories-a-guide-HJFO5j909?mobile-help=true), [Nguồn 7](https://support.ynab.com/scheduled-transactions-a-guide-BygrAIFA9?mobile-help=true). | Danh mục tự tạo giúp sổ phản ánh cách chi tiêu thực tế. Lịch tháng cần giữ ngày gốc để không bị trôi sau tháng 2. |

Các khả năng trong bảng có thể thuộc gói trả phí hoặc nền tảng cụ thể như đã ghi. Bảng không so sánh giá và không khẳng định các sản phẩm có cùng mô hình tính ngân sách.

## Ưu tiên đã chọn cho Money Management 1.2

Phần dưới là **nhận định triển khai của dự án** dựa trên phạm vi sổ cục bộ, không phải đánh giá xếp hạng các ứng dụng:

| Ưu tiên | Cải tiến | Lý do và cách triển khai |
| --- | --- | --- |
| 1 | **Danh mục tự tạo** | Bổ sung nhóm thu/chi thực tế mà danh mục mặc định chưa bao quát; dùng chung trong giao dịch, ngân sách, lịch và báo cáo. Chặn xóa khi còn tham chiếu để bảo toàn dữ liệu. |
| 2 | **Khoản định kỳ cần xác nhận** | Hỗ trợ tuần/tháng/năm, ghi từng kỳ, bỏ kỳ và tạm dừng. Cho sửa số tiền/ngày thực tế lúc ghi mà không thay mẫu; không tự tạo khoản chi khi người dùng chưa xác nhận. |
| 3 | **Khoảng ngày linh hoạt** | Chọn khoảng bao gồm hai đầu, kết hợp bộ lọc danh mục/ví/loại/từ khóa; file xuất phải dùng đúng tập kết quả trên mọi trang. |
| 4 | **Excel có tổng hợp và công thức** | File XLSX gồm Theo ngày và Giao dịch, ngày tăng dần, tổng thu/chi riêng với chuyển ví. `SUM`/`SUMIFS` giúp đối chiếu và phân tích ngoài app. |
| 5 | **Thông tin cần theo dõi và giao diện** | Tổng quan nêu khoản đến hạn, ngân sách từ 80% hoặc đã chạm hạn mức. Sáng/tối/theo hệ thống được lưu cục bộ để thuận tiện sử dụng. |

Lịch chỉ nhắc khi app được mở. Giao dịch dự kiến chưa xác nhận không làm thay đổi số dư, thu/chi hoặc ngân sách. Các cải tiến này vẫn dùng sổ tại cùng trình duyệt và origin, với JSON là định dạng sao lưu/khôi phục.

## Chưa nằm trong phạm vi

- **Đồng bộ cloud và nhiều thiết bị:** cần máy chủ dữ liệu, tài khoản, phân quyền, cơ chế xung đột và khôi phục được kiểm chứng. Xuất/nhập JSON là chuyển bản sao thủ công, không phải đồng bộ.
- **Sổ dùng chung:** cần mô hình sở hữu, quyền xem/sửa, lịch sử thay đổi và xử lý nhiều người ghi đồng thời. Cổng truy cập website không tự cung cấp các chức năng đó.
- **Theo dõi vay/nợ chuyên biệt:** cần theo dõi đối tác, gốc, trả nợ, lãi và tác động lên báo cáo; chưa thay bằng một màn hình đơn giản dễ làm sai số liệu.
- **Kết nối ngân hàng và tự thanh toán:** chưa có tích hợp tài khoản ngân hàng, nhập sao kê tự động hoặc API chuyển tiền. Chuyển giữa ví trong app chỉ là ghi chép.
- **Thông báo nền và mã hóa dữ liệu:** chưa có gửi nhắc khi app đóng, mã hóa sổ hoặc mã hóa file sao lưu. Chế độ tối và cổng đăng nhập trang không thay đổi những giới hạn này.

Hướng dẫn sử dụng và các giới hạn vận hành cụ thể nằm trong [OPERATIONS.md](OPERATIONS.md).
