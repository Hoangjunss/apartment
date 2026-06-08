import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Tự động tải các biến môi trường từ file .env ở thư mục gốc hoặc thư mục cha gần nhất
function loadEnv() {
  let currentDir = __dirname;
  while (currentDir) {
    const envPath = path.join(currentDir, '.env');
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split(/\r?\n/).forEach(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return;
          const firstEquals = trimmed.indexOf('=');
          if (firstEquals === -1) return;
          const key = trimmed.slice(0, firstEquals).trim();
          let val = trimmed.slice(firstEquals + 1).trim();
          
          // Loại bỏ dấu nháy kép hoặc nháy đơn bao quanh giá trị
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          
          if (key && !process.env[key]) {
            process.env[key] = val;
          }
        });
      } catch (e) {
        console.warn(`Warning: Could not read .env at ${envPath}:`, e.message);
      }
      break;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }
}

loadEnv();

const requiredEnv = ["JWT_SECRET", "JWT_REFRESH_SECRET", "DATABASE_URL"];

for (const key of requiredEnv) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`CRITICAL ERROR: Environment variable '${key}' is missing!`);
  }
  if (key.startsWith("JWT_") && value.length < 32) {
    throw new Error(`CRITICAL ERROR: Environment variable '${key}' must be at least 32 characters long!`);
  }
}

