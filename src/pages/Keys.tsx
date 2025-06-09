import { useState, useEffect, useContext } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "@/App";
import Navbar from "@/components/Navbar";
import Pagination from './Pagination';
import { cache } from './cache';
import { storage } from '../lib/storage';
import { ActivationKey } from '../types';
import { v4 as uuidv4 } from 'uuid';

type TabType = 'generate' | 'manage' | 'export';
type KeyStatus = 'active' | 'inactive' | 'expired';

interface ActivationKey {
  id: string;
  key: string;
  prefix: string;
  suffix: string;
  status: KeyStatus;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  deviceId?: string;
  validDays: number;
}

interface KeyGenFormValues {
  count: number;
  prefix: string;
  suffix: string;
  validDays: number;
}

// 表单验证规则
const keyGenSchema = z.object({
  count: z.number().min(1).max(100),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  validDays: z.number().min(1).max(365),
});

type KeyGenFormValues = z.infer<typeof keyGenSchema>;

// 模拟数据
const mockKeys: ActivationKey[] = [
  {
    id: "1",
    key: "DEMO-12345-2025",
    prefix: "DEMO-",
    suffix: "-2025",
    createdAt: "2025-06-08T10:30:00",
    expiresAt: "2025-07-08T10:30:00",
    status: "active",
    validDays: 1,
  },
  {
    id: "3",
    key: "NEW-54321-2025",
    prefix: "NEW-",
    suffix: "-2025",
    createdAt: "2025-06-09T08:15:00",
    expiresAt: "2025-07-09T08:15:00",
    status: "inactive",
    validDays: 1,
  },
  {
    id: "2",
    key: "TEST-67890-2025",
    prefix: "TEST-",
    suffix: "-2025",
    createdAt: "2025-06-07T14:45:00",
    expiresAt: "2025-06-14T14:45:00",
    status: "expired",
    validDays: 1,
  },
];

function generateRandomKey(length: number) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint32Array(length);
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * charset.length);
    }
  }
  return Array.from(array, x => charset[x % charset.length]).join('');
}

