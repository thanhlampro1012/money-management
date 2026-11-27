# Vận hành Money Management 1.3.0

Tài liệu này dành cho việc sử dụng sổ cá nhân trên máy tính/điện thoại và cho người triển khai website tĩnh. Sổ và lịch sử nằm trên thiết bị; website công khai không nhận dữ liệu tài chính và chưa có tài khoản đăng nhập hay đồng bộ cloud. Chọn cách giữ thêm file JSON riêng để có thể phục hồi ngoài dữ liệu website.

Website GitHub Pages: **https://thanhlampro1012.github.io/money-management/**. Nếu đã có sổ tại địa chỉ Sites cũ, thực hiện [chuyển sổ bằng JSON](#chuyển-sổ-từ-địa-chỉ-sites-cũ-sang-github-pages) trước khi bắt đầu ghi tiếp tại địa chỉ mới.

## 1. Thiết lập sổ ban đầu

Một trình duyệt chưa có dữ liệu bắt đầu bằng sổ trống và ví **Tiền mặt** có số dư bằng 0. Nếu đã sử dụng phiên bản cũ tại cùng địa chỉ website, sổ hiện có được giữ lại và chuẩn hóa khi đọc. App không tự thay sổ cũ bằng dữ liệu mẫu.

Chọn một ngày bắt đầu theo dõi. Trong **Ví của tôi**, thêm các ví cần quản lý và nhập số dư ngay trước các giao dịch bạn sẽ ghi. Ví dụ: ví có 2.000.000 đồng trước khi bắt đầu ngày 01/12 thì nhập số dư ban đầu là 2.000.000 và ghi các khoản phát sinh từ ngày đó. Không nhập đồng thời số dư đã bao gồm một khoản tiền và thêm lại khoản thu tương ứng, vì sẽ tính trùng.

Số dư ban đầu là điểm xuất phát của toàn bộ sổ, không phải số dư riêng từng tháng. Thay đổi số này sẽ điều chỉnh số dư hiện tại; nó không tạo khoản thu/chi trong báo cáo tháng. Chỉ sửa khi cần hiệu chỉnh điểm xuất phát, không dùng thao tác này để thay cho giao dịch phát sinh hằng ngày.

**Nạp dữ liệu mẫu** và **Xóa dữ liệu, tạo sổ mới** đều thay thế sổ hiện tại sau xác nhận. Tải JSON trước khi dùng nếu muốn giữ sổ đang có. Dữ liệu mẫu chỉ phục vụ thử giao diện và được gắn nhãn.

### Thêm app vào màn hình chính

1. Nếu đã có sổ, **tải JSON từ đúng tab/app đang giữ dữ liệu trước**; kiểm tra file trong Tải xuống hoặc Tệp.
2. Trên **iPhone/iPad**, mở website bằng Safari rồi chọn **Chia sẻ → Thêm vào Màn hình chính**. Trên **Android**, mở bằng Chrome rồi chọn **Cài đặt ứng dụng/Thêm vào màn hình chính** trong menu ⋮, hoặc dùng nút cài đặt trong app khi có.
3. Mở biểu tượng chiếc ví màu xanh. Nếu sổ chưa hiện, nhập JSON đã xuất và đối chiếu số dư, giao dịch. Chỉ ngừng dùng bản cũ sau khi đối chiếu xong.
4. Vào **Cài đặt & dữ liệu → Sao lưu tự động** và chọn cách sao lưu cho nơi vừa cài. Liên kết file/quyền ghi không được mang theo trong JSON.

Trên iPhone, app màn hình chính có thể dùng vùng dữ liệu riêng với Safari hoặc một lần cài khác; thêm biểu tượng không tự chuyển sổ. [WebKit giải thích rằng dữ liệu cục bộ không được sao chép cùng cookies](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/). **Không xóa biểu tượng/app cũ chỉ để cập nhật icon trước khi xuất và kiểm tra JSON.** Nếu phải xóa rồi thêm lại, giữ bản sao ngoài dữ liệu website và nhập lại khi cần.

