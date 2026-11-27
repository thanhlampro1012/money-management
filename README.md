# Money Management

**Phiên bản 1.5.1** — sổ thu chi cá nhân bằng tiếng Việt (VND), hỗ trợ giao diện di động/PWA, Excel, sao lưu, khóa sổ AES-256-GCM và tùy chọn đăng nhập + đồng bộ mã hóa giữa các thiết bị bằng Firebase Authentication và Cloud Firestore. Bản website tĩnh vẫn dùng miễn phí trên GitHub Pages; chức năng Firebase chỉ chạy sau khi chủ dự án cấu hình dịch vụ.

[Mở ứng dụng trên GitHub Pages](https://thanhlampro1012.github.io/money-management/) · [Hướng dẫn vận hành](docs/OPERATIONS.md) · [Đối chiếu tính năng và ưu tiên](docs/COMPARISON.md)

**Firebase và an toàn dữ liệu (1.5.1):** [Thiết lập Firebase project, Authentication và Firestore Rules](docs/FIREBASE-SETUP.md) · [Mã Firestore Rules](firestore.rules) · [Ghi chú phát hành 1.5.1](docs/RELEASE-1.5.1.md). Đăng nhập/đồng bộ chưa hoạt động cho đến khi bạn cung cấp cấu hình Web App và xuất bản quy tắc trên dự án Firebase của mình.

> **Lưu ý:** 1.5.1 bổ sung email đặt lại mật khẩu tài khoản Firebase, xác nhận mật khẩu cloud hai lần và ngăn bản cloud đến muộn ghi đè giao dịch vừa lưu. **Mật khẩu mã hóa riêng không thể đặt lại qua email.** Chưa thể xác minh đồng bộ thực tế khi chưa có Firebase project của chủ sở hữu.

## Phạm vi sử dụng

Mặc định, Money Management là **sổ cá nhân lưu tại trình duyệt**, dùng `localStorage` và IndexedDB; dữ liệu không tự chuyển sang một thiết bị khác. Sau khi chủ dự án thiết lập Firebase, người dùng có thể bật khóa sổ, đăng nhập Firebase Authentication, rồi xác nhận đưa bản sổ **đã mã hóa** lên Cloud Firestore để đồng bộ với thiết bị khác. Không dùng GitHub repo làm kho dữ liệu và không kết nối ngân hàng. Firebase cần cấu hình, Security Rules và kết nối mạng; ngoại tuyến vẫn ghi vào máy. Chức năng chuyển giữa ví chỉ ghi nhận việc chuyển tiền đã thực hiện, không gọi API chuyển tiền.


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
| Trên điện thoại | Biểu tượng ví cho Android/iPhone, thêm vào màn hình chính, mở và ghi sổ ngoại tuyến sau khi tải đủ app; cập nhật phiên bản khi bạn chọn. |
| Sao lưu file | Cập nhật file JSON đã chọn khi trình duyệt hỗ trợ và còn quyền ghi; hoặc chủ động bật tải một JSON mới sau mỗi lần lưu. Có tải thủ công và chia sẻ file qua hệ điều hành. |
| Phục hồi | Tối đa 30 bản lịch sử trên thiết bị, thêm một trạng thái trước lần lưu gần nhất; kiểm tra JSON trước khi nhập hoặc khôi phục. |
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

Kiểm thử sử dụng `node:test`, bao gồm tính đúng của số dư và báo cáo, chuyển giữa ví, chuyển đổi bản sao cũ sang schema v3, tham chiếu danh mục tự tạo, lịch tháng ngắn/năm nhuận, xác nhận định kỳ chống lặp kỳ cũ, khoảng ngày, dữ liệu nhập sai, lỗi bộ nhớ, phục hồi, sao lưu khi quyền ghi bị thu hồi, xung đột giữa các tab và cập nhật app. CI chạy kiểm tra cú pháp và bộ kiểm thử khi có push hoặc pull request. Kiểm thử tự động và trình duyệt không thay thế kiểm tra trên máy thật; **chưa có xác nhận kiểm thử trên iPhone/Android vật lý** cho bản này.

## Bắt đầu sử dụng

1. Vào **Ví của tôi**, thêm các ví cần theo dõi và nhập số dư tại thời điểm bắt đầu ghi sổ.
2. Ghi khoản thu hoặc chi với ngày thực tế. Chọn **Chuyển giữa ví** khi chỉ di chuyển tiền giữa các ví đang theo dõi, chẳng hạn rút tiền ngân hàng về tiền mặt.
3. Chọn tháng để xem báo cáo và đặt ngân sách cho các danh mục cần kiểm soát.
4. Tạo mục tiêu nếu muốn theo dõi riêng tiền đã để dành. Cập nhật mục tiêu không tự chuyển tiền hay tạo giao dịch.
5. Trong **Cài đặt & dữ liệu → Sao lưu tự động**, chọn file JSON tự cập nhật nếu có nút **Chọn file sao lưu**, hoặc bật **Tải một bản JSON sau mỗi lần lưu**. Mặc định hai cách sao lưu ra file đều tắt cho đến khi bạn chọn; lịch sử trên thiết bị được tạo tự động sau các thay đổi đã lưu.
6. Giữ thêm JSON ở nơi riêng tư trước khi đổi thiết bị, thêm lại app màn hình chính, đổi địa chỉ website hoặc xóa dữ liệu trình duyệt. Kiểm tra file thực tế đã có ở nơi bạn chọn.

Trong **Danh mục**, thêm các nhóm thu/chi phù hợp với bạn. Trong **Khoản định kỳ**, tạo mẫu cho tiền nhà, hóa đơn hoặc lương. Lịch chỉ hiển thị khoản sắp đến hạn/quá hạn khi mở app; chỉ thao tác **Ghi vào sổ** và xác nhận lưu mới tạo giao dịch thực tế. **Bỏ kỳ này** chỉ tiến lịch, **Tạm dừng** giữ nguyên kỳ chờ. Các lịch không thực hiện thanh toán hoặc gửi thông báo nền.

### Cách tính

- **Số dư ví** = số dư ban đầu + thu nhập − chi tiêu + chuyển đến − chuyển đi, tính trên tất cả giao dịch đã ghi.
- **Tổng số dư** = tổng số dư ban đầu + toàn bộ thu nhập − toàn bộ chi tiêu. Chuyển giữa các ví không làm thay đổi tổng này.
- **Thu/chi trong tháng** lấy theo ngày giao dịch thuộc tháng được chọn; không tính số dư ban đầu, giao dịch chuyển giữa ví hoặc cập nhật mục tiêu.
- **Chênh lệch trong tháng** = thu nhập − chi tiêu. Khi có thu nhập, tỷ lệ giữ lại = chênh lệch / thu nhập.
- **Ngân sách** chỉ tổng hợp chi tiêu của đúng danh mục và tháng; không cộng chuyển giữa ví.
- **Lịch định kỳ chưa xác nhận** không tác động số dư, báo cáo hoặc ngân sách. Ngày 31 được kẹp về cuối tháng ngắn rồi trở lại ngày 31 ở tháng phù hợp; lịch 29/2 giữ ngày gốc qua các năm.

Số tiền là số nguyên VND. Số dư âm được phép để phản ánh dữ liệu đã nhập; ứng dụng không xác minh số dư ngân hàng thực tế. Giao dịch mang ngày tương lai vẫn là bản ghi và ảnh hưởng số dư toàn thời gian, vì vậy chỉ dùng ngày tương lai nếu bạn chủ động muốn ghi như vậy.

## Dùng trên điện thoại và ngoại tuyến

- **iPhone/iPad:** mở [website](https://thanhlampro1012.github.io/money-management/) bằng Safari, chọn **Chia sẻ → Thêm vào Màn hình chính**.
- **Android:** mở bằng Chrome, chọn **Cài đặt ứng dụng** hoặc **Thêm vào màn hình chính** trong menu ⋮; cũng có thể dùng nút tương ứng trong Cài đặt khi trình duyệt cung cấp.

Biểu tượng là chiếc ví màu xanh, có bản dành cho iPhone và biểu tượng thích ứng trên Android. Mở app khi có mạng ít nhất một lần và kiểm tra mục **Ứng dụng trên điện thoại** đã báo tải xong trước khi dùng ngoại tuyến. Bộ nhớ ngoại tuyến giữ mã giao diện; sổ tài chính vẫn cần các bản sao dữ liệu riêng.

**Trước khi thêm lại hoặc xóa biểu tượng cũ, xuất JSON từ đúng nơi đang giữ sổ.** Trên iPhone, app màn hình chính có thể có vùng dữ liệu riêng với Safari; nếu mở biểu tượng mới thấy sổ trống, nhập JSON rồi đối chiếu số dư trước khi bỏ bản cũ. [WebKit mô tả dữ liệu cục bộ không được sao chép khi thêm web app](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/).

Khi có bản mới, lưu xong công việc rồi chọn **Cập nhật**; có thể chọn **Để sau**. App kiểm tra phần nhập chưa lưu và chờ các tác vụ sao lưu đang chạy trước khi tải lại. Dùng **Kiểm tra cập nhật** trong Cài đặt khi có mạng; không cần xóa dữ liệu website để cập nhật.

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

| Cách giữ dữ liệu | Hoạt động và giới hạn |
| --- | --- |
| **File JSON tự cập nhật** | Chọn file và cấp quyền một lần bằng nút trong Cài đặt. Sau mỗi thay đổi được lưu, app ghi lại toàn bộ sổ vào file đó. Giữ app mở đến khi hiện **Đã sao lưu file**. Khi quyền hết hiệu lực, bấm **Cho phép ghi file**; app không tự mở hộp cấp quyền lúc khởi động. |
| **Tải một bản JSON sau mỗi lần lưu** | Tùy chọn thay cho cập nhật một file; mỗi thay đổi yêu cầu tải file mới có dấu thời gian. Trình duyệt có thể chặn tải nhiều file hoặc yêu cầu bạn chọn nơi lưu. App chỉ biết đã yêu cầu tải, không xác nhận hệ điều hành đã lưu thành công. |
| **Lịch sử phục hồi tự động** | Giữ tối đa 30 mốc lưu gần nhất trong IndexedDB, bỏ qua bản trùng liên tiếp, tự tạo sau khi sổ chính lưu thành công. Có thể tải hoặc khôi phục từng bản. Lịch sử ở cùng trình duyệt và origin, không phải bản sao cloud. |
| **Tải / chia sẻ thủ công** | Dùng **Tải bản sao JSON** hoặc **Lưu / chia sẻ bản sao**. Nếu thiết bị hỗ trợ chia sẻ file, chọn ứng dụng Tệp, iCloud Drive hoặc nơi riêng của bạn trong bảng chia sẻ. Nếu không hỗ trợ, app dùng lượt tải JSON thông thường. |

Nút chọn file chỉ hiện khi có `showSaveFilePicker`. Chrome công bố hỗ trợ File System Access trên Android từ phiên bản 132; app kiểm tra tính năng thực tế, không suy ra từ tên thiết bị. Xem [ghi chú Chrome 132](https://developer.chrome.com/release-notes/132#file-system-access-for-android-and-webview). Các trình duyệt không cung cấp chức năng này dùng tải JSON hoặc chia sẻ thủ công.

**Lần xuất gần nhất** và **Lần yêu cầu tải gần nhất** chỉ ghi nhận khởi tạo tải xuống. Hãy kiểm tra file trong Tải xuống/Tệp. **Ưu tiên giữ dữ liệu** gửi yêu cầu tới trình duyệt, không bảo đảm dữ liệu sẽ tồn tại sau khi bạn xóa website hoặc mất máy. Bản phục hồi một trạng thái từ phiên bản cũ vẫn được giữ riêng; các bản trên thiết bị đều cần một file sao lưu nằm ngoài dữ liệu website.

Nếu bản chính mất nhưng còn lịch sử, app yêu cầu xem bản phục hồi hoặc xác nhận dùng sổ trống trước khi ghi tiếp. Việc mở app với sổ trống/lỗi không tự ghi đè file sao lưu đã chọn. Khôi phục hoặc nhập JSON sẽ thay sổ sau xác nhận, rồi cơ chế sao lưu tiếp tục với sổ mới.

`localhost`, bản xem thử và website đã triển khai là các nguồn lưu trữ khác nhau. Trình duyệt, hồ sơ trình duyệt và thiết bị khác cũng không tự chia sẻ sổ. File JSON/Excel không được mã hóa; giữ chúng ở nơi riêng tư và không đưa vào Git.

Chế độ **Sáng/Tối/Theo hệ thống** lưu riêng với sổ, không nằm trong bản sao JSON. Nếu trình duyệt không cho lưu lựa chọn, giao diện vẫn đổi cho phiên hiện tại và app thông báo rằng lựa chọn chưa được ghi nhớ.

## Cấu trúc mã nguồn

| Đường dẫn | Vai trò |
| --- | --- |
| `dist/index.html` | Trang khởi chạy. |
| `dist/app.js` | Giao diện, điều hướng, biểu mẫu và tương tác. |
| `dist/finance.js` | Schema v3, chuyển đổi dữ liệu cũ, tính toán, danh mục, lịch định kỳ và kiểm tra bản sao. |
| `dist/storage.js` | Lưu sổ, kiểm tra phiên dữ liệu, bản phục hồi và thời điểm xuất JSON. |
| `dist/backup.js` | Lịch sử IndexedDB, liên kết file JSON, quyền ghi, tải tự động và hàng đợi sao lưu. |
| `dist/export.js`, `dist/export-template.js` | Tạo file XLSX và định dạng hai sheet báo cáo. |
| `dist/theme.js` | Lựa chọn giao diện sáng/tối/theo hệ thống. |
| `dist/pwa.js`, `dist/sw.js`, `dist/manifest.webmanifest` | Cài lên màn hình chính, bộ nhớ ngoại tuyến và cập nhật có xác nhận. |
| `dist/styles.css`, `dist/mobile.css`, `dist/input.js` | Giao diện thích ứng, bàn phím điện thoại và nhập số tiền. |
| `dist/icon.svg`, `dist/icons/` | Biểu tượng ví và các kích thước cho Android/iPhone. |
| `tests/` | Kiểm thử logic và các thành phần của ứng dụng. |
| `scripts/serve.mjs` | Máy chủ tĩnh dành cho phát triển. |
| `.github/workflows/ci.yml` | Kiểm tra cú pháp và kiểm thử trên CI. |
| `.github/workflows/pages.yml` | Kiểm tra mã và xuất bản `dist/` lên GitHub Pages từ nhánh `main`. |
| `docs/OPERATIONS.md` | Thiết lập, sao lưu, xử lý sự cố và nâng cấp. |
| `docs/COMPARISON.md` | Đối chiếu nguồn chính thức và lý do ưu tiên các tính năng. |

## Triển khai và nâng cấp

Phục vụ trực tiếp nội dung **`dist/`** bằng một dịch vụ lưu trữ tĩnh, giữ các file cùng cấu trúc đường dẫn tương đối. Không cần máy chủ ứng dụng, cơ sở dữ liệu hay API secret. Máy chủ trong `scripts/serve.mjs` dành cho phát triển; khi triển khai thực tế, dùng dịch vụ lưu trữ tĩnh có HTTPS.

Địa chỉ GitHub Pages của dự án là **https://thanhlampro1012.github.io/money-management/**. Trong repository, chọn **Settings → Pages → Build and deployment → Source: GitHub Actions**. Workflow **Publish Money Management** chạy khi có push vào `main` hoặc khi chọn **Run workflow** trên nhánh `main`; nó kiểm tra cú pháp, chạy bộ kiểm thử, rồi xuất bản nội dung `dist/`. Chỉ bước triển khai thành công mới cập nhật website. Workflow CI riêng tiếp tục kiểm tra push và pull request. Xem [hướng dẫn workflow GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Khi nâng cấp tại cùng địa chỉ, giữ nguyên **origin** và khóa lưu sổ `vi-minh:v1` để trình duyệt tiếp tục tìm thấy dữ liệu. Tăng `VERSION` trong `dist/sw.js` mỗi khi thay tài nguyên được lưu ngoại tuyến, triển khai đầy đủ `dist/`, rồi để người dùng chọn cập nhật khi bản mới sẵn sàng. **Chuyển từ địa chỉ Sites cũ sang GitHub Pages không tự chuyển sổ**: mở [bản cũ](https://vi-minh-lam-finance.workspace-qu-1719.chatgpt.site), vào **Cài đặt & dữ liệu → Tải bản sao JSON**, kiểm tra file đã tải xuống, rồi mở địa chỉ GitHub Pages và chọn **Nhập bản sao JSON**. Việc nhập thay thế sổ tại địa chỉ mới sau xác nhận. Đối chiếu số dư và số giao dịch trước khi ngừng dùng bản cũ; hai địa chỉ giữ hai sổ độc lập. Xem quy trình cụ thể trong [OPERATIONS.md](docs/OPERATIONS.md#chuyển-sổ-từ-địa-chỉ-sites-cũ-sang-github-pages).

## Phạm vi phát triển tiếp

Phiên bản này ưu tiên ghi sổ cá nhân, lịch định kỳ, báo cáo Excel, offline, backup, khóa sổ và đồng bộ Firebase **tùy chọn**. Theo dõi vay/nợ chuyên biệt, chia sẻ sổ cho nhiều tài khoản cùng chỉnh sửa và kết nối ngân hàng chưa hỗ trợ. Xem [đối chiếu](docs/COMPARISON.md) và [hướng dẫn Firebase](docs/FIREBASE-SETUP.md).

Đồng bộ Firebase từ 1.5 phục vụ **một chủ tài khoản trên nhiều thiết bị**, không phải nhiều tài khoản cùng quản lý một sổ. Nếu hai thiết bị sửa offline, app yêu cầu người dùng chọn bản giữ lại thay vì tự gộp. Việc dùng Firebase thật còn phụ thuộc dự án của chủ sở hữu, Security Rules đã Publish và thử nghiệm thực tế hai thiết bị.
