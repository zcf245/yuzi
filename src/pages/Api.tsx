import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { storage } from '../lib/storage';
import { ApiKey, BatchValidationResult } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { cache } from './cache';
import { ActivationKey, ActivationRecord } from '../types';

// interface ActivationKey {
//   id: string;
//   key: string;
//   prefix: string;
//   suffix: string;
//   status: KeyStatus;
//   createdAt: string;
//   expiresAt: string;
//   usedAt?: string;
//   deviceId?: string;
//   validDays: number;
// }

interface ApiTestFormValues {
  key: string;
  deviceId: string;
}

interface FormData {
  key: string;
  deviceId: string;
}

interface BatchFormData {
  keys: string;
  deviceId?: string;
}

interface ActivationResult {
  success: boolean;
  message: string;
  data?: { key: string; status: string; activatedAt?: string; expiresAt?: string; };
  error?: string;
}

export default function Api() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(storage.getApiKeys());
  const [selectedApiKey, setSelectedApiKey] = useState<string>('');
  const [batchResults, setBatchResults] = useState<BatchValidationResult[]>([]);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [activationResult, setActivationResult] = useState<ActivationResult>({ success: false, message: '' });

  const { register: registerSingle, handleSubmit: handleSubmitSingle, reset: resetSingle } = useForm<FormData>();
  const { register: registerBatch, handleSubmit: handleSubmitBatch, reset: resetBatch } = useForm<BatchFormData>();

  const generateApiKey = () => {
    if (!newApiKeyName) return;
    const newKey: ApiKey = {
      id: uuidv4(),
      key: `sk-${uuidv4()}`,
      name: newApiKeyName,
      createdAt: new Date().toISOString(),
      rateLimit: 100,
      isActive: true
    };
    storage.addApiKey(newKey);
    setApiKeys([...apiKeys, newKey]);
    setNewApiKeyName('');
  };

  const handleActivate = async (data: ApiTestFormValues) => {
    try {
      const response = await fetch('/api/keys/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: data.key, deviceId: data.deviceId }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message);
      setActivationResult({
        success: true,
          message: result.message,
          data: result.data,
        });
      } else {
        toast.error(result.message || '激活卡密失败');
        setActivationResult({
          success: false,
          message: result.message || '激活卡密失败',
          error: result.message || '未知错误',
        });
      }
    } catch (error) {
      console.error('激活卡密失败:', error);
      toast.error('激活卡密失败');
      setActivationResult({
        success: false,
        message: '激活卡密失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  };

  const validateBatchKeys = async (data: BatchFormData) => {
    toast.info('批量验证功能暂未实现，请等待后续开发');
    setBatchResults([]);
    // 批量验证功能需要后端接口支持，目前只是一个占位符
    // 实际实现时，可以向 /api/keys/validate-batch 发送请求
  };

  return (
    <div className="min-h-screen bg-[#0A192F] text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-[#00D1FF]">激活验证接口</h1>
            <button
              onClick={() => navigate("/keys")}
              className="px-4 py-2 bg-[#00D1FF]/10 border border-[#00D1FF]/50 text-[#00D1FF] rounded-lg hover:bg-[#00D1FF]/20 transition-colors"
            >
              <i className="fa-solid fa-key mr-2"></i>
              卡密管理中心
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* API文档区域 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#0A192F]/70 backdrop-blur-sm rounded-xl border border-[#00D1FF]/30 p-6"
            >
              <h2 className="text-xl font-semibold mb-4 text-[#00D1FF]">API文档</h2>
              
              <div className="space-y-6">
                <div>
                <h3 className="font-medium mb-2 text-white/80">端点</h3>
                <div className="bg-[#0A192F]/50 p-4 rounded-lg font-mono text-sm text-[#00D1FF]">
                    POST /api/activate
                  </div>
                </div>
                
                <div>
                <h3 className="font-medium mb-2 text-white/80">请求参数</h3>
                <pre className="bg-[#0A192F]/50 p-4 rounded-lg text-sm text-[#00D1FF]">
{`{
  "key": "string",    // 激活卡密
  "deviceId": "string" // 设备唯一标识
}`}</pre>
                </div>
                
                <div>
                <h3 className="font-medium mb-2 text-white/80">响应示例</h3>
                <pre className="bg-[#0A192F]/50 p-4 rounded-lg text-sm text-[#00D1FF]">
{`{
  "success": boolean,
  "data": {
    "key": "string",
    "deviceId": "string",
    "activatedAt": "string | null"
  },
  "error": "string | null"
}`}</pre>
                </div>
              </div>
            </motion.div>
            
            {/* API测试区域 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#0A192F]/70 backdrop-blur-sm rounded-xl border border-[#00D1FF]/30 p-6"
            >
              <h2 className="text-xl font-semibold mb-4 text-[#00D1FF]">API测试</h2>
              
              {/* API密钥管理 */}
            <div className="bg-[#0A192F]/70 backdrop-blur-sm rounded-xl border border-[#00D1FF]/30 p-6 mb-8">
              <h3 className="text-xl font-semibold mb-4 text-[#00D1FF]">API密钥管理</h3>
                <div className="flex gap-4 mb-4">
                  <input
                    type="text"
                    value={newApiKeyName}
                    onChange={(e) => setNewApiKeyName(e.target.value)}
                    placeholder="输入API密钥名称"
                  className="flex-1 px-4 py-2 bg-[#0A192F]/50 border border-[#00D1FF]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/50 text-white"
                  />
                  <button
                    onClick={generateApiKey}
                  className="px-6 py-2 bg-[#00D1FF]/10 border border-[#00D1FF]/50 text-[#00D1FF] rounded-lg hover:bg-[#00D1FF]/20 transition-colors"
                  >
                    生成密钥
                  </button>
                </div>
                <select
                  value={selectedApiKey}
                  onChange={(e) => setSelectedApiKey(e.target.value)}
                className="w-full px-4 py-2 bg-[#0A192F]/50 border border-[#00D1FF]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/50 text-white"
                >
                  <option value="">选择API密钥</option>
                  {apiKeys.map(key => (
                    <option key={key.id} value={key.id}>
                      {key.name} ({key.key})
                    </option>
                  ))}
                </select>
              </div>

              {/* 测试类型选择 */}
              <div className="flex gap-4 mb-8">
                <button
                  onClick={() => setActiveTab('single')}
                  className={`flex-1 px-6 py-3 rounded-lg transition-colors ${
                    activeTab === 'single'
                    ? 'bg-[#00D1FF]/20 border border-[#00D1FF]/50 text-[#00D1FF]'
                    : 'bg-[#0A192F]/50 text-white/60 hover:text-white/80'
                  }`}
                >
                  单卡密测试
                </button>
                <button
                  onClick={() => setActiveTab('batch')}
                  className={`flex-1 px-6 py-3 rounded-lg transition-colors ${
                    activeTab === 'batch'
                    ? 'bg-[#00D1FF]/20 border border-[#00D1FF]/50 text-[#00D1FF]'
                    : 'bg-[#0A192F]/50 text-white/60 hover:text-white/80'
                  }`}
                >
                  批量测试
                </button>
              </div>

              {/* 单卡密测试表单 */}
              {activeTab === 'single' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
                >
                  <form onSubmit={handleSubmitSingle(handleActivate)} className="space-y-4">
                    <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                        卡密
                      </label>
                      <input
                        {...registerSingle('key')}
                        type="text"
                      className="w-full px-4 py-2 bg-[#0A192F]/50 border border-[#00D1FF]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/50 text-white"
                        placeholder="输入卡密"
                      />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                        设备ID
                      </label>
                      <input
                        {...registerSingle('deviceId')}
                        type="text"
                      className="w-full px-4 py-2 bg-[#0A192F]/50 border border-[#00D1FF]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/50 text-white"
                        placeholder="输入设备ID"
                      />
                    </div>
                    <button
                      type="submit"
                    className="w-full px-6 py-3 bg-[#00D1FF]/10 border border-[#00D1FF]/50 text-[#00D1FF] rounded-lg hover:bg-[#00D1FF]/20 transition-colors"
                    >
                      调用API
                    </button>
                  </form>
                </motion.div>
              )}

              {/* 批量测试表单 */}
              {activeTab === 'batch' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
                >
                  <form onSubmit={handleSubmitBatch(validateBatchKeys)} className="space-y-4">
                    <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                        卡密列表（每行一个）
                      </label>
                      <textarea
                        {...registerBatch('keys')}
                      className="w-full px-4 py-2 bg-[#0A192F]/50 border border-[#00D1FF]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/50 text-white h-32"
                        placeholder="输入卡密列表，每行一个"
                      />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                        设备ID
                      </label>
                      <input
                        {...registerBatch('deviceId')}
                        type="text"
                      className="w-full px-4 py-2 bg-[#0A192F]/50 border border-[#00D1FF]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/50 text-white"
                        placeholder="输入设备ID"
                      />
                    </div>
                    <button
                      type="submit"
                    className="w-full px-6 py-3 bg-[#00D1FF]/10 border border-[#00D1FF]/50 text-[#00D1FF] rounded-lg hover:bg-[#00D1FF]/20 transition-colors"
                    >
                      批量验证
                    </button>
                  </form>

                  {/* 批量验证结果 */}
                  {batchResults.length > 0 && (
                    <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4 text-[#00D1FF]">验证结果</h3>
                      <div className="space-y-2">
                        {batchResults.map((result, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded-lg ${
                            result.isValid ? 'bg-[#00D1FF]/10' : 'bg-red-500/10'
                          } border ${
                            result.isValid ? 'border-[#00D1FF]/30' : 'border-red-500/30'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                            <span className="font-medium text-white/80">{result.key}</span>
                              <span
                                className={`px-2 py-1 rounded text-sm ${
                                  result.isValid
                                  ? 'bg-[#00D1FF]/20 text-[#00D1FF]'
                                  : 'bg-red-500/20 text-red-400'
                                }`}
                              >
                                {result.status}
                              </span>
                            </div>
                          <p className="text-sm text-white/60 mt-1">{result.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
        </div>
      </div>
    </div>
  );
}