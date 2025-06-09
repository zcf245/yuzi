import { Routes, Route, Navigate } from "react-router-dom";
import Home from "@/pages/Home";
import Admin from "@/pages/Admin";
import Keys from "@/pages/Keys";
import Api from "@/pages/Api";
import Dashboard from "@/pages/Dashboard";
import { createContext, useState, useEffect, useContext } from "react";
import { toast } from "sonner";
import ErrorBoundary from "@/components/ErrorBoundary";

interface AuthContextType {
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isSynced: boolean;
  setIsAuthenticated: (value: boolean) => void;
  setIsSuperAdmin: (value: boolean) => void;
  setSynced: (value: boolean) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isSuperAdmin: false,
  isSynced: false,
  setIsAuthenticated: (value: boolean) => {},
  setIsSuperAdmin: (value: boolean) => {},
  setSynced: (value: boolean) => {},
  logout: () => {},
});

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isSynced } = useContext(AuthContext);
  
  useEffect(() => {
    console.log('[ProtectedRoute] 认证状态检查:', {
      isSynced,
      isAuthenticated,
      localStorageAuth: localStorage.getItem('isAuthenticated')
    });
  }, [isAuthenticated, isSynced]);

  if (!isSynced) {
    console.log('[ProtectedRoute] 状态同步中，显示加载状态');
    return <div className="flex items-center justify-center h-screen">验证中...</div>;
  }

  if (!isAuthenticated) {
    console.log('[ProtectedRoute] 用户未认证，重定向到登录页');
    toast.error('请先登录系统');
    return <Navigate to="/admin" replace />;
  }

  console.log('[ProtectedRoute] 用户已认证，允许访问');
  return children;
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const auth = localStorage.getItem('isAuthenticated') === 'true';
    console.log('[App] 初始化认证状态:', auth);
    return auth;
  });
  const [isSuperAdmin, setIsSuperAdmin] = useState(() => {
    const admin = localStorage.getItem('isSuperAdmin') === 'true';
    console.log('[App] 初始化管理员状态:', admin);
    return admin;
  });
  const [isSynced, setSynced] = useState(false);

  useEffect(() => {
    console.log('[App] 更新认证状态:', {
      isAuthenticated,
      isSuperAdmin,
      localStorageAuth: localStorage.getItem('isAuthenticated'),
      localStorageAdmin: localStorage.getItem('isSuperAdmin')
    });

    localStorage.setItem('isAuthenticated', String(isAuthenticated));
    localStorage.setItem('isSuperAdmin', String(isSuperAdmin));
    
    const syncTimer = setTimeout(() => {
      console.log('[App] 状态同步完成');
      setSynced(true);
    }, 500); // 增加同步延迟确保稳定性
    
    return () => clearTimeout(syncTimer);
  }, [isAuthenticated, isSuperAdmin]);

  const logout = () => {
    console.log('[App] 用户登出');
    setIsAuthenticated(false);
    setIsSuperAdmin(false);
    setSynced(false);
    localStorage.removeItem("isSuperAdmin");
    localStorage.removeItem("isAuthenticated");
  };

  return (
    <ErrorBoundary>
      <AuthContext.Provider
        value={{ 
          isAuthenticated, 
          isSuperAdmin, 
          isSynced,
          setIsAuthenticated, 
          setIsSuperAdmin,
          setSynced,
          logout 
        }}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<Admin />} />
          <Route 
            path="/api" 
            element={
              <ProtectedRoute>
                <Api />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/keys" 
            element={
              <ProtectedRoute>
                <Keys />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}
