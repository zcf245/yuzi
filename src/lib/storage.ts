import { ActivationKey, ActivationRecord, ApiKey, ApiLog } from '../types';

class Storage {
  private static instance: Storage;
  private constructor() {}

  static getInstance(): Storage {
    if (!Storage.instance) {
      Storage.instance = new Storage();
    }
    return Storage.instance;
  }

  // 卡密记录相关方法
  getActivationRecords(): ActivationRecord[] {
    const records = localStorage.getItem('activationRecords');
    return records ? JSON.parse(records) : [];
  }

  addActivationRecord(record: ActivationRecord): void {
    const records = this.getActivationRecords();
    records.push(record);
    localStorage.setItem('activationRecords', JSON.stringify(records));
  }

  // API密钥相关方法
  getApiKeys(): ApiKey[] {
    const keys = localStorage.getItem('apiKeys');
    return keys ? JSON.parse(keys) : [];
  }

  addApiKey(apiKey: ApiKey): void {
    const keys = this.getApiKeys();
    keys.push(apiKey);
    localStorage.setItem('apiKeys', JSON.stringify(keys));
  }

  updateApiKey(apiKey: ApiKey): void {
    const keys = this.getApiKeys();
    const index = keys.findIndex(k => k.id === apiKey.id);
    if (index !== -1) {
      keys[index] = apiKey;
      localStorage.setItem('apiKeys', JSON.stringify(keys));
    }
  }

  // API日志相关方法
  getApiLogs(): ApiLog[] {
    const logs = localStorage.getItem('apiLogs');
    return logs ? JSON.parse(logs) : [];
  }

  addApiLog(log: ApiLog): void {
    const logs = this.getApiLogs();
    logs.push(log);
    localStorage.setItem('apiLogs', JSON.stringify(logs));
  }

  // 卡密批量操作
  batchUpdateKeys(keys: ActivationKey[]): void {
    const existingKeys = JSON.parse(localStorage.getItem('keys') || '[]');
    const updatedKeys = existingKeys.map((existingKey: ActivationKey) => {
      const updatedKey = keys.find(k => k.id === existingKey.id);
      return updatedKey || existingKey;
    });
    localStorage.setItem('keys', JSON.stringify(updatedKeys));
  }

  batchDeleteKeys(keyIds: string[]): void {
    const existingKeys = JSON.parse(localStorage.getItem('keys') || '[]');
    const updatedKeys = existingKeys.filter((key: ActivationKey) => !keyIds.includes(key.id));
    localStorage.setItem('keys', JSON.stringify(updatedKeys));
  }

  // 检查过期卡密
  checkExpiredKeys(): void {
    const keys = JSON.parse(localStorage.getItem('keys') || '[]');
    const now = new Date().getTime();
    const updatedKeys = keys.map((key: ActivationKey) => {
      if (new Date(key.expiresAt).getTime() < now && key.status !== 'used') {
        return { ...key, status: 'expired' };
      }
      return key;
    });
    localStorage.setItem('keys', JSON.stringify(updatedKeys));
  }
}

export const storage = Storage.getInstance(); 