# Vận hành Money Management 1.2.0

Tài liệu này dành cho việc sử dụng sổ cá nhân trên một trình duyệt và cho người triển khai website tĩnh. Dữ liệu nằm trên thiết bị; việc website vẫn hoạt động không đồng nghĩa đã có bản sao sổ ở máy chủ.

## 1. Thiết lập sổ ban đầu

Một trình duyệt chưa có dữ liệu bắt đầu bằng sổ trống và ví **Tiền mặt** có số dư bằng 0. Nếu đã sử dụng phiên bản cũ tại cùng địa chỉ website, sổ hiện có được giữ lại và chuẩn hóa khi đọc. App không tự thay sổ cũ bằng dữ liệu mẫu.

Chọn một ngày bắt đầu theo dõi. Trong **Ví của tôi**, thêm các ví cần quản lý và nhập số dư ngay trước các giao dịch bạn sẽ ghi. Ví dụ: ví có 2.000.000 đồng trước khi bắt đầu ngày 01/12 thì nhập số dư ban đầu là 2.000.000 và ghi các khoản phát sinh từ ngày đó. Không nhập đồng thời số dư đã bao gồm một khoản tiền và thêm lại khoản thu tương ứng, vì sẽ tính trùng.

Số dư ban đầu là điểm xuất phát của toàn bộ sổ, không phải số dư riêng từng tháng. Thay đổi số này sẽ điều chỉnh số dư hiện tại; nó không tạo khoản thu/chi trong báo cáo tháng. Chỉ sửa khi cần hiệu chỉnh điểm xuất phát, không dùng thao tác này để thay cho giao dịch phát sinh hằng ngày.

**Nạp dữ liệu mẫu** và **Xóa dữ liệu, tạo sổ mới** đều thay thế sổ hiện tại sau xác nhận. Tải JSON trước khi dùng nếu muốn giữ sổ đang có. Dữ liệu mẫu chỉ phục vụ thử giao diện và được gắn nhãn.

## 2. Ghi chép và đối chiếu số dư

### Thu nhập, chi tiêu và ngày giao dịch

Chọn đúng loại, ví, danh mục và ngày thực tế. Báo cáo tháng dùng **ngày giao dịch**, không dùng ngày bạn nhập dữ liệu. Có thể ghi bổ sung hoặc sửa một giao dịch cũ; số dư toàn thời gian và báo cáo của tháng liên quan sẽ được tính lại.

Ứng dụng nhận số nguyên VND và cho phép số dư âm. Số dư hiển thị là kết quả của các bản ghi, không phải số được truy vấn từ ngân hàng. Đối chiếu định kỳ với tiền mặt và các tài khoản thực tế để phát hiện ghi thiếu, ghi trùng hoặc sai ví.

Số dư ví bao gồm tất cả giao dịch đã ghi, kể cả bản ghi có ngày tương lai. Lịch định kỳ chỉ là kế hoạch cho đến khi bạn xác nhận ghi vào sổ; app không tự thực hiện hay tự ghi khoản thu/chi. Hãy dùng ngày của giao dịch thực tế nếu bạn muốn số dư phản ánh tiền hiện có.

### Chuyển giữa ví

Khi rút tiền ngân hàng về tiền mặt hoặc nạp ví điện tử từ một tài khoản đang theo dõi, dùng **Chuyển giữa ví**. Cần ít nhất hai ví khác nhau. Nhập ví gửi, ví nhận, số tiền dương và ngày chuyển.

Giao dịch này giảm số dư ví gửi và tăng số dư ví nhận cùng một số tiền. Tổng tài sản theo dõi không đổi; báo cáo thu nhập, chi tiêu, ngân sách và tỷ lệ giữ lại không cộng khoản chuyển. Bộ lọc theo ví tìm thấy giao dịch ở cả phía gửi và nhận.

Chức năng này chỉ ghi chép; nó không chuyển tiền, yêu cầu OTP hay kết nối ngân hàng. Nếu có phí chuyển tiền, ghi phí thành **một khoản chi riêng** ở ví bị thu phí. Nếu chuyển tiền cho người khác ngoài các ví của bạn, hãy ghi theo bản chất thu/chi phù hợp, không tạo một ví nhận giả để làm mất khoản chi khỏi báo cáo.

### Ngân sách và mục tiêu

Mỗi danh mục chi tiêu có thể có một ngân sách trong một tháng. Các khoản chi ở danh mục chưa đặt ngân sách vẫn có trong tổng chi tiêu; chúng không được cộng vào phần hạn mức của danh mục khác.

