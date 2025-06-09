import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const featureCards = [
  {
    title: "管理员控制台",
    description: "系统登录和权限管理",
    icon: "fa-solid fa-user-shield",
    path: "/admin",
    color: "bg-blue-500"
  },
  {
    title: "卡密管理中心",
    description: "卡密生成、导入导出及管理",
    icon: "fa-solid fa-key",
    path: "/keys",
    color: "bg-purple-500"
  },
  {
    title: "激活验证接口",
    description: "APK调用的RESTful API服务",
    icon: "fa-solid fa-plug",
    path: "/api",
    color: "bg-green-500"
  },
  {
    title: "数据看板",
    description: "多维度的数据统计和分析",
    icon: "fa-solid fa-chart-line",
    path: "/dashboard",
    color: "bg-yellow-500"
  }
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A192F] text-white">
      {/* 顶部导航栏 */}
      <nav className="bg-[#0A192F]/90 backdrop-blur-sm border-b border-[#00D1FF]/20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#00D1FF]">APK卡密激活系统</h1>
          <div className="hidden md:flex space-x-6">
            {featureCards.map((card) => (
              <button 
                key={card.path}
                onClick={() => navigate(card.path)}
                className="text-white/80 hover:text-[#00D1FF] transition-colors"
              >
                {card.title}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* 系统简介 */}
        <section className="mb-16 text-center">
          <h2 className="text-4xl font-bold mb-4">欢迎使用APK卡密激活系统</h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            为您的软件授权提供完整的Web解决方案，包含卡密生成、激活验证、数据统计等功能
          </p>
        </section>

        {/* 功能卡片网格 */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {featureCards.map((card, index) => (
            <motion.div
              key={card.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              onClick={() => navigate(card.path)}
              className={`${card.color} rounded-xl p-6 shadow-lg cursor-pointer transition-all hover:shadow-xl`}
            >
              <div className="flex flex-col items-center text-center">
                <i className={`${card.icon} text-4xl mb-4`}></i>
                <h3 className="text-xl font-bold mb-2">{card.title}</h3>
                <p className="text-white/90">{card.description}</p>
              </div>
            </motion.div>
          ))}
        </section>
      </main>
    </div>
  );
}