import { useState, useEffect } from 'react';
import { logger, LogEntry } from '@/lib/logger';
import { motion } from 'framer-motion';

export default function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = () => {
    setIsLoading(true);
    const allLogs = logger.getLogs();
    setLogs(allLogs);
    setIsLoading(false);
  };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(filter.toLowerCase()) ||
    log.details.toLowerCase().includes(filter.toLowerCase()) ||
    log.userId.toLowerCase().includes(filter.toLowerCase())
  );

  const handleExport = () => {
    logger.exportLogs();
  };

  const handleClear = () => {
    if (window.confirm('确定要清空所有日志吗？此操作不可恢复。')) {
      logger.clearLogs();
      loadLogs();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D1FF]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="搜索日志..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-4 py-2 bg-[#0A192F]/50 border border-[#00D1FF]/50 rounded-lg text-white"
          />
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-[#00D1FF]/10 border border-[#00D1FF]/50 text-[#00D1FF] rounded-lg hover:bg-[#00D1FF]/20"
          >
            导出日志
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/20"
          >
            清空日志
          </button>
        </div>
      </div>

      <div className="bg-[#0A192F]/50 rounded-lg border border-[#00D1FF]/30 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#00D1FF]/30">
              <th className="text-left py-2 px-4 text-white/80">时间</th>
              <th className="text-left py-2 px-4 text-white/80">用户</th>
              <th className="text-left py-2 px-4 text-white/80">操作</th>
              <th className="text-left py-2 px-4 text-white/80">详情</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <motion.tr
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-b border-[#00D1FF]/10 hover:bg-[#00D1FF]/5"
              >
                <td className="py-2 px-4 text-white/90">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="py-2 px-4 text-white/90">{log.userId}</td>
                <td className="py-2 px-4 text-white/90">{log.action}</td>
                <td className="py-2 px-4 text-white/90">{log.details}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 