Màn hình **Tổng quan** thông báo khi một danh mục đã dùng từ **80%** hạn mức hoặc đã chạm/vượt hạn mức của tháng đang xem. Đây là thông tin trong app, không phải thông báo gửi khi app đóng. Chuyển giữa ví và lịch định kỳ chưa ghi không làm tăng mức sử dụng ngân sách.

Mục tiêu ghi nhận số tiền bạn tự xác định đã để dành. Tăng hoặc sửa số tích lũy không trừ tiền ví và không tạo giao dịch. Nếu thực tế chuyển tiền sang một tài khoản tiết kiệm cũng được theo dõi trong app, ghi chuyển giữa các ví rồi cập nhật mục tiêu nếu cần. Số dư ví và tiến độ mục tiêu là hai góc nhìn của tiền, không phải hai khoản tài sản để cộng lại.

### Danh mục tự tạo

Trong **Danh mục**, chọn loại Thu nhập hoặc Chi tiêu rồi nhập tên, biểu tượng và màu. Tên phải khác những danh mục cùng loại; app xem khác biệt về hoa/thường, dấu tiếng Việt và khoảng trắng thừa là cùng tên để tránh tạo trùng.

Bạn có thể đổi tên, biểu tượng và màu của danh mục tự tạo. Loại thu/chi đã chọn được giữ nguyên khi sửa. Đổi tên sẽ đổi nhãn hiển thị của các giao dịch mang cùng danh mục, không thay số tiền. Các danh mục có sẵn được giữ ổn định.

Danh mục còn được giao dịch, ngân sách hoặc khoản định kỳ tham chiếu không thể xóa. Chuyển các bản ghi sang danh mục khác trước; tạm dừng một lịch định kỳ không xóa tham chiếu của lịch đó.

### Khoản định kỳ

Trong **Khoản định kỳ**, chọn Thu nhập hoặc Chi tiêu, số tiền dự kiến, ví, danh mục, chu kỳ tuần/tháng/năm và ngày của kỳ tiếp theo. Danh sách hiển thị khoản sắp đến hạn, đến hạn, quá hạn hoặc tạm dừng khi bạn mở app. Không có thông báo nền, tự thanh toán hoặc tự ghi giao dịch.

- **Ghi vào sổ:** kiểm tra ngày, số tiền, ví, danh mục và ghi chú thực tế rồi lưu. Một giao dịch được tạo và lịch tiến đúng một kỳ. Các chỉnh sửa ở bước xác nhận chỉ áp dụng cho giao dịch đó, không thay mẫu của kỳ sau.
- **Bỏ kỳ này:** tiến một kỳ, không tạo giao dịch và không đổi số dư.
- **Tạm dừng/Tiếp tục:** giữ nguyên ngày kỳ đang chờ; tiếp tục có thể hiển thị kỳ quá hạn. Các kỳ cũ không tự được ghi bù.
- **Sửa lịch:** thay các giá trị dự kiến cho lần xác nhận sau. Nếu chỉ sửa số tiền hoặc ghi chú, app giữ ngày gốc của lịch tháng/năm.

Ví dụ: lịch hằng tháng ngày 31 đi từ 31/01 sang 28/02 hoặc 29/02, rồi trở lại 31/03. Lịch hằng năm ngày 29/02 dùng 28/02 vào năm không nhuận và trở lại 29/02 ở năm nhuận. Ngày thực tế được ghi vào sổ có thể khác ngày đến hạn mà không làm dời toàn bộ lịch.

Mỗi lần xác nhận/bỏ qua chỉ xử lý một kỳ. Nếu bỏ lỡ nhiều tháng, kiểm tra từng kỳ và ghi hoặc bỏ qua đúng thực tế. Xóa lịch không xóa các giao dịch đã ghi. Xóa một giao dịch được tạo từ lịch cũng không tự quay lùi lịch; cần sửa ngày kỳ tiếp theo hoặc dùng bản phục hồi phù hợp nếu vừa thao tác nhầm.

## 3. Sao lưu JSON và xuất Excel

Trong **Cài đặt & dữ liệu**, chọn **Tải bản sao JSON**, hoặc dùng **Sao lưu dữ liệu** ở thanh điều hướng. JSON chứa hồ sơ hiển thị, ví, giao dịch, ngân sách, mục tiêu, danh mục tự tạo và lịch định kỳ của sổ hiện tại.