export default function Keys() {
  const navigate = useNavigate();
  const { isAuthenticated, isSuperAdmin } = useContext(AuthContext);
  const [keys, setKeys] = useState<ActivationKey[]>(mockKeys);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [activeTab, setActiveTab] = useState<TabType>('generate');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<KeyGenFormValues>({
    resolver: zodResolver(keyGenSchema),
    defaultValues: {
      prefix: "",
      suffix: "",
      count: 10,
      validDays: 1, // 1天
    },
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 过滤卡密
  const filteredKeys = keys.filter((key) => {
    const matchesSearch = key.key.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || key.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 计算分页数据
  const totalPages = Math.ceil(filteredKeys.length / itemsPerPage);
  const paginatedKeys = filteredKeys.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 处理页码变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 初始化时从localStorage加载数据
  useEffect(() => {
    const savedKeys = localStorage.getItem('keys');
    if (savedKeys) {
      setKeys(JSON.parse(savedKeys));
    }
  }, []);

  const generateKeys = async (data: KeyGenFormValues) => {
    setIsGenerating(true);
    try {
      const newKeys: ActivationKey[] = [];
      for (let i = 0; i < data.count; i++) {
        // 生成25位卡密
        const randomPart = uuidv4().slice(0, 25 - (data.prefix?.length || 0) - (data.suffix?.length || 0));
        const key = `${data.prefix || ''}${randomPart}${data.suffix || ''}`.slice(0, 25);
        
        newKeys.push({
          id: uuidv4(),
          key,
          prefix: data.prefix || '',
          suffix: data.suffix || '',
          status: 'inactive',
          createdAt: new Date().toISOString(),
          expiresAt: '', // 初始为空，激活时再设置
          validDays: data.validDays, // 保存有效期天数
        });
      }

      // 从localStorage获取现有卡密
      const existingKeys = JSON.parse(localStorage.getItem('keys') || '[]');
      // 合并新旧卡密
      const updatedKeys = [...newKeys, ...existingKeys];
      // 保存到localStorage
      localStorage.setItem('keys', JSON.stringify(updatedKeys));
      // 更新状态
      setKeys(updatedKeys);
      toast.success(`成功生成 ${data.count} 个卡密`);
    } catch (error) {
      console.error('生成卡密失败:', error);
      toast.error('生成卡密失败');
    } finally {
      setIsGenerating(false);
    }
  };

  // 导出卡密
  const exportKeys = () => {
    const csvContent = keys
      .map((key) => `${key.key},${key.createdAt},${key.expiresAt},${key.status}`)
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `activation_keys_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success("卡密已导出");
  };

  // 实时预览
  const previewKey = watch("prefix") + "12345" + watch("suffix");

  // 删除卡密时更新localStorage
  const handleDeleteKey = (keyId: string) => {
    const updatedKeys = keys.filter(key => key.id !== keyId);
    setKeys(updatedKeys);
    localStorage.setItem('keys', JSON.stringify(updatedKeys));
    toast.success('卡密已删除');
  };

  // 更新卡密状态时更新localStorage
  const handleStatusChange = (keyId: string, newStatus: 'inactive' | 'active' | 'expired') => {
    const updatedKeys = keys.map(key => {
      if (key.id === keyId) {
        if (newStatus === 'active' && key.status === 'inactive') {
          // 如果是激活操作，设置过期时间
          return {
            ...key,
            status: newStatus,
            expiresAt: new Date(Date.now() + (key.validDays || 1) * 24 * 60 * 60 * 1000).toISOString()
          };
        } else if (newStatus === 'inactive' && key.status === 'active') {
          // 如果是失效操作，清除过期时间
          return {
            ...key,
            status: newStatus,
            expiresAt: '',
            deviceId: undefined
          };
        }
        return { ...key, status: newStatus };
      }
      return key;
    });
    setKeys(updatedKeys);
    localStorage.setItem('keys', JSON.stringify(updatedKeys));
    toast.success('状态已更新');
  };

  // 批量删除卡密
  const handleBatchDelete = () => {
    if (selectedKeys.length === 0) {
      toast.error('请选择要删除的卡密');
      return;
    }

    const updatedKeys = keys.filter(key => !selectedKeys.includes(key.id));
    setKeys(updatedKeys);
    localStorage.setItem('keys', JSON.stringify(updatedKeys));
    setSelectedKeys([]);
    setIsSelectAll(false);
    toast.success(`成功删除 ${selectedKeys.length} 个卡密`);
  };

  const handleSelectAll = () => {
    if (isSelectAll) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(filteredKeys.map(key => key.id));
    }
    setIsSelectAll(!isSelectAll);
  };

  const handleSelectKey = (keyId: string) => {
    setSelectedKeys(prev =>
      prev.includes(keyId)
        ? prev.filter(id => id !== keyId)
        : [...prev, keyId]
    );
  };

  const handleExport = () => {
    const selectedKeyData = keys.filter(key => selectedKeys.includes(key.id));
    const csvContent = [
      ['卡密', '状态', '创建时间', '过期时间', '使用时间', '设备ID'].join(','),
      ...selectedKeyData.map(key => [
        key.key,
        key.status,
        key.createdAt,
        key.expiresAt,
        key.usedAt || '',
        key.deviceId || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `卡密导出_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#0A192F] text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#00D1FF]">卡密管理中心</h1>
        </div>

        {/* 侧边栏 */}
        <div className="flex gap-6">
          <div className="w-64 bg-[#0A192F]/70 backdrop-blur-sm rounded-xl border border-[#00D1FF]/30 p-4">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('generate')}
                className={`w-full text-left px-4 py-2 rounded-lg ${
                  activeTab === 'generate' ? 'bg-[#00D1FF]/10 text-[#00D1FF]' : 'text-white/80 hover:bg-[#00D1FF]/5'
                }`}
              >
                <i className="fa-solid fa-key mr-2"></i>
                生成卡密
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`w-full text-left px-4 py-2 rounded-lg ${
                  activeTab === 'manage' ? 'bg-[#00D1FF]/10 text-[#00D1FF]' : 'text-white/80 hover:bg-[#00D1FF]/5'
                }`}
              >
                <i className="fa-solid fa-list mr-2"></i>
                管理卡密
              </button>
              <button
                onClick={() => setActiveTab('export')}
                className={`w-full text-left px-4 py-2 rounded-lg ${
                  activeTab === 'export' ? 'bg-[#00D1FF]/10 text-[#00D1FF]' : 'text-white/80 hover:bg-[#00D1FF]/5'
                }`}
              >
                <i className="fa-solid fa-file-export mr-2"></i>
                导出卡密
              </button>
            </nav>
          </div>

          {/* 主内容区 */}
          <div className="flex-1 bg-[#0A192F]/70 backdrop-blur-sm rounded-xl border border-[#00D1FF]/30 p-6">
            {activeTab === 'generate' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">生成卡密</h2>
                <form onSubmit={handleSubmit(generateKeys)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">生成数量</label>
                      <input
                        type="number"
                        {...register("count", { valueAsNumber: true })}
                        className="w-full cyber-input"
                        min="1"
                        max="100"
                      />
                      {errors.count && (
                        <p className="text-red-400 text-sm mt-1">{errors.count.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">有效期（天）</label>
                      <input
                        type="number"
                        {...register("validDays", { valueAsNumber: true })}
                        className="w-full cyber-input"
                        min="1"
                        max="365"
                      />
                      {errors.validDays && (
                        <p className="text-red-400 text-sm mt-1">{errors.validDays.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">前缀</label>
                      <input
                        type="text"
                        {...register("prefix")}
                        className="w-full cyber-input"
                        maxLength={10}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">后缀</label>
                      <input
                        type="text"
                        {...register("suffix")}
                        className="w-full cyber-input"
                        maxLength={10}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">预览</label>
                    <div className="w-full cyber-input bg-[#0A192F]/50">
                      {previewKey || "输入前缀和后缀以预览"}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="w-full cyber-button"
                  >
                    {isGenerating ? "生成中..." : "生成卡密"}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'manage' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">管理卡密</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handleBatchDelete}
                      className="px-4 py-2 bg-red-500/10 border border-red-500/50 text-red-500 rounded-lg hover:bg-red-500/20"
                    >
                      批量删除
                    </button>
                  </div>
                </div>
                <div className="mb-4 flex gap-4">
                  <input
                    type="text"
                    placeholder="搜索卡密..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 cyber-input"
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="cyber-input"
                  >
                    <option value="all">全部状态</option>
                    <option value="active">已激活</option>
                    <option value="inactive">未激活</option>
                    <option value="expired">已过期</option>
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full cyber-table">
                    <thead>
                      <tr>
                        <th className="w-12">
                          <input
                            type="checkbox"
                            checked={isSelectAll}
                            onChange={handleSelectAll}
                            className="rounded border-[#00D1FF]/30"
                          />
                        </th>
                        <th>卡密</th>
                        <th>创建时间</th>
                        <th>过期时间</th>
                        <th>状态</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedKeys.map((key) => (
                        <tr key={key.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedKeys.includes(key.id)}
                              onChange={() => handleSelectKey(key.id)}
                              className="rounded border-[#00D1FF]/30"
                            />
                          </td>
                          <td>{key.key}</td>
                          <td>{new Date(key.createdAt).toLocaleString()}</td>
                          <td>{new Date(key.expiresAt).toLocaleString()}</td>
                          <td>
                            <span className={`status-badge ${key.status}`}>
                              {key.status === 'active' && '已激活'}
                              {key.status === 'inactive' && '未激活'}
                              {key.status === 'expired' && '已过期'}
                            </span>
                          </td>
                          <td>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(key.key);
                                  toast.success('卡密已复制到剪贴板');
                                }}
                                className="text-[#00D1FF] hover:text-[#64FFDA] transition-colors"
                              >
                                复制
                              </button>
                              {key.status === 'active' && (
                                <button
                                  onClick={() => handleStatusChange(key.id, 'inactive')}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  失效
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteKey(key.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                删除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">导出卡密</h2>
                <div className="space-y-4">
                  <p className="text-white/80">
                    当前共有 {keys.length} 个卡密，点击下方按钮导出为CSV文件。
                  </p>
                  <button
                    onClick={handleExport}
                    className="w-full cyber-button"
                  >
                    导出卡密
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