### Dùng khi không có mạng

Mở app khi có mạng và đợi mục **Ứng dụng trên điện thoại** báo đã tải ứng dụng để dùng ngoại tuyến. Sau đó có thể mở app, xem số dư, ghi thu chi và xuất báo cáo khi không có mạng, nếu trình duyệt vẫn giữ bộ nhớ website. Lần truy cập đầu tiên và việc tải bản cập nhật cần mạng.

Chế độ ngoại tuyến chỉ lưu các file mã/giao diện của app. Nó không tạo một bản tài chính trên máy chủ và không thay thế JSON hoặc lịch sử phục hồi. Việc đưa JSON vào iCloud/Drive qua ứng dụng Tệp do hệ điều hành/dịch vụ đó xử lý; Money Management không theo dõi việc đồng bộ của họ.

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

JSON chứa toàn bộ hồ sơ hiển thị, ví, giao dịch, ngân sách, mục tiêu, danh mục tự tạo và lịch định kỳ. Sau mỗi thay đổi được lưu thành công, app tự giữ lịch sử trên thiết bị. **Sao lưu ra file mặc định tắt**; trình duyệt cần bạn chọn file/cấp quyền hoặc bật tải tự động trước khi app có thể làm phần này.

### Cập nhật một file JSON sau mỗi thay đổi

1. Trong **Cài đặt & dữ liệu → Sao lưu tự động → File JSON tự cập nhật**, bấm **Chọn file sao lưu** nếu trình duyệt cung cấp nút này.
2. Chọn nơi lưu và tên file, rồi cấp quyền theo hộp thoại trình duyệt. File được chọn sẽ chứa toàn bộ sổ hiện tại và được ghi lại khi sổ thay đổi; giữ bản cũ riêng nếu muốn lưu nhiều mốc lâu dài.
3. Sau khi thêm, sửa, xóa giao dịch, cộng tiền mục tiêu hoặc lưu thay đổi khác, giữ app mở đến khi trạng thái hiện **Đã sao lưu file**. Mục **Ghi file thành công gần nhất** chỉ cập nhật sau khi luồng ghi file đóng thành công.
4. Nếu app báo cần quyền, bấm **Cho phép ghi file**. Nếu muốn kiểm tra lại ngay, dùng **Cập nhật file ngay**. Có thể **Đổi file** hoặc **Ngừng liên kết**; ngừng liên kết không xóa file đã lưu.

App ghi nhớ liên kết trong IndexedDB khi trình duyệt cho phép, nhưng quyền ghi có thể hết sau khi đóng app hoặc bị thu hồi. Nếu liên kết chỉ dùng được trong phiên hiện tại, app hiển thị rõ và bạn cần chọn lại lần sau. App chỉ kiểm tra quyền khi mở; không tự bật hộp xin quyền. Nếu ghi file thất bại, sổ chính đã lưu vẫn còn và app hiển thị lỗi sao lưu. Đừng đóng app khi vẫn báo đang ghi; mở lại app có thể cập nhật file từ sổ chính còn hợp lệ, nhưng không cứu được dữ liệu đã bị xóa ở mọi nơi.

