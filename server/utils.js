import { readFileSync, existsSync } from 'fs';

export function readFileSafe(filePath) {
  try {
    if (existsSync(filePath)) {
      return readFileSync(filePath, 'utf-8');
    }
  } catch (error) {
    console.warn(`Failed to read ${filePath}:`, error.message);
  }
  return '';
}
