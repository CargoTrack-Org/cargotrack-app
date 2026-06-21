import dotenv from 'dotenv';
dotenv.config();

if (!process.env.DATABASE_URL) {
  const host = process.env.DATABASE_HOST || 'localhost';
  const port = process.env.DATABASE_PORT || '5432';
  const name = process.env.DATABASE_NAME || 'cargotrack';
  const user = process.env.DATABASE_USER || 'cargotrack';
  const password = process.env.DATABASE_PASSWORD || 'cargotrack123';
  process.env.DATABASE_URL = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${name}?schema=public`;
}

export const config = {
  port: parseInt(process.env.PORT || '4001', 10),
  // JWT secret used only to VERIFY tokens issued by core-service.
  // Document service never issues tokens.
  jwtSecret: process.env.JWT_SECRET || 'cargotrack-secret-key-change-in-production',
  uploadDir: process.env.UPLOAD_DIR || '/uploads',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  nodeEnv: process.env.NODE_ENV || 'development',
  serviceName: 'document-service',
};
