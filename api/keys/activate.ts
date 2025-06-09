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
// 注意：这个 `keys` 数组应该与 `api/keys/index.ts` 中的数据来源一致
// 在实际数据库中，您会从数据库中获取并更新数据
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
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const { key: activationKey, deviceId } = request.body;

  if (!activationKey) {
    return response.status(400).json({ success: false, message: '请提供卡密' });
  }

  const targetKeyIndex = keys.findIndex(k => k.key === activationKey);

  if (targetKeyIndex === -1) {
    return response.status(404).json({ success: false, message: '卡密不存在' });
  }

  const targetKey = keys[targetKeyIndex];

  if (targetKey.status === 'active') {
    return response.status(400).json({ success: false, message: '卡密已被激活' });
  }

  if (targetKey.status === 'expired') {
    return response.status(400).json({ success: false, message: '卡密已过期' });
  }

  // 激活卡密并设置过期时间
  const updatedKey: ActivationKey = {
    ...targetKey,
    status: 'active',
    expiresAt: new Date(Date.now() + (targetKey.validDays || 1) * 24 * 60 * 60 * 1000).toISOString(),
    usedAt: new Date().toISOString(),
    deviceId: deviceId || undefined,
  };

  // 更新模拟数据
  keys[targetKeyIndex] = updatedKey;

  // 注意：在这里您还需要将激活记录保存到持久化数据库中
  // 例如: storage.addActivationRecord({ /* ... */ });

  response.status(200).json({
    success: true,
    message: '卡密激活成功',
    data: {
      key: updatedKey.key,
      status: updatedKey.status,
      activatedAt: updatedKey.usedAt,
      expiresAt: updatedKey.expiresAt,
    },
  });
} 