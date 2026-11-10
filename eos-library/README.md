# Studyroom — thư viện ôn tập EOS 1.2

## Chạy trên máy

1. Giải nén toàn bộ gói, giữ các file cùng thư mục.
2. Chạy `start.cmd`. Máy cần Node.js (máy đang dùng để tạo extension đã có Node). App không cần cài thư viện Python/OCR.
3. Mở **http://127.0.0.1:4178** bằng Edge hoặc Chrome. Giữ cửa sổ máy chủ mở khi học. Ctrl+C để dừng máy chủ.
4. Dùng cùng trình duyệt, profile và địa chỉ này mỗi lần mở để thấy thư viện đã lưu. `localhost` và `127.0.0.1` là hai kho dữ liệu khác nhau.

Có thể chạy tay: `node server.cjs`. Máy chủ chỉ lắng nghe trên máy của bạn. App không cần Internet để nhập đề, học, lưu kết quả hay xuất HTML.

## Thêm một hoặc nhiều đề

- Bấm **Thêm đề → Chọn thư mục và quét**. Chọn một thư mục đề hoặc thư mục cha chứa nhiều đề/môn.
- Trang tìm `manifest.json`, `manifest-<timestamp>.json` hoặc `quiz_data.json` và hiển thị danh sách checkbox. Tick một hoặc nhiều đề muốn thêm.
- Đề có sẵn được đánh dấu. File không thay đổi thì bỏ qua; dữ liệu thay đổi được cập nhật. Không nhân đôi cùng bài nguồn FuOverflow.
- **Quét lại** dùng thư mục đã nhớ nếu trình duyệt cho phép. Với hộp chọn thư mục dự phòng, chọn lại thư mục khi cần quét.
- File nguồn không bị sửa. App sao chép dữ liệu và ảnh vào IndexedDB trong trình duyệt. Nếu xóa dữ liệu website hoặc dùng profile khác, cần nhập lại folder. Nên giữ bản gốc trên ổ đĩa.

Trang chủ liệt kê môn; mở môn để thấy các đề chia theo năm. Có tìm kiếm môn, tên đề và năm. Tên môn nhận từ mã như MLN122/PRM393; năm nhận từ 2025 hoặc SU25/SP25/FA25. Không nhận được sẽ vào KHÁC / Chưa rõ năm.

## Dữ liệu đầu vào

Ưu tiên manifest schema 1/2 của extension:

```
Tên đề/
  manifest.json
  originals/Q001.png ...   (ảnh câu hỏi đã phóng)
  Q001.png ...             (ảnh ghép bình luận)
```

Hỗ trợ dữ liệu `quiz_data.json` của Tool_EOS_FE và `questions/`. Nếu chỉ có ảnh ghép, app dùng ảnh đó để học và thông báo trong log nhập. App không OCR lại ảnh. Câu thiếu ảnh bị loại khỏi lượt học, số ảnh thiếu được hiển thị; không đổi số Q của các câu còn lại.

Đáp án lấy trực tiếp từ manifest. Nếu chưa có answer nhưng có counts/votes hoặc bình luận rõ như `B`, `Đáp án: B`, `A,C`, app khôi phục từ dữ liệu đó; một phiếu rõ ràng cũng được chấp nhận. Trường hợp hòa vẫn chưa chấm. Các câu phủ định/nghi vấn không được tự đoán. Đáp án mặc định A của tool cũ được bỏ nếu có đánh dấu “Mặc định A / chưa có bình luận”.

Manifest cũ chỉ có `comments: 1` là **số lượng**, không có nội dung đáp án: không thể suy ra chữ B từ con số này. Trong Luyện tập dùng **Xác nhận / sửa đáp án** sau khi đối chiếu ảnh. Đáp án chỉnh tay lưu vào thư viện và theo bản xuất HTML; không sửa manifest nguồn. Quét lại ảnh không đổi sẽ giữ xác nhận của bạn, ảnh thay đổi cần kiểm tra lại.

## Hai chế độ cho mỗi đề

