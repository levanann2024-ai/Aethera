export type PracticeQuestion = {
  id: string;
  prompt: string;
  audioLabel: string;
  options: string[];
  answer: string;
  explanation: string;
};

export type TranslationHistoryItem = {
  id: string;
  source: string;
  meaning: string;
  language: 'Tày' | 'Mường';
  time: string;
  matchedWords: number;
};

export type NewsArticle = {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  content: string[];
  date: string;
  readTime: string;
  accent: 'mint' | 'sun' | 'sky';
};

export const mockPracticeQuestions: PracticeQuestion[] = [
  {
    id: 'practice-1',
    prompt: '“Nương rẫy” là gì?',
    audioLabel: 'Nghe câu hỏi',
    options: ['Đất canh tác ở vùng đồi núi', 'Nhà ở', 'Cái chợ', 'Con sông'],
    answer: 'Đất canh tác ở vùng đồi núi',
    explanation: 'Nương rẫy là khu đất canh tác, thường ở vùng đồi núi.',
  },
  {
    id: 'practice-2',
    prompt: 'Từ nào phù hợp với câu: “Em ___ đúng giờ mỗi sáng.”?',
    audioLabel: 'Nghe câu hỏi',
    options: ['đi học', 'ngôi nhà', 'bà', 'nước'],
    answer: 'đi học',
    explanation: '“Đi học” là cụm động từ phù hợp với hoạt động đến trường.',
  },
  {
    id: 'practice-3',
    prompt: '“nhà” thuộc nhóm từ nào?',
    audioLabel: 'Nghe câu hỏi',
    options: ['Danh từ', 'Động từ', 'Tính từ', 'Câu hỏi'],
    answer: 'Danh từ',
    explanation: '“Nhà” là danh từ, dùng để gọi tên nơi ở hoặc một địa điểm.',
  },
];

export const mockHistory: TranslationHistoryItem[] = [
  { id: 'history-1', source: 'Chào buổi sáng', meaning: 'Lời chào thân thiện khi bắt đầu ngày mới.', language: 'Tày', time: '09:42', matchedWords: 2 },
  { id: 'history-2', source: 'Bữa cơm gia đình', meaning: 'Chủ đề từ vựng về sinh hoạt và gia đình.', language: 'Mường', time: 'Hôm qua', matchedWords: 4 },
  { id: 'history-3', source: 'Đi chợ cùng bà', meaning: 'Cụm luyện đọc về một hoạt động thường ngày.', language: 'Tày', time: 'Thứ 3', matchedWords: 3 },
];

export const mockAiSuggestions = [
  {
    title: 'Tách câu thành cụm ngắn',
    body: 'Thử chia câu thành từng cụm ý rồi tra riêng từng phần. Cách này giúp bạn đối chiếu kết quả với ngữ cảnh.',
    tag: 'Gợi ý học',
  },
  {
    title: 'Đối chiếu từ điển đã kiểm chứng',
    body: 'Ưu tiên các mục từ đã được nhóm xác nhận. Nếu chưa có kết quả, hãy hỏi người nói bản ngữ thay vì tự suy đoán.',
    tag: 'Kiểm chứng',
  },
  {
    title: 'Lưu lại từ mới',
    body: 'Ghi câu gốc, nghĩa tiếng Việt và một ví dụ do người nói xác nhận để ôn tập lần sau.',
    tag: 'Bước tiếp theo',
  },
];

export const mockNewsArticles: NewsArticle[] = [
  {
    id: 'story-1',
    category: 'Góc học tập',
    title: 'Học một từ mới bắt đầu từ câu chuyện quanh mình',
    excerpt: 'Một câu nói trong bữa cơm hay trên đường đến trường có thể mở ra cả một nhóm từ vựng gần gũi.',
    content: [
      'Từ ngữ thường gắn với người, nơi chốn và những việc ta làm mỗi ngày. Thay vì học một danh sách dài, hãy bắt đầu bằng một câu ngắn mà bạn thường nghe.',
      'Ghi lại ngữ cảnh, hỏi người nói về cách dùng, rồi tra từng cụm trong từ điển đã được kiểm chứng. Những chi tiết nhỏ ấy giúp việc ôn tập có ý nghĩa hơn.',
    ],
    date: 'Góc biên tập · 5 phút đọc',
    readTime: '5 phút',
    accent: 'mint',
  },
  {
    id: 'story-2',
    category: 'Cẩm nang',
    title: 'Ba bước để ghi chép từ vựng dễ nhớ hơn',
    excerpt: 'Ghi từ, nghĩa và ví dụ cùng nhau để sổ tay học tập trở thành một phần của câu chuyện.',
    content: [
      'Một ghi chú hữu ích có thể rất ngắn: từ hoặc cụm từ, nghĩa được xác nhận, và câu ví dụ từ người nói. Đừng quên ghi cả phương ngữ để dễ đối chiếu.',
      'Cuối buổi học, chọn vài mục để ôn lại. Nếu chưa chắc nghĩa, đánh dấu cần xác minh thay vì biến phỏng đoán thành kiến thức.',
    ],
    date: 'Góc biên tập · 3 phút đọc',
    readTime: '3 phút',
    accent: 'sun',
  },
  {
    id: 'story-3',
    category: 'Cộng đồng',
    title: 'Giữ tiếng nói địa phương trong lớp học hôm nay',
    excerpt: 'Cùng tạo không gian để học sinh chia sẻ cách nói ở quê mình và học hỏi lẫn nhau.',
    content: [
      'Mỗi gia đình có thể lưu giữ cách phát âm, cách gọi và lối kể chuyện riêng. Khi được chia sẻ trong không khí tôn trọng, những khác biệt ấy trở thành chất liệu học tập quý giá.',
      'Hãy mời người nói bản ngữ cùng xem lại từ và ví dụ trước khi đưa vào tài liệu. Aethera giúp sắp xếp việc tra cứu và ôn tập; sự xác nhận của cộng đồng vẫn là điều cốt lõi.',
    ],
    date: 'Góc biên tập · 4 phút đọc',
    readTime: '4 phút',
    accent: 'sky',
  },
];
