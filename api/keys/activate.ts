import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../lib/prisma';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const { key: activationKey, deviceId } = request.body;

  if (!activationKey) {
    return response.status(400).json({ success: false, message: '请提供卡密' });
  }

  try {
    const targetKey = await prisma.activationKey.findUnique({
      where: { key: activationKey }
    });

    if (!targetKey) {
      return response.status(404).json({ success: false, message: '卡密不存在' });
    }

    if (targetKey.status === 'active') {
      return response.status(400).json({ success: false, message: '卡密已被激活' });
    }

    if (targetKey.status === 'expired') {
      return response.status(400).json({ success: false, message: '卡密已过期' });
    }

    // 激活卡密并设置过期时间
    const expiresAt = new Date(Date.now() + (targetKey.validDays || 1) * 24 * 60 * 60 * 1000);
    const usedAt = new Date();

    const updatedKey = await prisma.activationKey.update({
      where: { id: targetKey.id },
      data: {
        status: 'active',
        expiresAt,
        usedAt,
        deviceId: deviceId || null
      }
    });

    // 创建激活记录
    await prisma.activationRecord.create({
      data: {
        keyId: targetKey.id,
        deviceId: deviceId || 'unknown',
        expiresAt,
        status: 'active'
      }
    });

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
  } catch (error) {
    console.error('Error activating key:', error);
    return response.status(500).json({
      success: false,
      message: '激活卡密失败'
    });
  }
} 