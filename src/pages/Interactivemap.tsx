import vietnamMap from '@/components/VietnamMap.png';

export function Interactivemap() {
  return (
    <div
      style={{
        width: '100%',
        height: 'calc(100vh - 120px)', // Đổi từ minHeight sang height cố định để không bị đẩy khung
        backgroundImage: `url(${vietnamMap})`,
        backgroundSize: 'contain', // ĐỔI TỪ 'cover' SANG 'contain' ĐỂ ẢNH CO GỌN TRONG KHUNG
        backgroundPosition: 'center top', // Đẩy bản đồ căn giữa và sát lên phía trên
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}
54