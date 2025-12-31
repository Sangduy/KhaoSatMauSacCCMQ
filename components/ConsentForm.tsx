import React, { useState } from 'react';
import { Button } from './Button';
import { saveConsent } from '../services/storageService';

interface ConsentFormProps {
  onAgree: () => void;
}

export const ConsentForm: React.FC<ConsentFormProps> = ({ onAgree }) => {
  const [fullName, setFullName] = useState('');
  const [signatureName, setSignatureName] = useState('');
  const [isChecked, setIsChecked] = useState(false);

  // Tên ký phải khớp với tên đã nhập ở trên
  const isSignatureValid = signatureName.trim().length > 0 && 
                           signatureName.trim().toLowerCase() === fullName.trim().toLowerCase();
  
  const isFormValid = isChecked && isSignatureValid;

  const handleSubmit = () => {
    if (isFormValid) {
      saveConsent(fullName);
      onAgree();
    }
  };

  const inputClasses = "w-full p-3 border border-gray-400 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400";

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-gray-100 mb-8">
      <div className="mb-8 border-b-2 border-gray-100 pb-6">
        <h1 className="text-xl font-bold text-center text-gray-900 mb-6 leading-relaxed">
          BẢN THÔNG TIN DÀNH CHO NGƯỜI THAM GIA NGHIÊN CỨU<br />
          VÀ CHẤP THUẬN THAM GIA NGHIÊN CỨU
        </h1>
        
        <div className="space-y-2 text-sm text-gray-800">
          <p className="text-justify">
            <span className="font-bold">Tên nghiên cứu:</span> KHẢO SÁT MỐI LIÊN QUAN GIỮA THỂ CHẤT Y HỌC CỔ TRUYỀN VÀ ĐẶC ĐIỂM MÀU SẮC DA SAU KHI THỰC HIỆN KỸ THUẬT KHÍ GIÁC HUYỆT THẬN DU VÀ ĐẠI TRƯỜNG DU TRÊN SINH VIÊN KHOẺ MẠNH.
          </p>
          <p><span className="font-bold">Nhà tài trợ:</span> Không</p>
          <p><span className="font-bold">Nghiên cứu viên chính:</span> Nguyễn Duy Phước Sang</p>
          <p><span className="font-bold">Giảng viên hướng dẫn:</span> ThS. Hạ Chí Lộc; ThS. Phạm Linh Đan</p>
          <p><span className="font-bold">Đơn vị chủ trì:</span> Khoa Y học cổ truyền, Đại học Y Dược Thành phố Hồ Chí Minh</p>
          <p><span className="font-bold">Thời gian thực hiện:</span> từ tháng 12/2025 đến tháng 3 năm 2026</p>
        </div>
      </div>

      <div className="prose prose-sm max-w-none text-gray-700 h-[50vh] overflow-y-auto border border-gray-200 rounded-lg p-6 bg-gray-50 mb-6 text-justify">
        <p className="mt-2">Kính chào Anh/Chị,</p>
        <p>
          Tôi là Nguyễn Duy Phước Sang, hiện đang là sinh viên tại Khoa Y học cổ truyền của Đại học Y dược TP. Hồ Chí Minh.
          Chúng tôi muốn mời Anh/Chị cùng tham gia vào nghiên cứu của chúng tôi. Trước khi Anh/Chị quyết định có tham gia vào nghiên cứu hay không, chúng tôi mời Anh/Chị tìm hiểu các thông tin liên quan đến nghiên cứu. Trong bản thông tin này, có thể có những thuật ngữ chuyên môn khó hiểu và Anh/Chị có thể đặt câu hỏi để hiểu rõ thêm, thảo luận hoặc có thể trao đổi thêm, xin đừng do dự hỏi chúng tôi. Chúng tôi luôn sẵn lòng để trả lời mọi thắc mắc của Anh/Chị. Xin Anh/Chị hãy dành thời gian đọc và suy nghĩ kỹ trước khi đồng ý hoặc không đồng ý tham gia vào nghiên cứu. Cảm ơn Anh/Chị đã đọc bản thông tin sau:
        </p>

        <h3 className="text-lg font-bold mt-4 text-blue-800">I. THÔNG TIN VỀ NGHIÊN CỨU</h3>
        
        <h4 className="font-bold mt-2">1. Mục tiêu nghiên cứu</h4>
        <p>
          Theo Y học cổ truyền, màu sắc vết sung huyết sau giác hơi phản ánh thể chất của mỗi người, giúp định hướng rèn luyện và điều trị phù hợp. Do đó, nghiên cứu này được thực hiện nhằm tìm hiểu mối liên quan giữa thể chất và màu sắc của vết giác.
          <br />
          <strong>Mục đích của nghiên cứu:</strong> Khảo sát mối liên quan giữa thể chất Y học cổ truyền và màu sắc của vết giác hơi thông qua 2 chỉ số đo da (Erythema Index, EI) và nồng độ sắc tố Melanin (Melanin Index, MI).
        </p>

        <h4 className="font-bold mt-2">2. Tiến hành nghiên cứu</h4>
        <p>- Nhóm nghiên cứu sẽ giải thích về quy trình nghiên cứu và sẽ ký vào giấy đồng thuận nếu chấp thuận tham gia.</p>
        <p><strong>Đối tượng tham gia:</strong> Sinh viên Đại học Y Dược TP.HCM.</p>
        <p>Anh/Chị sẽ thực hiện bảng câu hỏi nghiên cứu trực tuyến trên website. Sau khi được giải đáp các thắc mắc liên quan, Anh/Chị vui lòng tiến hành trả lời các câu hỏi về thể chất (CCMQ). Bảng câu hỏi này bao gồm 2 phần:</p>
        <ul className="list-disc pl-5">
          <li>Phần 1: Thông tin cá nhân.</li>
          <li>Phần 2: Bảng câu hỏi về thể chất Y học cổ truyền (60 câu hỏi).</li>
        </ul>
        <p>Quy trình thực hiện tiếp theo gồm:</p>
        <ol className="list-decimal pl-5">
          <li><strong>Sàng lọc & Thực hiện:</strong> Dựa trên điểm CCMQ, bác sĩ sẽ thăm khám và thực hiện khí giác 10 phút tại vùng thắt lưng cho người đủ điều kiện.</li>
          <li><strong>Thu thập dữ liệu:</strong> Anh/Chị sẽ làm khảo sát cảm giác và được chụp ảnh vùng lưng 3 lần (trước, ngay sau, 10 phút sau khi giác) để phân tích, cam kết che mặt và vùng nhạy cảm, chỉ bộc lộ vùng thắt lưng.</li>
          <li><strong>Theo dõi:</strong> Anh/Chị theo dõi thời gian tan dấu giác và thông báo lại cho chúng tôi qua thông tin liên hệ ở dưới. Chúng tôi xin phép liên lạc với Anh/Chị dựa trên thông tin liên lạc Anh/Chị cung cấp để lấy thông tin trong trường hợp Anh/Chị quên không báo lại.</li>
        </ol>
        <p>Chúng tôi sẽ cung cấp thêm thông tin liên quan đến bảng điểm số, các thông số màu sắc da nếu anh/chị cần hiểu thêm.</p>
        <p>Các dữ liệu về bảng CCMQ, thông tin hình ảnh, được sử dụng để phân tích trong nghiên cứu của chúng tôi để trả lời câu hỏi nghiên cứu và đáp ứng mục đích nghiên cứu.</p>

        <h4 className="font-bold mt-2">3. Các bất lợi tham gia nghiên cứu</h4>
        <p>Anh/Chị mất khoảng 40 phút để trả lời bảng câu hỏi trong biểu mẫu khảo sát và thực hiện thủ thuật.</p>
        <p>Giác hơi theo nhiều nghiên cứu thử nghiệm lâm sàng và tổng hợp cho thấy là một kỹ thuật tương đối an toàn, ít tác dụng phụ. Anh/Chị sẽ xuất hiện vết đỏ da tại vùng giác tồn tại trong khoảng 14 ngày. Anh/Chị có thể cảm thấy ngứa, hơi căng tức vùng da giác hơi nhưng sẽ tự hết sau khoảng 2 ngày. Một số ít trường hợp có thể xảy ra phản ứng "vựng giác" (cảm giác hoa mắt, chóng mặt, vã mồ hôi, buồn nôn, ngất xỉu..) tỉ lệ thường rất thấp, tuy nhiên chúng tôi sẽ kiểm tra xem Anh/Chị có phù hợp để thực hiện không và trong quá trình thực hiện luôn theo dõi, xử lý kịp thời các tình huống ngoài ý muốn trong quá trình thực hiện nghiên cứu.</p>
        <p>Ngoài điều nêu trên, không còn tác động nào khác.</p>

        <h4 className="font-bold mt-2">4. Lợi ích</h4>
        <p>Sau khi có kết quả phân tích. Anh/Chị được thông báo kết quả thể chất của Anh/Chị cũng như được tư vấn về những vấn đề liên quan đến thể chất của mình. Về mặt tinh thần, Anh/Chị đã đóng góp rất to lớn tạo cơ sở khoa học để ứng dụng trong lâm sàng, giảng dạy và cũng như tạo tiền đề cho các nghiên cứu sau này.</p>
        <p>Anh/Chị sẽ không nhận được khoản kinh phí nào khi tham gia vào giai đoạn nghiên cứu này.</p>
        <p><strong>- Bồi thường:</strong> chúng tôi sẽ luôn theo dõi, xử lý kịp thời các tình huống ngoài ý muốn trong quá trình thực hiện nghiên cứu. Trong trường hợp xảy ra biến chứng, tất cả các chi phí điều trị liên quan đều hoàn toàn miễn phí. Từ chối việc trả chi phí theo dõi và điều trị rủi ro do không tuân thủ hướng dẫn của chúng tôi trong suốt quá trình nghiên cứu.</p>
        <p><strong>- Sự tự nguyện:</strong> việc tham gia nghiên cứu là hoàn toàn tự nguyện. Trước khi quyết định tham gia, chúng tôi sẽ gửi bản thông tin này và Anh/Chị sẽ đọc và quyết định ký vào giấy tự nguyện tham gia. Trong thời gian nghiên cứu sau khi đã ký, Anh/Chị vẫn có thể thay đổi quyết định hoặc ngưng tham gia bất kì lúc nào.</p>
        <p><strong>- Bảo mật:</strong> Chúng tôi dự kiến sẽ công bố kết quả cuộc nghiên cứu này nhưng sẽ không công khai bất kỳ thông tin nào về bản thân Anh/Chị. Mọi thông tin thu thập được có liên quan đến Anh/Chị trong suốt quá trình nghiên cứu sẽ được giữ bí mật. Cụ thể: Nghiên cứu không thu thập những thông tin liên quan cụ thể đến đời tư của anh/chị. Thông tin liên quan đến Anh/Chị sẽ được viết tắt hoặc mã hóa.</p>
        <p>Các thông tin trong nghiên cứu sẽ được đưa vào máy tính có mật mã và cài mật mã để đảm bảo tính bảo mật cao, hồ sơ được cất giữ vào tủ có khóa. Để đảm bảo sự bảo mật, các thông tin của Anh/Chị sẽ được mã hóa và không công bố trên bất kỳ văn bản công khai.</p>
        <p>Ngoài những người trong nhóm nghiên cứu, dữ liệu nghiên cứu có thể sẽ có một số người khác biết đến thông tin mà Anh/Chị cung cấp. Họ bao gồm các tổ chức đảm bảo tính an toàn, hợp lệ của nghiên cứu như Hội đồng Khoa học, Hội đồng Y đức của Đại học Y Dược thành phố Hồ Chí Minh.</p>

        <h4 className="font-bold mt-2">5. Thông tin liên hệ:</h4>
        <p>Nếu Anh/ Chị có câu hỏi thắc mắc hoặc ý kiến, có thể liên hệ với:</p>
        <p>Nghiên cứu viên: Nguyễn Duy Phước Sang</p>
        <p>+ Số điện thoại: 0941238203 Email: ndpsang.yhct20@ump.edu.vn</p>

        <h3 className="text-lg font-bold mt-6 pt-4 border-t border-gray-300 text-blue-800">II. CHẤP THUẬN THAM GIA NGHIÊN CỨU</h3>
        <p className="italic">
          Tôi đã đọc và hiểu thông tin trên đây, đã có cơ hội xem xét và đặt câu hỏi về thông tin liên quan đến nội dung trong nghiên cứu này. Tôi đã nói chuyện trực tiếp với nghiên cứu viên và được trả lời thỏa đáng tất cả các câu hỏi. Tôi nhận một bản sao của Bản Thông tin cho người tình nguyện tham gia nghiên cứu và chấp thuận tham gia nghiên cứu này. Tôi tự nguyện đồng ý tham gia.
        </p>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg border border-gray-300">
        <h4 className="font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2">XÁC NHẬN ĐỒNG THUẬN</h4>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Họ và tên của bạn:
          </label>
          <input 
            type="text" 
            className={inputClasses + " mb-4"}
            placeholder="Nhập họ và tên đầy đủ..."
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <label className="flex items-start gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              disabled={!fullName}
            />
            <span className={`text-sm text-gray-800 leading-relaxed ${!fullName ? 'opacity-50' : ''}`}>
              Tôi, <strong>{fullName || '...'}</strong>, xác nhận rằng tôi đã đọc toàn bộ bản thông tin trên đây, được giải thích cặn kẽ và hiểu rõ bản chất, các nguy cơ và lợi ích. Tôi tự nguyện đồng ý tham gia nghiên cứu này.
            </span>
          </label>
        </div>

        {isChecked && fullName && (
          <div className="mb-6 animate-in fade-in duration-300">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chữ ký điện tử (Vui lòng nhập lại chính xác Họ và Tên):
            </label>
            <input 
              type="text" 
              className={inputClasses}
              placeholder={`Nhập chính xác: ${fullName}`}
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
            />
            {!isSignatureValid && signatureName && (
              <p className="text-red-500 text-xs mt-1">Họ tên nhập vào chưa khớp.</p>
            )}
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-gray-300">
           <div className="text-xs text-gray-500">
             Ngày: {new Date().toLocaleDateString('vi-VN')}
           </div>
           <Button 
              variant="primary" 
              onClick={handleSubmit} 
              disabled={!isFormValid}
              className={!isFormValid ? "opacity-50 cursor-not-allowed bg-gray-400" : "bg-blue-700 hover:bg-blue-800"}
            >
              Ký tên & Tiếp tục
            </Button>
        </div>
      </div>
    </div>
  );
};