App kiểm tra `showSaveFilePicker` trên trình duyệt đang chạy. [Chrome công bố File System Access trên Android từ phiên bản 132](https://developer.chrome.com/release-notes/132#file-system-access-for-android-and-webview); không phải mọi trình duyệt trên điện thoại đều cung cấp chức năng này. Nếu không có nút chọn file, dùng tải tự động hoặc chia sẻ thủ công bên dưới.

### Tải một JSON mới sau mỗi lần lưu

Bật **Tải một bản JSON sau mỗi lần lưu** để yêu cầu tải file mới sau mỗi thay đổi đã lưu. Tên có dấu thời gian và mã riêng để giữ nhiều mốc. Chế độ này tạm ngừng cập nhật file đã liên kết; liên kết vẫn được ghi nhớ nếu có. Tắt lựa chọn sẽ dừng tải tự động; muốn quay lại cập nhật một file, chọn **Cho phép ghi file** hoặc chọn lại file.

Cho phép tải nhiều file nếu trình duyệt hỏi và kiểm tra mục Tải xuống/Tệp. Trình duyệt có thể chặn tải hoặc mở bảng chọn nơi lưu; **Lần yêu cầu tải gần nhất chỉ chứng minh app đã yêu cầu tải**, không chứng minh hệ điều hành đã lưu file. Nếu tải bị chặn, dùng nút tải/chia sẻ thủ công. Không có cách ghi file âm thầm trên một trình duyệt không cấp quyền tương ứng.

### Tải hoặc chia sẻ thủ công

Chọn **Tải bản sao JSON** trong Cài đặt hoặc **Sao lưu dữ liệu** ở thanh điều hướng. **Lưu / chia sẻ bản sao** mở bảng chia sẻ khi thiết bị hỗ trợ file: có thể chọn **Lưu vào Tệp**, iCloud Drive hoặc ứng dụng riêng của bạn. Nếu không hỗ trợ, app chuyển sang tải JSON; nếu bạn hủy bảng chia sẻ, file chưa được xác nhận đã lưu.

**Lần xuất gần nhất** ghi lúc app khởi tạo lượt tải; thời điểm này không nằm trong sổ JSON và không tự chuyển thiết bị. Luôn kiểm tra file ở nơi nhận. Giữ thêm vài bản theo ngày ngoài dữ liệu website, đặc biệt trước nhập/khôi phục sổ, đổi máy, xóa dữ liệu hoặc xóa/thêm lại app màn hình chính. JSON và Excel chưa được mã hóa; không commit, tải lên issue hoặc gửi kèm báo lỗi công khai.

### Lịch sử tự động trên thiết bị

App giữ tối đa **30 mốc lưu gần nhất** trong IndexedDB, kể cả khi chưa bật sao lưu ra file. Bản trùng liên tiếp không chiếm thêm vị trí. Mỗi bản được kiểm tra trước khi cho khôi phục; xem hướng dẫn ở mục 4. **Ưu tiên giữ dữ liệu** chỉ gửi yêu cầu lưu trữ bền vững tới trình duyệt; bị từ chối sẽ được thông báo, và được cấp vẫn không ngăn bạn xóa dữ liệu website.

Lịch sử thuộc cùng thiết bị, hồ sơ trình duyệt và origin, không phải bản sao cloud. Xóa dữ liệu website hoặc mất máy có thể làm mất cả sổ và lịch sử. Nếu IndexedDB bị chặn/đầy, app báo phần lịch sử chưa hoàn tất; file sao lưu độc lập vẫn có thể hoạt động nếu đã được cấp quyền.

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

## 4. Nhập bản sao và phục hồi

### Nhập JSON

1. Tải một bản JSON của sổ hiện tại nếu còn cần giữ.
2. Chọn **Nhập bản sao JSON** và chọn file của Money Management hoặc bản sao hợp lệ từ phiên bản trước.
3. Kiểm tra số giao dịch, ví, mục tiêu, danh mục tự tạo và khoản định kỳ trong hộp xác nhận.
4. Xác nhận thay thế, rồi đối chiếu số dư và một vài giao dịch với sổ mong đợi.

Nhập JSON **thay thế toàn bộ sổ**, không gộp giao dịch. Dữ liệu được kiểm tra trước khi ghi: phiên bản, danh mục, số tiền nguyên, ngày hợp lệ, ID trùng, ví còn tồn tại, hai phía của khoản chuyển và cấu trúc lịch định kỳ. Bản sao v1/v2 được chuẩn hóa thành **schema v3**, giữ nguyên giao dịch cũ và bổ sung danh sách danh mục tự tạo/lịch trống nếu chưa có.

Nếu có thông báo dữ liệu đã thay đổi ở tab khác, thao tác chưa được áp dụng. Xem lại sổ mới nhất và thực hiện lại quyết định nhập; không mở nhiều tab rồi xác nhận thay thế đồng thời.

### Chọn một bản trong lịch sử tự động

Vào **Cài đặt & dữ liệu → Sao lưu tự động → Xem lịch sử phục hồi**. Mỗi dòng có thời điểm, lý do thay đổi và số giao dịch/ví/mục tiêu. Có thể **Tải JSON** để giữ riêng hoặc **Khôi phục** rồi xác nhận thay sổ hiện tại. Tải sổ hiện tại trước nếu vẫn cần; app không gộp các bản.

Sau khi khôi phục thành công, lịch sử tiếp tục ghi nhận sổ mới và chế độ file đang bật tiếp tục sao lưu sổ đó. Các bản cũ chỉ nằm trong giới hạn 30 bản, nên xuất JSON nếu cần giữ lâu. Nếu bản chính bị mất nhưng lịch sử vẫn còn, app chặn ghi tiếp cho đến khi bạn kiểm tra phục hồi hoặc chủ động xác nhận **Dùng sổ trống**. Việc mở sổ trống/lỗi không tự tạo lịch sử trống hoặc ghi đè file sao lưu.

### Một trạng thái trước lần lưu gần nhất

Trước khi lưu một thay đổi, app chụp lại trạng thái hợp lệ hiện có, nếu có, trong một vị trí phục hồi riêng. Chọn **Tải bản phục hồi** để giữ file hoặc **Khôi phục trạng thái này** để thay thế sổ hiện tại sau xác nhận. Dữ liệu bị lỗi không được dùng làm bản phục hồi hợp lệ.

Mục **Bản phục hồi trên thiết bị** là **một vị trí lưu riêng**, được giữ từ cơ chế cũ và bổ sung cho lịch sử 30 bản. Lần thay đổi tiếp theo có thể ghi đè vị trí này. Thao tác lưu không thay đổi dữ liệu không tạo thêm trạng thái phục hồi. Khi khôi phục từ một sổ hiện tại còn hợp lệ, sổ đó được giữ làm trạng thái trước đó; các lần ghi tiếp theo vẫn có thể ghi đè vị trí này.

Bản phục hồi nằm cùng trình duyệt và origin với sổ. Xóa dữ liệu website, mất thiết bị hoặc dùng hồ sơ trình duyệt khác có thể làm mất cả hai. Sau khi xóa/sửa nhầm, nên dừng các lần ghi tiếp theo và kiểm tra mục phục hồi trước.

## 5. Xử lý sự cố lưu trữ

**Không xóa dữ liệu trình duyệt như bước xử lý đầu tiên.** Trước hết tải bản JSON đang hiển thị, bản phục hồi hoặc dữ liệu gốc bị lỗi nếu app cung cấp lựa chọn tương ứng.

| Hiện tượng | Hành động |
| --- | --- |
| Lưu sổ chính báo bộ nhớ đầy | Thay đổi chưa được lưu. Xuất JSON của sổ hiện có và kiểm tra file. App cần chỗ cho cả sổ và một bản phục hồi; có thể chuyển sổ sang hồ sơ trình duyệt/thiết bị có bộ nhớ khả dụng bằng JSON. Chỉ dọn dữ liệu sau khi có bản sao ngoài trình duyệt đã kiểm tra. |
| Sổ đã lưu nhưng lịch sử chưa hoàn tất | Đây là lỗi bản sao IndexedDB, khác với lỗi ghi sổ chính. Tải JSON hoặc kiểm tra file tự cập nhật; không nhập lại giao dịch vừa lưu chỉ vì sao lưu lỗi. |
| File cần quyền hoặc chưa cập nhật | Giữ app mở, vào Sao lưu tự động, bấm **Cho phép ghi file** hoặc chọn lại nơi lưu. Đối chiếu thời điểm ghi file thành công; nếu không cấp quyền được, tải/chia sẻ JSON thủ công. |
| Tải JSON tự động không thấy file | Kiểm tra quyền tải nhiều file và mục Tải xuống/Tệp. Thời điểm yêu cầu tải không bảo đảm file đã lưu; dùng **Lưu / chia sẻ bản sao** hoặc tải thủ công. |
| Trình duyệt không cho đọc hoặc ghi bộ nhớ | Kiểm tra quyền lưu dữ liệu của website và chế độ duyệt riêng tư. App không báo lưu thành công khi ghi thất bại. Giữ tab còn dữ liệu mở, xuất JSON nếu có thể, rồi thử với hồ sơ trình duyệt cho phép lưu. |
| Dữ liệu thay đổi ở tab khác | Dừng thao tác đang chờ, xem bản mới nhất rồi mở lại biểu mẫu hoặc hộp xác nhận. Dùng một tab để chỉnh sửa. Không mặc định rằng nội dung biểu mẫu cũ đã được lưu. |
| Bản lưu bị lỗi | App giữ nguyên dữ liệu gốc thay vì tự xóa. Chọn **Tải dữ liệu gốc bị lỗi** để bảo toàn thông tin; đây chưa phải bản sao hợp lệ. Có thể tải riêng **Sổ đang hiển thị (JSON)** và bản phục hồi nếu có, rồi khôi phục từ bản hợp lệ. Sổ đang hiển thị không chứa phần dữ liệu gốc không đọc được. |
| Bản lưu bị xóa ở nơi khác nhưng tab vẫn hiển thị sổ | Giữ tab mở và tải JSON ngay. Bản đang hiển thị có thể chỉ còn trong bộ nhớ phiên; cần xác nhận khôi phục hoặc nhập JSON để lưu trở lại. |
| Mở lại thấy bản chính mất nhưng còn phục hồi/lịch sử | Vào Cài đặt, tải bản tìm thấy và kiểm tra số giao dịch trước khi khôi phục. Chỉ chọn **Dùng sổ trống** khi muốn bắt đầu lại; các thay đổi tiếp theo có thể cập nhật file đang liên kết bằng sổ mới. |
| Mở biểu tượng mới trên iPhone thấy sổ trống | Mở lại Safari hoặc biểu tượng cũ đang giữ sổ, xuất JSON và nhập vào nơi mới. Không xóa bản cũ trước khi đối chiếu xong. |
| Không có bản phục hồi hợp lệ | Dùng JSON đã tải xuống. App không có bản sao máy chủ để lấy lại dữ liệu đã mất ở cả trình duyệt lẫn file sao lưu. |

Lưu trữ kiểm tra phiên dữ liệu trước khi ghi và kiểm tra lại sau khi tạo bản phục hồi. Nếu phát hiện xung đột hoặc không tạo được bản phục hồi cần thiết, app dừng thao tác. Tuy nhiên, `localStorage` không cung cấp giao dịch nguyên tử giữa nhiều tab; cơ chế này giảm nguy cơ ghi đè, không biến app thành hệ thống chỉnh sửa đồng thời.

## 6. Triển khai và nâng cấp

Phần website hoàn chỉnh nằm trong `dist/`. Phục vụ nguyên thư mục qua dịch vụ lưu trữ tĩnh có HTTPS; các module, CSS và icon phải nằm đúng vị trí tương đối. Không có dependency cần cài, bước build, cơ sở dữ liệu hoặc API secret của app. Máy chủ Node đi kèm chỉ phục vụ phát triển tại máy.

### GitHub Pages

Trong repository `thanhlampro1012/money-management`, chọn **Settings → Pages → Build and deployment → Source: GitHub Actions**. Repository và gói tài khoản phải đủ điều kiện dùng Pages; với GitHub Free, repository cần công khai. Xem [điều kiện GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

Workflow `.github/workflows/pages.yml` chạy trên push vào `main` hoặc chạy thủ công bằng **Actions → Publish Money Management → Run workflow** với nhánh `main`. Workflow dùng Node.js 22 để chạy `npm run check` và `npm test`, sau đó tải nội dung `dist/` làm artifact Pages và triển khai với environment `github-pages`. Quyền workflow gồm `contents: read`, `pages: write` và `id-token: write`; không cần thêm API secret của ứng dụng. Xem [cấu hình workflow Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Theo dõi lần chạy đến khi bước **Publish website** thành công, rồi mở **https://thanhlampro1012.github.io/money-management/**. Kiểm tra trang, CSS, biểu tượng và thao tác chuyển mục. Các tài nguyên dùng đường dẫn tương đối và điều hướng dùng dấu `#`, phù hợp với đường dẫn dự án `/money-management/`.

Trước khi phát hành:

```bash
npm run check
npm test
```

Sau đó kiểm tra trên một hồ sơ thử: thêm/sửa/xóa giao dịch, chuyển ví, xuất Excel, tải/nhập JSON, lịch sử sau tải lại trang, cấp/thu hồi quyền file và thông báo sao lưu lỗi. Kiểm tra thêm bố cục hẹp, biểu mẫu khi bàn phím mở, chế độ tối, cài màn hình chính, tải lại ngoại tuyến và cập nhật khi còn nội dung chưa lưu. Không dùng sổ thật cho các thử nghiệm thay thế dữ liệu.

CI kiểm tra mã và các tình huống giả lập, không thay cho một luồng sử dụng thực tế. **Bản 1.3.0 chưa có xác nhận kiểm thử trên iPhone/Android vật lý.** Trước khi dựa vào một thiết bị cụ thể, đối chiếu một giao dịch thử, mở lại từ biểu tượng và xác nhận file JSON thực sự xuất hiện ở nơi lưu trên máy đó.

### Bảo toàn dữ liệu khi nâng cấp

1. Xuất JSON trước khi thay phiên bản.
2. Giữ nguyên **origin** — giao thức, tên miền và cổng — nếu muốn trình duyệt tiếp tục dùng sổ hiện có.
3. Giữ khóa chính `vi-minh:v1`. Đây là khóa tương thích dữ liệu cũ, không phải tên hiển thị hay phiên bản schema hiện tại.
4. Tăng `VERSION` trong `dist/sw.js` mỗi khi sửa file được lưu ngoại tuyến và triển khai đồng bộ toàn bộ `dist/`. Giữ `manifest.webmanifest`, `sw.js`, các module, CSS và `icons/` trong gói Pages.
5. Khi có mạng, dùng **Kiểm tra cập nhật** trong Cài đặt. Lưu xong công việc, đợi sao lưu hoàn tất rồi bấm **Cập nhật/Cập nhật ứng dụng** khi bản mới sẵn sàng; có thể chọn **Để sau**. App hỏi trước nếu còn nội dung chưa lưu, chờ tác vụ sao lưu đang chạy rồi tải lại. Nếu cập nhật được chấp nhận ở tab khác, app không tự tải lại tab đang nhập dở.
6. Đối chiếu số dư, giao dịch và ngân sách; tải bản JSON mới sau khi xác nhận dữ liệu đúng. **Không xóa dữ liệu website để buộc cập nhật.** Nếu tải bản mới lỗi, bản đã cài vẫn dùng được; kết nối mạng rồi thử lại.

Schema sổ v1/v2 được đọc và chuẩn hóa thành v3 trong bộ nhớ, chưa ghi đè dữ liệu chỉ vì mở app. Lần lưu chủ động thành công tiếp theo ghi v3. Các bản ghi có sẵn được giữ nguyên; danh mục tự tạo và lịch định kỳ là các phần bổ sung. Đổi tên hiển thị sản phẩm không làm đổi khóa dữ liệu, nhưng chuyển sang GitHub Pages làm đổi origin nên cần nhập lại bản sao JSON.

Nếu chuyển tên miền, giao thức, cổng, trình duyệt hoặc thiết bị, hãy xuất từ nơi cũ và nhập ở nơi mới. Hai nơi giữ hai sổ độc lập sau khi chuyển; việc nhập một lần không bật đồng bộ. Không chạy mã phiên bản cũ để ghi vào sổ v3. Khi cần quay lại phiên bản cũ, dùng bản sao đã xuất trước nâng cấp và kiểm tra tính tương thích: v1 không hiểu chuyển ví, còn v1/v2 không hiểu danh mục tự tạo và lịch của v3.

### Chuyển sổ từ địa chỉ Sites cũ sang GitHub Pages

1. Mở [địa chỉ Sites cũ](https://vi-minh-lam-finance.workspace-qu-1719.chatgpt.site) bằng đúng trình duyệt và hồ sơ đang giữ sổ. Vào **Cài đặt & dữ liệu → Tải bản sao JSON**.
2. Kiểm tra file `.json` có trong thư mục tải xuống. Giữ bản sao này ở nơi riêng tư; file chưa được mã hóa. Excel không thay thế được JSON để chuyển toàn bộ sổ.
3. Mở [Money Management trên GitHub Pages](https://thanhlampro1012.github.io/money-management/). Sổ trống ở địa chỉ mới không có nghĩa sổ cũ đã mất: hai địa chỉ có bộ nhớ riêng. Nếu đã ghi dữ liệu ở địa chỉ mới, tải JSON của sổ đó trước khi nhập.
4. Chọn **Cài đặt & dữ liệu → Nhập bản sao JSON**, chọn file từ bước 1, đọc thông tin rồi xác nhận thay thế sổ tại địa chỉ mới. App không gộp hai sổ.
5. Đối chiếu số lượng giao dịch, số dư từng ví, ngân sách, mục tiêu và các lịch định kỳ. Tải một bản JSON mới từ GitHub Pages khi đã xác nhận đúng; giữ sổ cũ cho đến lúc đối chiếu xong.

Sau khi chuyển, ghi tiếp tại địa chỉ GitHub Pages. Thay đổi tại một địa chỉ không tự xuất hiện ở địa chỉ còn lại. Lựa chọn Sáng/Tối/Theo hệ thống không nằm trong JSON, nên chọn lại nếu cần. Dữ liệu tài chính không được đưa vào repository trong quá trình triển khai.

## 7. Giao diện, quyền truy cập và giới hạn vận hành

Trong **Cài đặt & dữ liệu → Giao diện**, chọn Sáng, Tối hoặc Theo hệ thống. Nút góc trên chuyển nhanh giữa sáng và tối. Lựa chọn được lưu riêng trên trình duyệt, không nằm trong JSON tài chính; khi chuyển thiết bị có thể cần chọn lại. Nếu bộ nhớ bị chặn, app vẫn áp dụng lựa chọn trong phiên hiện tại và báo rằng chưa lưu được.

Bản GitHub Pages là website công khai, mở trực tiếp mà không cần đăng nhập ChatGPT. GitHub chỉ phục vụ mã ứng dụng; sổ nằm trong `localStorage`, lịch sử và liên kết file nằm trong IndexedDB, còn JSON ở nơi bạn tải/chọn/chia sẻ. App không tải sổ lên repository, không có đăng nhập hay đồng bộ tài khoản. App chưa mã hóa sổ/file; người dùng chung hồ sơ trình duyệt có thể đọc sổ tại cùng origin.

Không đưa file tài chính, log chứa nội dung giao dịch, thông tin xác thực hoặc API secret vào repository. Repository chỉ cần mã nguồn, kiểm thử, tài liệu và cấu hình triển khai; dữ liệu dùng thật nằm trong trình duyệt và các file người dùng tự xuất.

Phiên bản 1.3 bổ sung dùng trên màn hình chính, ngoại tuyến, sao lưu file và lịch sử cho sổ cá nhân. Theo dõi vay/nợ chuyên biệt, sổ dùng chung, kết nối ngân hàng và đồng bộ nhiều thiết bị chưa được triển khai. Đồng bộ cần máy chủ lưu trữ, danh tính, phân quyền, kiểm soát xung đột và sao lưu được kiểm chứng. Xem [đối chiếu tính năng](COMPARISON.md) về các ưu tiên tính năng từ bản 1.2.