Sau khi xuất, kiểm tra file xuất hiện trong thư mục tải xuống và có thể đọc được. **Lần xuất gần nhất** chỉ là thời điểm app khởi tạo tải xuống; trình duyệt không báo lại cho app rằng bạn đã lưu hoặc di chuyển file thành công. Thời điểm này không nằm trong bản sao sổ và không tự chuyển sang thiết bị mới.

Một thói quen phù hợp cho sổ cá nhân là xuất JSON sau mỗi đợt nhập quan trọng, trước thao tác thay thế sổ và trước khi nâng cấp hoặc chuyển thiết bị. Giữ một vài file theo ngày ở nơi riêng tư ngoài dữ liệu website. Bản sao JSON và file Excel chưa được mã hóa; không commit, tải lên issue hay gửi kèm báo lỗi công khai.

### Phạm vi xuất Excel

Ở **Giao dịch**, chọn Theo tháng, Từ ngày đến ngày hoặc Tất cả thời gian, rồi thêm các bộ lọc loại/danh mục/ví/tìm kiếm nếu cần. Khoảng ngày bao gồm cả hai đầu; ngày bắt đầu không được sau ngày kết thúc. Chọn **Xuất Excel** để xuất mọi giao dịch khớp bộ lọc, kể cả các trang chưa mở. Ở **Báo cáo**, **Xuất Excel tháng** dùng riêng tháng đang xem và bao gồm tất cả loại giao dịch, ví, danh mục trong tháng đó.

File là `.xlsx` thực, thay cho nút CSV của phiên bản trước:

| Sheet | Nội dung và công thức |
| --- | --- |
| **Theo ngày** | Một dòng cho mỗi ngày có giao dịch được xuất, theo ngày tăng dần; số giao dịch bằng `COUNTIFS`, tổng thu/chi/chuyển bằng `SUMIFS`, chênh lệch bằng thu trừ chi. |
| **Giao dịch** | Mọi bản ghi theo ngày tăng dần; loại, danh mục, ví, ví nhận chuyển, ghi chú và ba cột tiền riêng. Dòng cuối dùng `SUM` để tính tổng từng cột. |

Ngày và số tiền là giá trị có kiểu để Excel có thể tính toán. Các cột Thu nhập, Chi tiêu và Chuyển ví ghi số dương riêng theo loại. Không cộng cột chuyển ví vào thu/chi hoặc chênh lệch. Các công thức và giá trị ban đầu được ghi kèm; phần mềm bảng tính có thể tính lại khi mở file.

Dòng tổng là tổng của **toàn bộ phạm vi đã xuất**, không tự thay đổi khi lọc/ẩn dòng trong Excel. Công thức dùng các dòng đã xuất; nếu tự chèn thêm bản ghi ngoài phạm vi, cần cập nhật công thức tương ứng. File có thông tin phạm vi, bộ lọc, thời điểm và múi giờ xuất để đối chiếu với app.

Excel không chứa đầy đủ cấu hình ví, số dư ban đầu, ngân sách, mục tiêu và lịch để khôi phục app. Luôn dùng JSON cho mục đích khôi phục hoặc chuyển thiết bị.

## 4. Nhập bản sao và phục hồi trạng thái trước

### Nhập JSON

1. Tải một bản JSON của sổ hiện tại nếu còn cần giữ.
2. Chọn **Nhập bản sao JSON** và chọn file của Money Management hoặc bản sao hợp lệ từ phiên bản trước.
3. Kiểm tra số giao dịch, ví, mục tiêu, danh mục tự tạo và khoản định kỳ trong hộp xác nhận.
4. Xác nhận thay thế, rồi đối chiếu số dư và một vài giao dịch với sổ mong đợi.

Nhập JSON **thay thế toàn bộ sổ**, không gộp giao dịch. Dữ liệu được kiểm tra trước khi ghi: phiên bản, danh mục, số tiền nguyên, ngày hợp lệ, ID trùng, ví còn tồn tại, hai phía của khoản chuyển và cấu trúc lịch định kỳ. Bản sao v1/v2 được chuẩn hóa thành **schema v3**, giữ nguyên giao dịch cũ và bổ sung danh sách danh mục tự tạo/lịch trống nếu chưa có.

Nếu có thông báo dữ liệu đã thay đổi ở tab khác, thao tác chưa được áp dụng. Xem lại sổ mới nhất và thực hiện lại quyết định nhập; không mở nhiều tab rồi xác nhận thay thế đồng thời.

