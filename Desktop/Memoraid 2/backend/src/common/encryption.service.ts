import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Сервис для шифрования sensitive данных
 * Использует AES-256-GCM для симметричного шифрования
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    if (keyHex.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes for AES-256)');
    }
    this.key = Buffer.from(keyHex, 'hex');
  }

  /**
   * Шифрует текст
   * @param text Текст для шифрования
   * @returns Зашифрованная строка в формате iv:authTag:encrypted
   */
  encrypt(text: string): string {
    if (!text) {
      return text;
    }

    const iv = crypto.randomBytes(16); // Initialization Vector (16 байт для GCM)
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag(); // Authentication tag для GCM

    // Формат: iv:authTag:encrypted (все в hex)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Расшифровывает текст
   * @param encrypted Зашифрованная строка в формате iv:authTag:encrypted
   * @returns Расшифрованный текст
   */
  decrypt(encrypted: string): string {
    if (!encrypted) {
      return encrypted;
    }

    try {
      const parts = encrypted.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted format');
      }

      const [ivHex, authTagHex, encryptedHex] = parts;

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Проверяет, является ли строка зашифрованной
   * @param text Строка для проверки
   * @returns true если строка зашифрована
   */
  isEncrypted(text: string): boolean {
    if (!text) return false;
    const parts = text.split(':');
    return parts.length === 3 && parts.every(part => /^[0-9a-f]+$/i.test(part));
  }
}

