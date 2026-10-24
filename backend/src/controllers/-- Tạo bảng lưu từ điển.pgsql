-- Tạo bảng lưu từ điển
CREATE TABLE IF NOT EXISTS vocabulary (
  id SERIAL PRIMARY KEY,
  word VARCHAR(255) UNIQUE NOT NULL,
  meanings JSONB NOT NULL
);

-- Tạo GIN Index để tối ưu tìm kiếm JSONB cực nhanh dưới 1-2ms
CREATE INDEX IF NOT EXISTS idx_vocabulary_meanings_gin ON vocabulary USING GIN (meanings);