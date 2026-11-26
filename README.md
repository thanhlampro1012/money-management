# Money Management

**Phiên bản 1.2.0** — ứng dụng ghi chép thu chi cá nhân bằng tiếng Việt, sử dụng Việt Nam đồng (VND). Ứng dụng chạy trong trình duyệt, không có dependency bên ngoài hoặc bước build.

[Mở ứng dụng](https://vi-minh-lam-finance.workspace-qu-1719.chatgpt.site) · [Hướng dẫn vận hành](docs/OPERATIONS.md) · [Đối chiếu tính năng và ưu tiên](docs/COMPARISON.md)

## Phạm vi sử dụng

Money Management phục vụ **một người quản lý sổ trên một trình duyệt và một địa chỉ website**, với bản sao JSON được tải xuống định kỳ. Dữ liệu lưu trong `localStorage`; chưa có máy chủ dữ liệu, đồng bộ nhiều thiết bị, mã hóa sổ hoặc kết nối ngân hàng. Chức năng chuyển giữa ví chỉ ghi nhận việc chuyển tiền đã thực hiện, không gọi API chuyển tiền.

Nếu bản triển khai yêu cầu đăng nhập ChatGPT để mở trang, đó là kiểm soát quyền truy cập website. Cơ chế này không mã hóa dữ liệu trong trình duyệt và không tạo một tài khoản dữ liệu đồng bộ cho sổ.

## Tính năng

| Khu vực | Chức năng |
| --- | --- |
| Tổng quan | Số dư toàn bộ ví; thu, chi và chênh lệch theo tháng; biểu đồ dòng tiền và danh mục chi tiêu. |
| Giao dịch | Thêm, sửa, xóa khoản thu, chi và chuyển giữa ví; tìm kiếm không dấu; lọc theo tháng, khoảng ngày, loại, danh mục và ví. |
| Ví | Quản lý ví, số dư ban đầu, số dư hiện tại và giao dịch liên quan; kiểm tra cả ví gửi lẫn ví nhận trước khi xóa. |
| Danh mục | Tạo danh mục thu/chi riêng, đổi tên, biểu tượng và màu; giữ danh mục đang được giao dịch, ngân sách hoặc lịch định kỳ tham chiếu. |
| Khoản định kỳ | Lịch thu/chi hằng tuần, tháng, năm; xác nhận ghi từng kỳ với số tiền/ngày thực tế, bỏ kỳ hoặc tạm dừng. |
| Ngân sách | Một hạn mức cho từng danh mục trong từng tháng; thông báo ở Tổng quan khi dùng từ 80% hoặc chạm/vượt hạn mức. |
| Mục tiêu | Theo dõi số đã để dành, số tiền đích và thời hạn; số liệu mục tiêu tách khỏi số dư ví. |
| Báo cáo và Excel | Xuất `.xlsx` thật gồm hai sheet Theo ngày và Giao dịch, tổng bằng công thức, đủ mọi trang trong bộ lọc hiện tại. |
| Giao diện | Chế độ Sáng, Tối hoặc Theo hệ thống; nhớ lựa chọn trên trình duyệt. |
| Sao lưu và phục hồi | Xuất/nhập toàn bộ sổ bằng JSON, hiển thị lần xuất gần nhất, giữ một trạng thái hợp lệ trước thay đổi để phục hồi trên cùng thiết bị. |
| Kiểm tra khi lưu | Kiểm tra dữ liệu, bảo toàn sổ khi ghi thất bại và phát hiện phiên dữ liệu đã thay đổi ở tab khác. |

Một trình duyệt chưa có sổ sẽ bắt đầu bằng **sổ trống**, gồm ví Tiền mặt có số dư ban đầu bằng 0. Dữ liệu đã có từ phiên bản trước được giữ lại. Có thể chủ động nạp dữ liệu mẫu trong **Cài đặt & dữ liệu**; thao tác này cần xác nhận vì thay thế sổ hiện tại.

## Chạy và kiểm tra trên máy

Yêu cầu **Node.js 20 trở lên**. Trong thư mục dự án:

```bash
npm run dev
```

Mở [http://localhost:8080](http://localhost:8080). Máy chủ sử dụng biến môi trường `PORT` nếu có; cũng có thể chọn cổng bằng `npm run dev -- --port 8081`. Không cần chạy `npm install`. Hãy phục vụ qua HTTP thay vì mở trực tiếp `index.html`, vì ứng dụng sử dụng JavaScript ES modules.

```bash
npm run check
npm test
```

Kiểm thử sử dụng `node:test`, bao gồm tính đúng của số dư và báo cáo, chuyển giữa ví, chuyển đổi bản sao cũ sang schema v3, tham chiếu danh mục tự tạo, lịch tháng ngắn/năm nhuận, xác nhận định kỳ chống lặp kỳ cũ, khoảng ngày, dữ liệu nhập sai, lỗi bộ nhớ, phục hồi và xung đột giữa các tab. CI chạy kiểm tra cú pháp và bộ kiểm thử khi có push hoặc pull request.

## Bắt đầu sử dụng

1. Vào **Ví của tôi**, thêm các ví cần theo dõi và nhập số dư tại thời điểm bắt đầu ghi sổ.
2. Ghi khoản thu hoặc chi với ngày thực tế. Chọn **Chuyển giữa ví** khi chỉ di chuyển tiền giữa các ví đang theo dõi, chẳng hạn rút tiền ngân hàng về tiền mặt.
3. Chọn tháng để xem báo cáo và đặt ngân sách cho các danh mục cần kiểm soát.
4. Tạo mục tiêu nếu muốn theo dõi riêng tiền đã để dành. Cập nhật mục tiêu không tự chuyển tiền hay tạo giao dịch.
5. Tải JSON sau các đợt ghi chép quan trọng và trước khi đổi thiết bị, địa chỉ website hoặc xóa dữ liệu trình duyệt.

Trong **Danh mục**, thêm các nhóm thu/chi phù hợp với bạn. Trong **Khoản định kỳ**, tạo mẫu cho tiền nhà, hóa đơn hoặc lương. Lịch chỉ hiển thị khoản sắp đến hạn/quá hạn khi mở app; chỉ thao tác **Ghi vào sổ** và xác nhận lưu mới tạo giao dịch thực tế. **Bỏ kỳ này** chỉ tiến lịch, **Tạm dừng** giữ nguyên kỳ chờ. Các lịch không thực hiện thanh toán hoặc gửi thông báo nền.

### Cách tính

- **Số dư ví** = số dư ban đầu + thu nhập − chi tiêu + chuyển đến − chuyển đi, tính trên tất cả giao dịch đã ghi.
- **Tổng số dư** = tổng số dư ban đầu + toàn bộ thu nhập − toàn bộ chi tiêu. Chuyển giữa các ví không làm thay đổi tổng này.
- **Thu/chi trong tháng** lấy theo ngày giao dịch thuộc tháng được chọn; không tính số dư ban đầu, giao dịch chuyển giữa ví hoặc cập nhật mục tiêu.
- **Chênh lệch trong tháng** = thu nhập − chi tiêu. Khi có thu nhập, tỷ lệ giữ lại = chênh lệch / thu nhập.
- **Ngân sách** chỉ tổng hợp chi tiêu của đúng danh mục và tháng; không cộng chuyển giữa ví.
- **Lịch định kỳ chưa xác nhận** không tác động số dư, báo cáo hoặc ngân sách. Ngày 31 được kẹp về cuối tháng ngắn rồi trở lại ngày 31 ở tháng phù hợp; lịch 29/2 giữ ngày gốc qua các năm.

Số tiền là số nguyên VND. Số dư âm được phép để phản ánh dữ liệu đã nhập; ứng dụng không xác minh số dư ngân hàng thực tế. Giao dịch mang ngày tương lai vẫn là bản ghi và ảnh hưởng số dư toàn thời gian, vì vậy chỉ dùng ngày tương lai nếu bạn chủ động muốn ghi như vậy.

## Xuất Excel và chọn khoảng ngày

Nút **Xuất Excel** thay cho nút CSV của phiên bản trước. File có định dạng `.xlsx` thực, với ngày và số tiền là dữ liệu có kiểu:

| Sheet | Nội dung |
| --- | --- |
| **Theo ngày** | Các ngày có giao dịch, số giao dịch, tổng thu, tổng chi, chuyển ví và chênh lệch; sắp ngày tăng dần. |
| **Giao dịch** | Tất cả bản ghi phù hợp bộ lọc, sắp ngày tăng dần; danh mục, ví gửi/nhận, ghi chú và các cột thu/chi/chuyển riêng. |

Các công thức `SUM`, `SUMIFS` và `COUNTIFS` tính tổng và số giao dịch. Khoản chuyển giữa ví có cột riêng, không bị tính vào thu nhập, chi tiêu hoặc chênh lệch. File có phạm vi, bộ lọc và thời điểm xuất để đối chiếu; xuất **toàn bộ kết quả ở mọi trang**, không chỉ những dòng đang nhìn thấy.

Ở **Giao dịch**, chọn **Từ ngày đến ngày** để lọc khoảng bao gồm cả ngày đầu và ngày cuối. Excel áp dụng cùng khoảng và các bộ lọc còn lại. **Xuất Excel tháng** trong **Báo cáo** xuất toàn bộ giao dịch của tháng báo cáo, độc lập với bộ lọc ở Sổ giao dịch.

Dòng tổng dùng phạm vi đầy đủ đã xuất; lọc hoặc ẩn dòng trong Excel không làm tổng này đổi thành tổng các dòng đang hiển thị. Excel phục vụ phân tích, không thay thế bản sao JSON để khôi phục app.

## Dữ liệu và bản sao

**JSON** chứa toàn bộ sổ, gồm danh mục tự tạo và lịch định kỳ, là định dạng để khôi phục hoặc chuyển sổ. File Excel không chứa đủ cấu hình ví, ngân sách, mục tiêu và lịch để khôi phục sổ.

Nhập JSON kiểm tra cấu trúc, số tiền, ngày, danh mục, ví, lịch định kỳ và các tham chiếu trước khi áp dụng. Bản sao v1/v2 được chuẩn hóa thành **schema v3** trong bộ nhớ, giữ nguyên bản ghi và bổ sung danh sách danh mục tự tạo/lịch định kỳ trống; lần lưu thành công tiếp theo ghi v3. Nhập bản sao, tạo sổ mới và khôi phục trạng thái cũ đều cần xác nhận và vẫn kiểm tra xung đột dữ liệu.

**Lần xuất gần nhất** ghi nhận lúc app bắt đầu tải bản sao, không chứng minh rằng file đã được lưu thành công trên máy. Hãy kiểm tra thư mục tải xuống. Bản phục hồi tự động chỉ giữ **một trạng thái** trong cùng trình duyệt; bản này không bảo vệ khi mất thiết bị hoặc xóa toàn bộ dữ liệu website.

`localhost`, bản xem thử và website đã triển khai là các nguồn lưu trữ khác nhau. Trình duyệt, hồ sơ trình duyệt và thiết bị khác cũng không tự chia sẻ sổ. File JSON/Excel không được mã hóa; giữ chúng ở nơi riêng tư và không đưa vào Git.

Chế độ **Sáng/Tối/Theo hệ thống** lưu riêng với sổ, không nằm trong bản sao JSON. Nếu trình duyệt không cho lưu lựa chọn, giao diện vẫn đổi cho phiên hiện tại và app thông báo rằng lựa chọn chưa được ghi nhớ.

## Cấu trúc mã nguồn

| Đường dẫn | Vai trò |
| --- | --- |
| `dist/index.html` | Trang khởi chạy. |
| `dist/app.js` | Giao diện, điều hướng, biểu mẫu và tương tác. |
| `dist/finance.js` | Schema v3, chuyển đổi dữ liệu cũ, tính toán, danh mục, lịch định kỳ và kiểm tra bản sao. |
| `dist/storage.js` | Lưu sổ, kiểm tra phiên dữ liệu, bản phục hồi và thời điểm xuất JSON. |
| `dist/export.js`, `dist/export-template.js` | Tạo file XLSX và định dạng hai sheet báo cáo. |
| `dist/theme.js` | Lựa chọn giao diện sáng/tối/theo hệ thống. |
| `dist/styles.css`, `dist/icon.svg` | Giao diện thích ứng và biểu tượng. |
| `tests/` | Kiểm thử logic và các thành phần của ứng dụng. |
| `scripts/serve.mjs` | Máy chủ tĩnh dành cho phát triển. |
| `.github/workflows/ci.yml` | Kiểm tra cú pháp và kiểm thử trên CI. |
| `docs/OPERATIONS.md` | Thiết lập, sao lưu, xử lý sự cố và nâng cấp. |
| `docs/COMPARISON.md` | Đối chiếu nguồn chính thức và lý do ưu tiên các tính năng. |

## Triển khai và nâng cấp

Phục vụ trực tiếp nội dung **`dist/`** bằng một dịch vụ lưu trữ tĩnh, giữ các file cùng cấu trúc đường dẫn tương đối. Không cần máy chủ ứng dụng, cơ sở dữ liệu hay API secret. Máy chủ trong `scripts/serve.mjs` dành cho phát triển; khi triển khai thực tế, dùng dịch vụ lưu trữ tĩnh có HTTPS.

Workflow CI có sẵn chỉ kiểm tra mã; nó không tự cấu hình hay triển khai GitHub Pages. Để dùng Pages hoặc dịch vụ tương đương, cấu hình xuất bản `dist/` trên dịch vụ được chọn.

Khi nâng cấp, giữ nguyên **origin** và khóa lưu sổ để trình duyệt tiếp tục tìm thấy dữ liệu. Tên hiển thị đã đổi thành Money Management nhưng địa chỉ bản đang chạy được giữ nguyên vì lý do này. Nếu phải đổi origin, xuất JSON ở địa chỉ cũ rồi nhập ở địa chỉ mới. Xem quy trình cụ thể trong [OPERATIONS.md](docs/OPERATIONS.md).

## Phạm vi phát triển tiếp

Phiên bản này ưu tiên ghi sổ, danh mục riêng, lịch định kỳ có xác nhận, báo cáo Excel và khả năng khôi phục cho sử dụng cá nhân tại một trình duyệt. Theo dõi vay/nợ chuyên biệt, sổ dùng chung, kết nối ngân hàng và đồng bộ cloud chưa nằm trong phạm vi. Xem [đối chiếu và lý do ưu tiên](docs/COMPARISON.md).

Trước khi dùng cho nhiều thiết bị, nhiều người hoặc dữ liệu dùng chung, cần thiết kế máy chủ lưu trữ, xác thực và phân quyền dữ liệu, xử lý xung đột, bảo vệ dữ liệu và quy trình sao lưu phù hợp. Bản hiện tại không được mô tả là sẵn sàng cho những mô hình vận hành đó.