- **Luyện tập:** bắt buộc kiểm tra từng câu trước khi sang câu tiếp theo; đúng phát tiếng *ting* (có thể bật/tắt) và tự sang câu tiếp sau 0,65 giây; sai dừng lại mở đáp án, số phiếu, bình luận và ảnh ghép. Câu chưa rõ được ghi chưa chấm.
- **Thi thử EOS:** chọn đáp án toàn bài; nộp bài mới mở đáp án và chấm điểm. Có cảnh báo khi chưa chọn hết, xem lại toàn bài / câu sai.
- Có đồng hồ đếm thời gian, chọn một/nhiều đáp án (câu nhiều lựa chọn được đánh dấu nổi bật và hiển thị số đáp án cần chọn nếu biết), 4–6 phương án, phóng ảnh, điều hướng vòng, lọc câu sai/chưa trả lời/chưa rõ.
- Trên desktop: lựa chọn bên trái, câu hỏi ở giữa, điều hướng bên phải. Màn hình nhỏ xếp lại cho dễ đọc.
- Điểm chỉ tính trên câu có đáp án: `số đúng / số câu có đáp án × 10`. Câu chưa trả lời có đáp án vẫn tính sai; câu chưa rõ không bị tự gán A.
- Tiến độ lưu khi thao tác và khi quay về thư viện. Mở lại cùng đề/chế độ có thể tiếp tục lượt dở. Không đảm bảo ghi thao tác cuối nếu trình duyệt bị tắt đột ngột ngay lúc lưu.

Phím tắt: A–F hoặc 1–6 chọn; ← quay lại câu trước; Enter hoặc → kiểm tra và sang câu tiếp trong Luyện tập (trong EOS → sang câu tiếp); R làm lại câu trước khi nộp.

## Xuất cả hai trang để chia sẻ

Mở bộ đề → **Xuất cả hai trang HTML**, chọn thư mục đích. Cả `index.html` (EOS) và `luyen_tap.html` (luyện tập) được tạo cùng lúc. Mỗi file nhúng toàn bộ ảnh và dữ liệu; có thể mở offline độc lập, không cần Python hay máy chủ.

Nút **Tải HTML trực tiếp** cung cấp hai link tải riêng nếu không muốn chọn thư mục. File có thể lớn vì nhúng ảnh. Cài đặt gửi điểm online không được đưa vào bản xuất.

## Kết quả và bảng điểm

Nickname và lịch sử lưu cục bộ. Bảng xếp hạng trên máy có lọc theo đề. Có thể cấu hình URL Google Apps Script của riêng bạn trong Cài đặt và chủ động bật gửi nickname, đề, điểm, thời gian. App không cài sẵn endpoint của repo tham khảo.

Web App online cần hỗ trợ GET trả mảng `{name, exam, score}` và POST text JSON `{name, exam, score, correct, duration, durationSeconds}`. Gửi no-cors không xác nhận được máy chủ đã ghi; lịch sử cục bộ vẫn được giữ. Chưa kiểm thử với endpoint thật của người dùng.

## Kiểm tra và nguồn tham khảo

Đã thử trên trình duyệt với dữ liệu giả: nhập ba đề/hai môn, chia năm, chống trùng, tick chỉ một đề, luyện tập một/nhiều đáp án, câu hòa không chấm, EOS/nộp/ôn sai, lưu qua reload/tiếp tục lượt dở, sửa đáp án và bố cục điều hướng phải. Đã tải được hai HTML xuất và kiểm tra JSON/ảnh nhúng/cú pháp JavaScript. Công cụ browser không cho mở file://, nên chưa kiểm thử tự động thao tác trên file HTML offline bằng file://.

Phần kiểm tra dựa trên dữ liệu giả, không kèm ngân hàng đề. Mã app mới viết độc lập, tham khảo luồng chức năng và định dạng `quiz_data.json` từ https://github.com/DepBo/Tool_EOS_FE. Không thay đổi repo remote và không chạy các script OCR gốc.


## 1.2 — màn hình lớn
Ở viewport từ 1900 CSS pixel (ví dụ màn QHD 27 inch ở scaling 100%), khung học dùng toàn chiều ngang, ảnh bỏ giới hạn 1200px, chữ/nút/cột điều hướng tăng theo chiều rộng. Laptop có viewport nhỏ hơn giữ bố cục cũ. Trình duyệt không đo được kích thước inch thật; Windows Display Scale và browser zoom quyết định số CSS pixel. Dùng Ctrl+0 để về browser zoom 100%. File HTML đã xuất trước đó cần xuất lại để nhận CSS mới.
