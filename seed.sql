-- ============================================
-- NEXUS - Datos Iniciales
-- ============================================

-- Admin initial password: nexus2024
-- Hash generated with bcrypt
INSERT OR IGNORE INTO users (dni, nombre, apellido, password_hash, role) 
VALUES ('00000000', 'Administrador', 'Sistema', '$2a$10$xVqYLGzrJlR0rCjBkTq5YOQXQXQXQXQXQXQXQXQXQXQXQXQXQX', 'admin');
