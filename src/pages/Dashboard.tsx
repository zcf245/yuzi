import { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ComposedChart, Area } from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { cache } from './cache';
import { storage } from '../lib/storage';
import { ActivationKey, ActivationRecord, ChartData, DateRange } from '../types';
import { Line, Bar as ChartBar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  ChartLegend
);

// 可拖拽卡片组件
const DraggableCard = ({ id, children, onMoveCard }: any) => {
  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      whileHover={{ scale: 1.02 }}
      className="bg-[#0A192F]/70 backdrop-blur-sm rounded-xl border border-[#00D1FF]/30 p-6 shadow-lg cursor-move"
    >
      {children}
    </motion.div>
  );
};

// 激活统计图表组件
const ActivationStatsChart = ({ keys }: { keys: ActivationKey[] }) => {
  // 获取最近7天的激活数据
  const getRecentActivations = () => {
    const today = new Date();
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      return date;
    }).reverse();

    return dates.map(date => {
      const dateStr = `${date.getMonth() + 1}-${date.getDate()}`;
      const count = keys.filter(key => {
        const keyDate = new Date(key.createdAt);
        return keyDate.getDate() === date.getDate() && 
               keyDate.getMonth() === date.getMonth() &&
               keyDate.getFullYear() === date.getFullYear();
      }).length;
      return { date: dateStr, count };
    });
  };

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4 text-[#00D1FF]">激活统计</h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={getRecentActivations()}>
            <CartesianGrid strokeDasharray="3 3" stroke="#00D1FF/20" />
            <XAxis dataKey="date" stroke="#00D1FF" />
            <YAxis stroke="#00D1FF" />
            <Tooltip 
              contentStyle={{ backgroundColor: "#0A192F", borderColor: "#00D1FF" }}
              itemStyle={{ color: "#00D1FF" }}
            />
            <Legend />
            <Bar dataKey="count" name="激活数量">
              {getRecentActivations().map((entry, index) => (
                <Cell key={`cell-${index}`} fill="#00D1FF" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 时段分布图表组件
const TimeDistributionChart = ({ keys }: { keys: ActivationKey[] }) => {
  // 获取24小时激活分布数据
  const getHourlyDistribution = () => {
    const hourlyData = Array(12).fill(0).map((_, hourIndex) => {
      const hour = hourIndex * 2;
      const hourLabel = hour < 10 ? `0${hour}` : `${hour}`;
      const count = keys.filter(key => {
        const keyDate = new Date(key.createdAt);
        const keyHour = keyDate.getHours();
        return keyHour >= hour && keyHour < hour + 2;
      }).length;
      return {
        name: `${hourLabel}:00`,
        value: count
      };
    });
    return hourlyData;
  };

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4 text-[#00D1FF]">激活时段分布</h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={getHourlyDistribution()}>
            <CartesianGrid strokeDasharray="3 3" stroke="#00D1FF/20" />
            <XAxis dataKey="name" stroke="#00D1FF" />
            <YAxis stroke="#00D1FF" />
            <Tooltip 
              contentStyle={{ backgroundColor: "#0A192F", borderColor: "#00D1FF" }}
              itemStyle={{ color: "#00D1FF" }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#00D1FF" 
              fill="#00D1FF" 
              fillOpacity={0.2} 
            />
            <Bar dataKey="value" fill="#00D1FF" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 设备列表组件
const DeviceList = ({ keys }: { keys: ActivationKey[] }) => {
  // 获取设备激活数据
  const getDeviceData = () => {
    const deviceMap = new Map<string, { lastActive: string; activationCount: number }>();
    
    keys.forEach(key => {
      if (key.status === 'active' || key.status === 'used') {
        const deviceId = key.key.split('-')[0]; // 使用卡密前缀作为设备ID
        const existing = deviceMap.get(deviceId);
        if (existing) {
          deviceMap.set(deviceId, {
            lastActive: key.createdAt,
            activationCount: existing.activationCount + 1
          });
        } else {
          deviceMap.set(deviceId, {
            lastActive: key.createdAt,
            activationCount: 1
          });
        }
      }
    });

    return Array.from(deviceMap.entries()).map(([id, data]) => ({
      id,
      lastActive: data.lastActive,
      activationCount: data.activationCount
    })).sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());
  };

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4 text-[#00D1FF]">设备指纹追踪</h3>
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#00D1FF]/30">
              <th className="text-left py-2 text-white/80">设备ID</th>
              <th className="text-left py-2 text-white/80">最后活跃</th>
              <th className="text-left py-2 text-white/80">激活次数</th>
            </tr>
          </thead>
          <tbody>
            {getDeviceData().map((device) => (
              <tr key={device.id} className="border-b border-[#00D1FF]/10 hover:bg-[#00D1FF]/5">
                <td className="py-2 text-white/90">{device.id}</td>
                <td className="py-2 text-white/80">
                  {new Date(device.lastActive).toLocaleString()}
                </td>
                <td className="py-2 text-[#00D1FF]">{device.activationCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 预警组件
const AlertList = ({ keys }: { keys: ActivationKey[] }) => {
  // 获取异常行为预警
  const getAlerts = () => {
    const alerts = [];
    const now = new Date();
    
    // 检查过期卡密
    const expiredKeys = keys.filter(key => 
      key.status === 'active' && new Date(key.expiresAt) < now
    );
    if (expiredKeys.length > 0) {
      alerts.push({
        type: "warning",
        message: `发现 ${expiredKeys.length} 个过期卡密`,
        timestamp: now.toISOString()
      });
    }

    // 检查频繁激活
    const deviceActivations = new Map<string, number>();
    keys.forEach(key => {
      if (key.status === 'active' || key.status === 'used') {
        const deviceId = key.key.split('-')[0];
        deviceActivations.set(deviceId, (deviceActivations.get(deviceId) || 0) + 1);
      }
    });

    deviceActivations.forEach((count, deviceId) => {
      if (count > 10) {
        alerts.push({
          type: "error",
          message: `设备 ${deviceId} 频繁请求`,
          timestamp: now.toISOString()
        });
      }
    });

    return alerts;
  };

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4 text-[#00D1FF]">异常行为预警</h3>
      <div className="flex-1 overflow-auto space-y-3">
        {getAlerts().map((alert, index) => (
          <div
            key={index}
            className={cn(
              "p-3 rounded-lg border",
              alert.type === "error"
                ? "bg-red-500/10 border-red-500/30"
                : "bg-yellow-500/10 border-yellow-500/30"
            )}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-white">{alert.message}</p>
                <p className="text-xs text-white/60 mt-1">
                  {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>
              <i
                className={cn(
                  "fa-solid mt-1",
                  alert.type === "error" ? "fa-circle-exclamation text-red-400" : "fa-triangle-exclamation text-yellow-400"
                )}
              ></i>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 统计卡片组件
const StatsCard = ({ title, value, change }: any) => {
  return (
    <div className="bg-[#0A192F]/70 backdrop-blur-sm rounded-xl border border-[#00D1FF]/30 p-4">
      <h3 className="text-sm font-medium text-white/80 mb-1">{title}</h3>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-[#00D1FF]">{value}</p>
        {change && (
          <p
            className={cn(
              "text-sm",
              change > 0 ? "text-green-400" : "text-red-400"
            )}
          >
            {change > 0 ? "+" : ""}
            {change}%
          </p>
        )}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [keys, setKeys] = useState<ActivationKey[]>([]);
  const [records, setRecords] = useState<ActivationRecord[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // 加载数据
  const loadData = () => {
    try {
      // 从localStorage加载卡密数据
      const storedKeys = JSON.parse(localStorage.getItem('keys') || '[]');
      // 从storage加载激活记录
      const storedRecords = storage.getActivationRecords();
      
      setKeys(storedKeys);
      setRecords(storedRecords);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  // 初始加载和定期更新
  useEffect(() => {
    loadData();
    // 每5秒更新一次数据
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // 检查过期卡密
  useEffect(() => {
    const checkExpiredKeys = () => {
      const now = new Date().getTime();
      const updatedKeys = keys.map(key => {
        if (new Date(key.expiresAt).getTime() < now && key.status !== 'used') {
          return { ...key, status: 'expired' };
        }
        return key;
      });
      
      if (JSON.stringify(updatedKeys) !== JSON.stringify(keys)) {
        localStorage.setItem('keys', JSON.stringify(updatedKeys));
        setKeys(updatedKeys);
      }
    };

    checkExpiredKeys();
    const interval = setInterval(checkExpiredKeys, 60000); // 每分钟检查一次
    return () => clearInterval(interval);
  }, [keys]);

  const getStatusDistribution = (): ChartData => {
    const statusCounts = {
      inactive: 0,
      active: 0,
      expired: 0,
    };

    keys.forEach(key => {
      statusCounts[key.status]++;
    });

    return {
      labels: ['未激活', '已激活', '已过期'],
      datasets: [
        {
          label: '卡密状态分布',
          data: Object.values(statusCounts),
          backgroundColor: [
            'rgba(54, 162, 235, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(255, 99, 132, 0.6)',
          ],
        },
      ],
    };
  };

  const getActivationTrend = (): ChartData => {
    const dates = Array.from(
      new Set(
        records.map(record =>
          new Date(record.activatedAt).toISOString().split('T')[0]
        )
      )
    ).sort();

    const activationsByDate = dates.map(date => ({
      date,
      count: records.filter(
        record =>
          new Date(record.activatedAt).toISOString().split('T')[0] === date
      ).length,
    }));

    return {
      labels: activationsByDate.map(item => item.date),
      datasets: [
        {
          label: '每日激活数量',
          data: activationsByDate.map(item => item.count),
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1,
          fill: false,
        },
      ],
    };
  };

  const getDeviceDistribution = (): ChartData => {
    const deviceCounts = records.reduce((acc, record) => {
      acc[record.deviceId] = (acc[record.deviceId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sortedDevices = Object.entries(deviceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return {
      labels: sortedDevices.map(([deviceId]) => deviceId),
      datasets: [
        {
          label: '设备激活次数',
          data: sortedDevices.map(([, count]) => count),
          backgroundColor: 'rgba(153, 102, 255, 0.6)',
        },
      ],
    };
  };

  const [cards, setCards] = useState([
    { id: "stats", component: null },
    { id: "activation", component: <ActivationStatsChart keys={keys} /> },
    { id: "heatmap", component: <TimeDistributionChart keys={keys} /> },
    { id: "devices", component: <DeviceList keys={keys} /> },
    { id: "alerts", component: <AlertList keys={keys} /> },
  ]);

  const moveCard = (dragIndex: number, hoverIndex: number) => {
    const dragCard = cards[dragIndex];
    const newCards = [...cards];
    newCards.splice(dragIndex, 1);
    newCards.splice(hoverIndex, 0, dragCard);
    setCards(newCards);
  };

  return (
    <div className="min-h-screen bg-[#0A192F] text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#00D1FF]">数据看板</h1>
          <button
            onClick={() => navigate("/keys")}
            className="px-4 py-2 bg-[#00D1FF]/10 border border-[#00D1FF]/50 text-[#00D1FF] rounded-lg hover:bg-[#00D1FF]/20 transition-colors"
          >
            <i className="fa-solid fa-key mr-2"></i>
            卡密管理中心
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="总生成数"
            value={keys.length}
          />
          <StatsCard
            title="已激活数"
            value={keys.filter(key => key.status === 'active' || key.status === 'used').length}
          />
          <StatsCard
            title="激活率"
            value={`${keys.length > 0 
              ? ((keys.filter(key => key.status === 'active' || key.status === 'used').length / keys.length) * 100).toFixed(2)
              : 0}%`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {cards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-[#0A192F]/70 backdrop-blur-sm rounded-xl border border-[#00D1FF]/30 p-6"
            >
              {card.component}
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0A192F]/70 backdrop-blur-sm rounded-xl border border-[#00D1FF]/30 p-6"
          >
            <h3 className="text-lg font-semibold text-[#00D1FF] mb-4">卡密状态分布</h3>
            <div className="h-80">
              <Doughnut data={getStatusDistribution()} />
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#0A192F]/70 backdrop-blur-sm rounded-xl border border-[#00D1FF]/30 p-6"
          >
            <h3 className="text-lg font-semibold text-[#00D1FF] mb-4">激活趋势</h3>
            <div className="h-80">
              <Line data={getActivationTrend()} />
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#0A192F]/70 backdrop-blur-sm rounded-xl border border-[#00D1FF]/30 p-6"
          >
            <h3 className="text-lg font-semibold text-[#00D1FF] mb-4">设备分布</h3>
            <div className="h-80">
              <Bar data={getDeviceDistribution()} />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}