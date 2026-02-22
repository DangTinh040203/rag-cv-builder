# Tính Năng So Khớp CV-JD: Ý Tưởng & Thiết Kế

## 1. Vấn Đề

Ứng viên thường nộp đơn xin việc một cách "mù quáng" mà không hiểu tại sao họ lại bị từ chối. Họ thiếu phản hồi khách quan về mức độ phù hợp của CV với Bản Mô Tả Công Việc (JD) cụ thể.

## 2. Ý Tưởng: "Mô Phỏng Nhà Tuyển Dụng AI"

Chúng ta sẽ xây dựng tính năng "Kiểm Tra Độ Phù Hợp" ngay trong trình tạo CV. Nó hoạt động như một Nhà Tuyển Dụng AI tức thì, đọc CV của người dùng và JD mục tiêu, sau đó đưa ra điểm số tương thích và lời khuyên cụ thể.

### Giá Trị Mang Lại

- **Phản Hồi Tức Thì**: Biết ngay vị thế của mình trước khi ứng tuyển.
- **Phân Tích Khoảng Cách (Gap Analysis)**: Nhận diện các từ khóa hoặc kỹ năng còn thiếu.
- **Tùy Chỉnh**: Nhận gợi ý để chỉnh sửa CV cho phù hợp với từng vị trí cụ thể.

## 3. Luồng Người Dùng (User Flow)

1. **Kích Hoạt**: Người dùng nhấn nút "Kiểm Tra Độ Phù Hợp" (Check Match) trên thanh công cụ.
2. **Đầu Vào**: Một cửa sổ hiện ra yêu cầu cung cấp JD.
   - _Chế Độ Văn Bản_: Dán trực tiếp nội dung JD.
   - _Chế Độ Tệp_: Tải lên file JD (PDF/Ảnh/Word).
3. **Xử Lý**:
   - Hệ thống hiển thị hiệu ứng "Đang phân tích..." (tận dụng lại visual AI brain).
   - Backend trích xuất văn bản từ JD và so sánh với dữ liệu JSON của CV hiện tại.
4. **Kết Quả**:
   - **Điểm Số**: Hiển thị phần trăm to, rõ ràng (ví dụ: 75% Phù Hợp).
     - < 50%: Đỏ (Chưa phù hợp)
     - 50-80%: Vàng (Khá)
     - > 80%: Xanh (Rất tốt)
   - **Chi Tiết**: Điểm số cho 5 tiêu chí chính (xem bên dưới).
   - **Từ Khóa Còn Thiếu**: Danh sách các thuật ngữ quan trọng có trong JD nhưng thiếu trong CV.
   - **Mẹo Cải Thiện**: Lời khuyên cụ thể (ví dụ: "Thêm chi tiết về dự án React của bạn").

## 4. Logic So Khớp (Bộ Não)

Logic cốt lõi dựa trên LLM (Gemini) đóng vai trò là người đánh giá không thiên vị. Chúng ta gửi **Dữ Liệu CV** và **Văn Bản JD** cho nó và yêu cầu chấm điểm dựa trên các tiêu chí có trọng số.

### Tiêu Chí Chấm Điểm (Tổng: 100%)

#### A. Kỹ Năng Cứng (Trọng số: 40%) - _Quan Trọng Nhất_

- **Định Nghĩa**: Kỹ năng chuyên môn, ngôn ngữ lập trình, framework, công cụ.
- **Logic Kiểm Tra**:
  - Xác định Tech Stack yêu cầu trong JD (VD: "Phải có: React, Node.js, AWS").
  - Quét phần `Skills`, `Projects`, và mô tả `Work Experience` trong CV.
  - **Phạt**: Trừ điểm nếu thiếu kỹ năng "Must Have".
  - **Thưởng**: Cộng điểm cho kỹ năng "Nice to Have".
  - **Suy Luận Kỹ Năng Ngầm (Implied Skills)**: *Rất quan trọng*.
    - *Ví dụ*: JD yêu cầu **JavaScript/TypeScript**. CV chỉ ghi **ReactJS, Next.js** (kinh nghiệm lâu năm). -> Hệ thống suy luận là ứng viên **ĐÃ BIẾT** JS/TS và vẫn tính điểm tối đa.
    - *Nguyên tắc*: Thành thạo Framework nâng cao đồng nghĩa với việc nắm vững ngôn ngữ nền tảng.

