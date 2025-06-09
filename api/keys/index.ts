import { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';

// 临时模拟数据库存储，实际生产环境请使用真正的数据库
interface ActivationKey {
  id: string;
  key: string;
  prefix: string;
  suffix: string;
  status: 'inactive' | 'active' | 'expired';
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  deviceId?: string;
  validDays: number;
}

// 模拟数据，每次冷启动都会重置
let keys: ActivationKey[] = [
  {
    id: uuidv4(),
    key: "DEMO-KEY-001",
    prefix: "DEMO-",
    suffix: "-001",
    createdAt: new Date().toISOString(),
    expiresAt: "",
    status: "inactive",
    validDays: 30,
  },
  {
    id: uuidv4(),
    key: "TEST-KEY-002",
    prefix: "TEST-",
    suffix: "-002",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5天前创建
    expiresAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(), // 还有25天过期
    status: "active",
    validDays: 30,
  },
  {
    id: uuidv4(),
    key: "EXPIRED-KEY-003",
    prefix: "EXPIRED-",
    suffix: "-003",
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60天前创建
    expiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10天前过期
    status: "expired",
    validDays: 30,
  },
];


export default function handler(request: VercelRequest, response: VercelResponse) {
  // 根据请求方法处理不同的操作
  if (request.method === 'GET') {
    // 获取所有卡密
    return response.status(200).json(keys);
  } else if (request.method === 'POST') {
    // 这里可以添加生成卡密的逻辑
    // 假设接收一个包含 `count`, `prefix`, `suffix`, `validDays` 的请求体
    const { count, prefix, suffix, validDays } = request.body;

    if (!count || count <= 0) {
      return response.status(400).json({ success: false, message: 'Invalid count' });
    }

    const newKeys: ActivationKey[] = [];
    for (let i = 0; i < count; i++) {
      const key = `${prefix || ''}${uuidv4().slice(0, 8).toUpperCase()}${suffix || ''}`; // 简化生成
      newKeys.push({
        id: uuidv4(),
        key,
        prefix: prefix || '',
        suffix: suffix || '',
        createdAt: new Date().toISOString(),
        expiresAt: '', // 初始为空，激活时设置
        status: 'inactive',
        validDays: validDays || 1,
      });
    }

    keys = [...newKeys, ...keys]; // 将新生成的卡密添加到现有卡密列表
    return response.status(200).json({ success: true, message: `成功生成 ${count} 个卡密`, newKeys });

  } else if (request.method === 'DELETE') {
    // 处理删除卡密（例如批量删除）
    const { ids } = request.body; // ids 应该是一个卡密ID数组

    if (!Array.isArray(ids) || ids.length === 0) {
      return response.status(400).json({ success: false, message: '请提供要删除的卡密ID' });
    }

    const initialLength = keys.length;
    keys = keys.filter(key => !ids.includes(key.id));
    const deletedCount = initialLength - keys.length;

    if (deletedCount > 0) {
      return response.status(200).json({ success: true, message: `成功删除 ${deletedCount} 个卡密` });
    } else {
      return response.status(404).json({ success: false, message: '未找到要删除的卡密' });
    }
  }
  
  response.status(405).json({ message: 'Method Not Allowed' });
} 