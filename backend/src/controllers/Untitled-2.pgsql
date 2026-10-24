
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),          -- Dành cho login email/pass
    full_name VARCHAR(100),
    avatar_url VARCHAR(255),
    
    -- TRƯỜNG QUAN TRỌNG M ĐANG HỎI NÈ:
    -- Mặc định để 'tay', hoặc 'all' (Tất cả), hoặc NULL nếu chưa chọn
    target_language VARCHAR(10) DEFAULT 'tay' REFERENCES languages(code) ON DELETE SET NULL,
    
    -- Nếu muốn mở rộng lưu nhiều ngôn ngữ quan tâm (mảng string, ví dụ: ['tay', 'muong'])
    interested_languages TEXT[] DEFAULT ARRAY['tay'], 
    
    role VARCHAR(20) DEFAULT 'user',     -- 'user', 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS languages (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

INSERT INTO languages (code, name) VALUES
('tay', 'Tiếng Tày'),
('muong', 'Tiếng Mường'),
('hmong', 'Tiếng H''Mông'),
('dao', 'Tiếng Dao')
ON CONFLICT (code) DO NOTHING;