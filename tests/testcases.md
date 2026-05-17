# Kịch Bản Kiểm Thử (Test Cases) - MotoShop

Dưới đây là danh sách các test case thủ công (Manual Test Cases) để bạn có thể tự mình kiểm tra toàn bộ website. Cột "Kết Quả Thực Tế" bạn có thể tự đánh dấu (Pass/Fail) khi test.

## 1. Xác thực người dùng (Authentication)

| ID | Tên Test Case | Các Bước Thực Hiện | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi (Expected) | Kết Quả Thực Tế |
|---|---|---|---|---|---|
| TC-AUTH-01 | Đăng ký tài khoản thành công | 1. Vào trang Đăng ký.<br>2. Nhập thông tin đầy đủ và hợp lệ.<br>3. Bấm Đăng ký. | Tên: Test User<br>SĐT: 0912345678<br>Email: test@gmail.com<br>Pass: 123456 | Hiển thị thông báo thành công và chuyển hướng sang trang Đăng nhập. | [ ] |
| TC-AUTH-02 | Đăng ký thiếu thông tin/sai SĐT | 1. Vào trang Đăng ký.<br>2. Nhập SĐT chứa chữ cái hoặc pass < 6 ký tự.<br>3. Bấm Đăng ký. | SĐT: abc123456<br>Pass: 123 | Báo lỗi định dạng SĐT / mật khẩu quá ngắn. Không tạo tài khoản. | [ ] |
| TC-AUTH-03 | Đăng nhập tài khoản Khách hàng | 1. Vào trang Đăng nhập.<br>2. Nhập đúng user/pass.<br>3. Bấm Đăng nhập. | User: test@gmail.com<br>Pass: 123456 | Chuyển hướng sang trang chủ (index.html), góc phải có tên user. | [ ] |
| TC-AUTH-04 | Đăng nhập tài khoản Admin từ trang Khách | 1. Vào trang Đăng nhập khách (login.html).<br>2. Nhập user/pass của admin.<br>3. Bấm Đăng nhập. | User: admin@motoshop.vn<br>Pass: password | Chuyển hướng thẳng vào trang Admin Dashboard thành công, không bị lỗi kẹt. | [ ] |
| TC-AUTH-05 | Đăng xuất | 1. Bấm vào icon User trên Navbar.<br>2. Chọn Đăng xuất. | (Trạng thái đã đăng nhập) | Trở về trạng thái chưa đăng nhập, góc phải hiện nút Đăng nhập. | [ ] |

## 2. Giỏ Hàng & Đặt Hàng (Cart & Checkout)

| ID | Tên Test Case | Các Bước Thực Hiện | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi (Expected) | Kết Quả Thực Tế |
|---|---|---|---|---|---|
| TC-CART-01 | Thêm sản phẩm vào giỏ | 1. Vào trang Chi tiết sản phẩm.<br>2. Bấm "Thêm vào giỏ hàng". | Sản phẩm bất kỳ | Số lượng trên icon giỏ hàng (Navbar) tăng lên. | [ ] |
| TC-CART-02 | Chỉnh sửa số lượng / Xóa | 1. Vào Giỏ hàng.<br>2. Tăng/giảm số lượng hoặc xóa sản phẩm. | N/A | Tạm tính và Thành tiền cập nhật lại đúng. Xóa thành công. | [ ] |
| TC-CART-03 | Áp dụng mã giảm giá | 1. Nhập mã giảm giá hợp lệ.<br>2. Bấm Áp dụng. | Mã: GIAM500K (hoặc mã trong DB) | Tổng tiền giảm đúng, hiện thông báo thành công. | [ ] |
| TC-CART-04 | Đặt hàng với SĐT sai | 1. Điền form thông tin đặt hàng.<br>2. Nhập SĐT chứa ký tự chữ.<br>3. Bấm Xác nhận. | SĐT: abc123456 | Trình duyệt báo lỗi HTML5 hoặc API trả về lỗi "Số điện thoại không hợp lệ". | [ ] |
| TC-CART-05 | Đặt hàng thành công | 1. Nhập form thông tin đúng.<br>2. Bấm Đặt hàng. | Họ tên, SĐT 10 số, Địa chỉ cụ thể. | Thông báo thành công, giỏ hàng reset về 0, chuyển sang trang "Đơn hàng của tôi". | [ ] |