#### B. Kinh Nghiệm & Thâm Niên (Trọng số: 25%)

- **Định Nghĩa**: Số năm kinh nghiệm và sự phù hợp về vai trò.
- **Logic Kiểm Tra**:
  - So sánh "Số năm kinh nghiệm" (VD: JD cần "5+ năm", CV có "2 năm" -> Điểm thấp).
  - So sánh Chức Danh (VD: JD tuyển "Senior", CV là "Junior").

#### C. Kiến Thức Tên Miền (Domain Knowledge) (Trọng số: 20%)

- **Định Nghĩa**: Chuyên môn ngành và các đầu việc cụ thể.
- **Logic Kiểm Tra**:
  - CV có nhắc đến các thuật ngữ ngành không? (VD: "Fintech", "E-commerce", "CI/CD").
  - Các gạch đầu dòng trong `Work Experience` có phản ánh trách nhiệm trong JD không?

#### D. Học Vấn & Chứng Chỉ (Trọng số: 10%)

- **Định Nghĩa**: Bằng cấp chính quy.
- **Logic Kiểm Tra**:
  - Kiểm tra bằng cấp yêu cầu (Cử nhân, Thạc sĩ).
  - Kiểm tra chứng chỉ bắt buộc (VD: "CPA", "AWS Certified").

#### E. Kỹ Năng Mềm & Văn Hóa (Trọng số: 5%)

- **Định Nghĩa**: Đặc điểm hành vi.
- **Logic Kiểm Tra**:
  - Tìm các từ khóa như "Team player", "Remote work", "Leadership".

## 5. Chiến Lược Triển Khai Kỹ Thuật

### A. Xử Lý Đầu Vào (Parser)

- Tái sử dụng logic PDF Parser hiện có để lấy text từ file JD tải lên.
- Với văn bản dán vào thì dùng trực tiếp.

### B. Chiến Lược Prompt (Chống Injection)

- **Vai Trò**: "Chuyên Gia Tuyển Dụng Kỹ Thuật".
- **Đầu Vào**:
  - `CV_JSON`: Dữ liệu cấu trúc của CV.
  - `JD_TEXT`: Văn bản thô của JD.
- **Đầu Ra**: JSON nghiêm ngặt.
- **Phòng Thủ**:
  - System Instruction đặt ở _đầu_ và _cuối_.
  - Nội dung người dùng (CV & JD) được bọc trong thẻ XML (VD: `<cv_content>...</cv_content>`).
  - Yêu cầu mô hình bỏ qua mọi lệnh nằm _trong_ các thẻ XML đó.

### C. Backend API

- **Endpoint**: `POST /api/v1/resumes/match`
- **Payload**:
  - `resumeId`: ID của CV cần so khớp.
  - `jobDescription`: Chuỗi văn bản (tùy chọn).
  - `file`: File nhị phân (tùy chọn).

### D. Frontend UI

- **Quản Lý State**:
  - `isAnalyzing`: Boolean để hiện loading.
  - `matchResult`: Object chứa điểm số và phân tích.
- **Component**:
  - `MatchButton`: Trên thanh toolbar.
  - `MatchModal`: Xử lý nhập liệu và hiện kết quả.
  - `ScoreGauge`: Biểu đồ tròn hiển thị phần trăm.

## 6. Các Trường Hợp Ngoại Lệ (Edge Cases)

- **JD Trống**: Báo lỗi "Vui lòng cung cấp Bản Mô Tả Công Việc".
- **JD Quá Ngắn/Mơ Hồ**: LLM có thể trả về điểm chung chung. Cần nhắc người dùng cung cấp JD chi tiết hơn.
- **JD Khác Ngôn Ngữ**: LLM xử lý đa ngôn ngữ tốt, nhưng cần prompt để nó trả lời cùng ngôn ngữ với CV hoặc JD (ưu tiên Tiếng Việt/Anh tùy đầu vào).
