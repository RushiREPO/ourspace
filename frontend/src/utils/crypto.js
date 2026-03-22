import CryptoJS from 'crypto-js';

// Derive encryption key from user ID and password
// Both users know each other's password, so they can derive the same key
export const deriveKey = (userId, password) => {
  return CryptoJS.PBKDF2(`${userId}:${password}`, 'couple-chat-salt', {
    keySize: 256 / 32,
    iterations: 1000
  }).toString();
};

// Encrypt message text
export const encryptMessage = (text, encryptionKey) => {
  try {
    const encrypted = CryptoJS.AES.encrypt(text, encryptionKey).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
};

// Decrypt message text
export const decryptMessage = (encryptedText, encryptionKey) => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedText, encryptionKey);
    const text = decrypted.toString(CryptoJS.enc.Utf8);
    return text;
  } catch (error) {
    console.error('Decryption error:', error);
    return '[Unable to decrypt message - wrong key or corrupted data]';
  }
};

// Encrypt file data
export const encryptFile = (fileData, encryptionKey) => {
  try {
    const encrypted = CryptoJS.AES.encrypt(fileData, encryptionKey).toString();
    return encrypted;
  } catch (error) {
    console.error('File encryption error:', error);
    return null;
  }
};

// Decrypt file data
export const decryptFile = (encryptedData, encryptionKey) => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    const text = decrypted.toString(CryptoJS.enc.Utf8);
    return text;
  } catch (error) {
    console.error('File decryption error:', error);
    return null;
  }
};
