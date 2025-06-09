import { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
const prisma = require('../../lib/prisma');

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

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method === 'GET') {
    try {
      const keys = await prisma.activationKey.findMany({
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      return response.status(200).json({
        success: true,
        data: keys
      });
    } catch (error) {
      console.error('Error fetching keys:', error);
      return response.status(500).json({
        success: false,
        message: '获取卡密列表失败'
      });
    }
  }

  if (request.method === 'POST') {
    const { count = 1, prefix = '', suffix = '', validDays = 30 } = request.body;

    if (count < 1 || count > 100) {
      return response.status(400).json({
        success: false,
        message: '生成数量必须在1-100之间'
      });
    }

    try {
      const newKeys = [];
      for (let i = 0; i < count; i++) {
        // 生成25位卡密，包含前缀和后缀
        const baseUuid = uuidv4().replace(/-/g, ''); // 移除UUID中的连字符
        const prefixLength = prefix ? prefix.length : 0;
        const suffixLength = suffix ? suffix.length : 0;
        const neededRandomLength = Math.max(0, 25 - prefixLength - suffixLength);
        const randomPart = baseUuid.slice(0, neededRandomLength);

        const key = `${prefix || ''}${randomPart}${suffix || ''}`;
        
        const newKey = await prisma.activationKey.create({
          data: {
            key,
            prefix: prefix || null,
            suffix: suffix || null,
            validDays
          }
        });
        
        newKeys.push(newKey);
      }

      return response.status(200).json({
        success: true,
        message: '卡密生成成功',
        data: newKeys
      });
    } catch (error) {
      console.error('Error generating keys:', error);
      return response.status(500).json({
        success: false,
        message: '生成卡密失败'
      });
    }
  }

  if (request.method === 'DELETE') {
    const { ids } = request.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return response.status(400).json({
        success: false,
        message: '请提供要删除的卡密ID列表'
      });
    }

    try {
      await prisma.activationKey.deleteMany({
        where: {
          id: {
            in: ids
          }
        }
      });

      return response.status(200).json({
        success: true,
        message: '卡密删除成功'
      });
    } catch (error) {
      console.error('Error deleting keys:', error);
      return response.status(500).json({
        success: false,
        message: '删除卡密失败'
      });
    }
  }

  return response.status(405).json({ message: 'Method Not Allowed' });
} 