## 3. Chức năng Sản phẩm & Tìm kiếm

| ID | Tên Test Case | Các Bước Thực Hiện | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi (Expected) | Kết Quả Thực Tế |
|---|---|---|---|---|---|
| TC-PROD-01 | Tìm kiếm sản phẩm | 1. Gõ từ khóa vào thanh search Navbar.<br>2. Nhấn Enter hoặc nút Search. | Keyword: "Honda" | Trang sản phẩm hiển thị chỉ các xe Honda. | [ ] |
| TC-PROD-02 | Lọc theo danh mục | 1. Vào trang Tất cả sản phẩm.<br>2. Click vào danh mục (VD: Xe tay ga). | N/A | Danh sách cập nhật đúng các xe thuộc danh mục đó. | [ ] |
| TC-PROD-03 | Xem chi tiết sản phẩm | 1. Click vào một sản phẩm bất kỳ. | N/A | Hiển thị đủ ảnh, giá, mô tả, và thông số kỹ thuật. | [ ] |

## 4. Quản trị viên (Admin Dashboard)

| ID | Tên Test Case | Các Bước Thực Hiện | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi (Expected) | Kết Quả Thực Tế |
|---|---|---|---|---|---|
| TC-ADM-01 | Phân quyền truy cập | 1. Đăng nhập bằng tài khoản Khách (customer).<br>2. Gõ trực tiếp URL `/admin/index.html`. | N/A | Bị đẩy văng về lại trang `login.html`. | [ ] |
| TC-ADM-02 | Cập nhật trạng thái Đơn hàng | 1. Vào Admin -> Đơn hàng.<br>2. Chọn đơn "Chờ xử lý", đổi thành "Đã liên hệ". | N/A | Trạng thái lưu thành công, màu sắc badge thay đổi. | [ ] |
| TC-ADM-03 | Thêm sản phẩm mới | 1. Vào Admin -> Sản phẩm -> Thêm mới.<br>2. Điền thông tin và Upload ảnh.<br>3. Lưu. | Ảnh JPG, đầy đủ giá/tên. | Sản phẩm lưu vào database, hiện trên bảng sản phẩm và trang chủ web ngoài. | [ ] |
| TC-ADM-04 | Quản lý mã giảm giá | 1. Vào Admin -> Mã giảm giá.<br>2. Tạo mã mới loại % hoặc VNĐ. | Mã: TEST2026 | Tạo thành công. Mang mã ra trang Giỏ hàng test thử sẽ áp dụng được. | [ ] |
| TC-ADM-05 | Đọc liên hệ (Contact) | 1. Ở trang Khách, gửi 1 Liên hệ.<br>2. Vào Admin -> Liên hệ để xem. | Nội dung: Test | Tin nhắn hiển thị đúng, trạng thái "Chưa đọc". Click Xem sẽ đổi thành "Đã đọc". | [ ] |

## 5. UI / UX / Khác

| ID | Tên Test Case | Các Bước Thực Hiện | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi (Expected) | Kết Quả Thực Tế |
|---|---|---|---|---|---|
| TC-UI-01 | Kiểm tra Responsive Mobile | 1. Mở F12 (DevTools) chọn chế độ Mobile (iPhone 12/14).<br>2. Duyệt các trang. | N/A | Navbar gập thành Hamburger menu. Bố cục 1 cột, không vỡ layout, không có thanh cuộn ngang. | [ ] |
| TC-UI-02 | In hóa đơn | 1. Vào "Đơn hàng của tôi".<br>2. Chọn 1 đơn, bấm "In hóa đơn". | Đơn hàng bất kỳ | Popup in (Print) hiện lên, bố cục hóa đơn không hiển thị code HTML rác (lỗi đã sửa). | [ ] |
| TC-UI-03 | Kiểm tra ảnh lỗi (Broken Image) | 1. Duyệt toàn trang web. | N/A | Không có ảnh nào bị biểu tượng lỗi. Ảnh upload từ local bằng Admin phải load được. | [ ] |
