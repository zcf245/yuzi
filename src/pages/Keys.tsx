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
import { ActivationKey } from '../types';
import { v4 as uuidv4 } from 'uuid';

type TabType = 'generate' | 'manage' | 'export';
type KeyStatus = 'active' | 'inactive' | 'expired';

// 表单验证规则
const keyGenSchema = z.object({
  count: z.number().min(1).max(100),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  validDays: z.number().min(1).max(365),
});

type KeyGenFormValues = z.infer<typeof keyGenSchema>;

export default function Keys() {
  const navigate = useNavigate();
  const { isAuthenticated, isSuperAdmin } = useContext(AuthContext);
  const [keys, setKeys] = useState<ActivationKey[]>([]);
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

  // 加载卡密数据函数
  const loadKeys = async () => {
    try {
      const response = await fetch('/api/keys');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: ActivationKey[] = await response.json();
      setKeys(data);
      toast.success('卡密数据已从服务器加载');
    } catch (error) {
      console.error('加载卡密失败:', error);
      toast.error('加载卡密失败');
      setKeys([]);
    }
  };

  // 在组件挂载时和activeTab为'manage'时加载数据
  useEffect(() => {
    // 首次加载数据
    loadKeys();
  }, []);

  // 当activeTab切换到'manage'时，重新加载数据
  useEffect(() => {
    if (activeTab === 'manage' || activeTab === 'export') {
      loadKeys();
    }
  }, [activeTab]);

  const generateKeys = async (data: KeyGenFormValues) => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      toast.success(result.message);
      loadKeys();
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
  const handleDeleteKey = async (keyId: string) => {
    try {
      const response = await fetch('/api/keys', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: [keyId] }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      toast.success(result.message);
      loadKeys();
    } catch (error) {
      console.error('删除卡密失败:', error);
      toast.error('删除卡密失败');
    }
  };

  // 更新卡密状态时更新localStorage
  const handleStatusChange = async (keyId: string, newStatus: 'inactive' | 'active' | 'expired') => {
    if (newStatus === 'inactive') {
      try {
        const response = await fetch('/api/keys/deactivate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ keyId }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        toast.success(result.message);
        loadKeys();
      } catch (error) {
        console.error('卡密失效失败:', error);
        toast.error('卡密失效失败');
      }
    } else if (newStatus === 'active') {
      toast.info('激活操作请前往 激活验证接口 页面');
    } else if (newStatus === 'expired') {
      toast.info('过期状态由系统自动处理');
    }
  };

  // 批量删除卡密
  const handleBatchDelete = async () => {
    if (selectedKeys.length === 0) {
      toast.error('请选择要删除的卡密');
      return;
    }

    try {
      const response = await fetch('/api/keys', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: selectedKeys }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      toast.success(result.message);
      loadKeys();
      setSelectedKeys([]);
      setIsSelectAll(false);
    } catch (error) {
      console.error('批量删除卡密失败:', error);
      toast.error('批量删除卡密失败');
    }
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
                <h2 className="text-xl font-semibold mb-4">管理卡密</h2>
                <div className="flex flex-col md:flex-row gap-4 mb-4 items-center">
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
                    className="cyber-input md:w-auto"
                  >
                    <option value="all">全部状态</option>
                    <option value="active">已激活</option>
                    <option value="inactive">未激活</option>
                    <option value="expired">已过期</option>
                  </select>
                  <div className="flex gap-2 w-full md:w-auto">
                    <button
                      onClick={handleExport}
                      className="flex-1 px-4 py-2 bg-[#00D1FF]/10 border border-[#00D1FF]/50 text-[#00D1FF] rounded-lg hover:bg-[#00D1FF]/20"
                    >
                      批量导出
                    </button>
                    <button
                      onClick={handleBatchDelete}
                      className="flex-1 px-4 py-2 bg-red-500/10 border border-red-500/50 text-red-500 rounded-lg hover:bg-red-500/20"
                    >
                      批量删除
                    </button>
                  </div>
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
                          <td>{key.expiresAt ? new Date(key.expiresAt).toLocaleString() : '-'}</td>
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
                  <div className="overflow-x-auto">
                    <table className="w-full cyber-table">
                      <thead>
                        <tr>
                          <th>卡密</th>
                          <th>创建时间</th>
                          <th>过期时间</th>
                          <th>状态</th>
                          <th>设备ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {keys.map((key) => (
                          <tr key={key.id}>
                            <td>{key.key}</td>
                            <td>{new Date(key.createdAt).toLocaleString()}</td>
                            <td>{key.expiresAt ? new Date(key.expiresAt).toLocaleString() : '-'}</td>
                            <td>
                              <span className={`status-badge ${key.status}`}>
                                {key.status === 'active' && '已激活'}
                                {key.status === 'inactive' && '未激活'}
                                {key.status === 'expired' && '已过期'}
                              </span>
                            </td>
                            <td>{key.deviceId || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <p className="text-white/80">
                      当前共有 {keys.length} 个卡密记录
                    </p>
                    <button
                      onClick={exportKeys}
                      className="px-4 py-2 bg-[#00D1FF]/10 border border-[#00D1FF]/50 text-[#00D1FF] rounded-lg hover:bg-[#00D1FF]/20"
                    >
                      <i className="fa-solid fa-download mr-2"></i>
                      下载记录
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