### Bản phục hồi trên thiết bị

Trước khi lưu một thay đổi, app chụp lại trạng thái hợp lệ hiện có, nếu có, trong một vị trí phục hồi riêng. Chọn **Tải bản phục hồi** để giữ file hoặc **Khôi phục trạng thái này** để thay thế sổ hiện tại sau xác nhận. Dữ liệu bị lỗi không được dùng làm bản phục hồi hợp lệ.

Đây là **một vị trí lưu**, không phải lịch sử nhiều phiên bản. Lần thay đổi tiếp theo có thể ghi đè trạng thái cũ. Thao tác lưu không thay đổi dữ liệu không tạo thêm trạng thái phục hồi. Khi khôi phục từ một sổ hiện tại còn hợp lệ, sổ đó được giữ làm trạng thái trước đó; các lần ghi tiếp theo vẫn có thể ghi đè vị trí này.

Bản phục hồi nằm cùng trình duyệt và origin với sổ. Xóa dữ liệu website, mất thiết bị hoặc dùng hồ sơ trình duyệt khác có thể làm mất cả hai. Sau khi xóa/sửa nhầm, nên dừng các lần ghi tiếp theo và kiểm tra mục phục hồi trước.

## 5. Xử lý sự cố lưu trữ

**Không xóa dữ liệu trình duyệt như bước xử lý đầu tiên.** Trước hết tải bản JSON đang hiển thị, bản phục hồi hoặc dữ liệu gốc bị lỗi nếu app cung cấp lựa chọn tương ứng.

| Hiện tượng | Hành động |
| --- | --- |
| Bộ nhớ website đầy | Thay đổi chưa được lưu. Xuất JSON của sổ hiện có và kiểm tra file. App cần chỗ cho cả sổ và một bản phục hồi; có thể chuyển sổ sang hồ sơ trình duyệt/thiết bị có bộ nhớ khả dụng bằng JSON. Chỉ dọn dữ liệu sau khi có bản sao ngoài trình duyệt đã kiểm tra. |
| Trình duyệt không cho đọc hoặc ghi bộ nhớ | Kiểm tra quyền lưu dữ liệu của website và chế độ duyệt riêng tư. App không báo lưu thành công khi ghi thất bại. Giữ tab còn dữ liệu mở, xuất JSON nếu có thể, rồi thử với hồ sơ trình duyệt cho phép lưu. |
| Dữ liệu thay đổi ở tab khác | Dừng thao tác đang chờ, xem bản mới nhất rồi mở lại biểu mẫu hoặc hộp xác nhận. Dùng một tab để chỉnh sửa. Không mặc định rằng nội dung biểu mẫu cũ đã được lưu. |
| Bản lưu bị lỗi | App giữ nguyên dữ liệu gốc thay vì tự xóa. Chọn **Tải dữ liệu gốc bị lỗi** để bảo toàn thông tin; đây chưa phải bản sao hợp lệ. Có thể tải riêng **Sổ đang hiển thị (JSON)** và bản phục hồi nếu có, rồi khôi phục từ bản hợp lệ. Sổ đang hiển thị không chứa phần dữ liệu gốc không đọc được. |
| Bản lưu bị xóa ở nơi khác nhưng tab vẫn hiển thị sổ | Giữ tab mở và tải JSON ngay. Bản đang hiển thị có thể chỉ còn trong bộ nhớ phiên; cần xác nhận khôi phục hoặc nhập JSON để lưu trở lại. |
| Không có bản phục hồi hợp lệ | Dùng JSON đã tải xuống. App không có bản sao máy chủ để lấy lại dữ liệu đã mất ở cả trình duyệt lẫn file sao lưu. |

Lưu trữ kiểm tra phiên dữ liệu trước khi ghi và kiểm tra lại sau khi tạo bản phục hồi. Nếu phát hiện xung đột hoặc không tạo được bản phục hồi cần thiết, app dừng thao tác. Tuy nhiên, `localStorage` không cung cấp giao dịch nguyên tử giữa nhiều tab; cơ chế này giảm nguy cơ ghi đè, không biến app thành hệ thống chỉnh sửa đồng thời.

## 6. Triển khai và nâng cấp

Phần website hoàn chỉnh nằm trong `dist/`. Phục vụ nguyên thư mục qua dịch vụ lưu trữ tĩnh có HTTPS; các module, CSS và icon phải nằm đúng vị trí tương đối. Không có dependency cần cài, bước build, cơ sở dữ liệu hoặc API secret của app. Máy chủ Node đi kèm chỉ phục vụ phát triển tại máy.

