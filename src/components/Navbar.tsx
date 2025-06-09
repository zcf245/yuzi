import { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "@/App";

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

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isSuperAdmin, logout } = useContext(AuthContext);

  const handleNavigation = (path: string) => {
    if (path === "/admin") {
      if (isAuthenticated) {
        if (isSuperAdmin) {
          // 超级管理员直接进入管理员控制台
          navigate("/admin");
        } else {
          // 普通用户跳转到卡密中心
          navigate("/keys");
        }
      } else {
        // 未登录用户跳转到登录页
        navigate("/admin");
      }
    } else {
      navigate(path);
    }
  };

  return (
    <nav className="bg-[#0A192F]/90 backdrop-blur-sm border-b border-[#00D1FF]/20 px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <h1 
          className="text-2xl font-bold text-[#00D1FF] cursor-pointer"
          onClick={() => navigate("/")}
        >
          APK卡密激活系统
        </h1>
        <div className="hidden md:flex items-center space-x-6">
          {featureCards.map((card) => (
            <button 
              key={card.path}
              onClick={() => handleNavigation(card.path)}
              className={`text-white/80 hover:text-[#00D1FF] transition-colors ${
                location.pathname === card.path ? "text-[#00D1FF]" : ""
              }`}
            >
              {card.title}
            </button>
          ))}
          {isAuthenticated && (
            <button
              onClick={logout}
              className="text-white/80 hover:text-red-400 transition-colors"
            >
              退出登录
            </button>
          )}
        </div>
      </div>
    </nav>
  );
} 