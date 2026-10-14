export type SubtitleCue = {
  start: number;
  end: number;
  native: string;
  vietnamese: string;
};

const MOCK_CUES: SubtitleCue[] = [
  { start: 1, end: 3, native: 'Bửu pông hảm', vietnamese: 'Cháu đừng lo lắng' },
  { start: 4, end: 6, native: 'Nòng ma giễn pỏm xưởn', vietnamese: 'Hãy vào đây cùng nhau trò chuyện' },
];

// Giả lập AI: chờ 3 giây rồi trả về phụ đề mẫu. Thay hàm này bằng lệnh gọi API thật khi có backend.
export function generateMockSubtitles(file: File): Promise<SubtitleCue[]> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('video/')) {
      reject(new Error('Tệp không phải video.'));
      return;
    }
    window.setTimeout(() => resolve(MOCK_CUES.map((cue) => ({ ...cue }))), 3000);
  });
}

// Tìm câu đang hiển thị bằng tìm kiếm nhị phân; cues phải được sắp theo thời gian bắt đầu.
export function findCueIndex(cues: SubtitleCue[], time: number): number {
  let low = 0;
  let high = cues.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (cues[mid].start <= time) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found >= 0 && time < cues[found].end ? found : -1;
}