Trước khi phát hành:

```bash
npm run check
npm test
```

Sau đó kiểm tra trên trình duyệt việc mở trang, thêm/sửa/xóa một giao dịch thử, ghi một khoản chuyển ví, tải JSON và nhập lại trên một hồ sơ thử riêng. Không dùng sổ thật để thực hiện các thao tác thử có thể thay thế dữ liệu. CI hỗ trợ kiểm tra mã; nó không thay cho việc đối chiếu một luồng sử dụng trong trình duyệt.

### Bảo toàn dữ liệu khi nâng cấp

1. Xuất JSON trước khi thay phiên bản.
2. Giữ nguyên **origin** — giao thức, tên miền và cổng — nếu muốn trình duyệt tiếp tục dùng sổ hiện có.
3. Giữ khóa chính `vi-minh:v1`. Đây là khóa tương thích dữ liệu cũ, không phải tên hiển thị hay phiên bản schema hiện tại.
4. Triển khai đồng bộ các file trong `dist/`, rồi tải lại trang. Không xóa bộ nhớ để buộc cập nhật giao diện.
5. Đối chiếu số dư, giao dịch và ngân sách; tải bản JSON mới sau khi xác nhận dữ liệu đúng.

Schema sổ v1/v2 được đọc và chuẩn hóa thành v3 trong bộ nhớ, chưa ghi đè dữ liệu chỉ vì mở app. Lần lưu chủ động thành công tiếp theo ghi v3. Các bản ghi có sẵn được giữ nguyên; danh mục tự tạo và lịch định kỳ là các phần bổ sung. Tên sản phẩm đổi thành Money Management không làm đổi địa chỉ bản đang chạy hoặc khóa dữ liệu.

Nếu chuyển tên miền, giao thức, cổng, trình duyệt hoặc thiết bị, hãy xuất từ nơi cũ và nhập ở nơi mới. Hai nơi giữ hai sổ độc lập sau khi chuyển; việc nhập một lần không bật đồng bộ. Không chạy mã phiên bản cũ để ghi vào sổ v3. Khi cần quay lại phiên bản cũ, dùng bản sao đã xuất trước nâng cấp và kiểm tra tính tương thích: v1 không hiểu chuyển ví, còn v1/v2 không hiểu danh mục tự tạo và lịch của v3.

## 7. Giao diện, quyền truy cập và giới hạn vận hành

Trong **Cài đặt & dữ liệu → Giao diện**, chọn Sáng, Tối hoặc Theo hệ thống. Nút góc trên chuyển nhanh giữa sáng và tối. Lựa chọn được lưu riêng trên trình duyệt, không nằm trong JSON tài chính; khi chuyển thiết bị có thể cần chọn lại. Nếu bộ nhớ bị chặn, app vẫn áp dụng lựa chọn trong phiên hiện tại và báo rằng chưa lưu được.

Bản triển khai Sites có thể dùng cổng đăng nhập ChatGPT để giới hạn người mở trang. Đây là kiểm soát truy cập trang, tách biệt với dữ liệu trong `localStorage`. App chưa mã hóa sổ hoặc file sao lưu và chưa tách dữ liệu theo tài khoản đăng nhập trong cùng hồ sơ trình duyệt. Người dùng chung hồ sơ đó có thể đọc sổ tại cùng origin.

Không đưa file tài chính, log chứa nội dung giao dịch, thông tin xác thực hoặc API secret vào repository. Repository chỉ cần mã nguồn, kiểm thử, tài liệu và cấu hình triển khai; dữ liệu dùng thật nằm trong trình duyệt và các file người dùng tự xuất.

Phiên bản này phục vụ sổ cá nhân tại một trình duyệt, có danh mục riêng, lịch thu/chi cần xác nhận và xuất Excel. Theo dõi vay/nợ chuyên biệt, sổ dùng chung, kết nối ngân hàng và đồng bộ nhiều thiết bị chưa được triển khai. Những khả năng đó cần mô hình dữ liệu và quy trình vận hành riêng; đồng bộ còn cần máy chủ lưu trữ, danh tính, phân quyền, kiểm soát xung đột và sao lưu được kiểm chứng. Xem [đối chiếu tính năng](COMPARISON.md) để biết lý do ưu tiên của bản 1.2.
