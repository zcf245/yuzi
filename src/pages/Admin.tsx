import { useState, useContext, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { AuthContext } from "@/App";
import Navbar from "@/components/Navbar";
import LogViewer from '@/components/LogViewer';
import { logger } from '@/lib/logger';

type FormData = {
  email: string;
  password: string;
  rememberMe: boolean;
};

type UserFormData = {
  email: string;
  password: string;
  isSuperAdmin: boolean;
};

type EditUserFormData = {
  email: string;
  password: string;
  isSuperAdmin: boolean;
};

const ADMIN_CREDENTIALS = [
  {
    email: "admin@example.com",
    password: "admin123",
    isSuperAdmin: true
  },
  {
    email: "user@example.com",
    password: "user123",
    isSuperAdmin: false
  }
];

// 测试账号信息：
// 管理员: admin@example.com / admin123
// 普通用户: user@example.com / user123

export default function Admin() {
  const { isAuthenticated, setIsAuthenticated, setIsSuperAdmin, setSynced, isSuperAdmin } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'users' | 'settings' | 'logs'>('login');
  const [users, setUsers] = useState(() => {
    // 从localStorage获取用户数据，如果没有则使用默认数据
    const savedUsers = localStorage.getItem('users');
    if (savedUsers) {
      return JSON.parse(savedUsers);
    }
    // 初始化时保存默认用户数据到localStorage
    localStorage.setItem('users', JSON.stringify(ADMIN_CREDENTIALS));
    return ADMIN_CREDENTIALS;
  });

  // 添加useEffect来处理页面加载时的状态
  useEffect(() => {
    if (isAuthenticated && isSuperAdmin) {
      setActiveTab('users');
    }
  }, [isAuthenticated, isSuperAdmin]);

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserFormData | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<FormData>();

  const {
    register: registerUser,
    handleSubmit: handleSubmitUser,
    formState: { errors: userErrors },
    reset: resetUser
  } = useForm<UserFormData>();

  const {
    register: registerEditUser,
    handleSubmit: handleSubmitEditUser,
    formState: { errors: editUserErrors },
    reset: resetEditUser
  } = useForm<EditUserFormData>();

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    console.log('[Admin] 登录请求开始:', data.email);
    
    // 模拟API请求延迟
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const user = users.find(
      cred => cred.email === data.email && cred.password === data.password
    );

    if (user) {
      console.log('[Admin] 登录成功，用户:', user.email);
      
      // 记录登录日志
      logger.log(user.email, '登录', '用户登录成功');
      
      // 重置同步状态
      setSynced(false);
      
      // 更新状态
      setIsAuthenticated(true);
      setIsSuperAdmin(user.isSuperAdmin);
      
      // 设置localStorage
      localStorage.setItem("isSuperAdmin", String(user.isSuperAdmin));
      localStorage.setItem("isAuthenticated", "true");
      
      // 如果选择了记住密码，保存登录信息
      if (data.rememberMe) {
        localStorage.setItem("rememberedEmail", data.email);
        localStorage.setItem("rememberedPassword", data.password);
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedPassword");
      }
      
      console.log('[Admin] 状态更新完成，准备导航');
      toast.success("登录成功");
      
      // 确保状态完全同步后再导航
      setTimeout(() => {
        console.log('[Admin] 执行导航');
        if (user.isSuperAdmin) {
          setActiveTab('users');
        } else {
          navigate("/keys", { replace: true });
        }
      }, 500);
    } else {
      console.log('[Admin] 登录失败: 用户名或密码错误');
      toast.error("用户名或密码错误");
    }
    setIsLoading(false);
  };

  const onAddUser = async (data: UserFormData) => {
    // 检查邮箱是否已存在
    if (users.some(user => user.email === data.email)) {
      toast.error("该邮箱已被注册");
      return;
    }

    // 添加新用户
    const newUser = {
      email: data.email,
      password: data.password,
      isSuperAdmin: data.isSuperAdmin
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    // 保存到localStorage
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    setShowAddUserModal(false);
    resetUser();
    toast.success("添加用户成功");

    // 记录添加用户日志
    logger.log(data.email, '添加用户', `添加新用户: ${data.email}`);
  };

  const onEditUser = async (data: EditUserFormData) => {
    if (!editingUser) return;

    // 检查邮箱是否已被其他用户使用
    if (data.email !== editingUser.email && users.some(user => user.email === data.email)) {
      toast.error("该邮箱已被注册");
      return;
    }

    // 更新用户信息
    const updatedUsers = users.map(user => 
      user.email === editingUser.email 
        ? { 
            ...user, 
            email: data.email, 
            // 如果密码为空，保持原密码不变
            password: data.password || user.password, 
            isSuperAdmin: data.isSuperAdmin 
          }
        : user
    );

    setUsers(updatedUsers);
    // 保存到localStorage
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    setShowEditUserModal(false);
    setEditingUser(null);
    resetEditUser();
    toast.success("更新用户成功");

    // 记录编辑用户日志
    logger.log(data.email, '编辑用户', `编辑用户信息: ${data.email}`);
  };

  const onDeleteUser = (email: string) => {
    // 不允许删除最后一个超级管理员
    const superAdminCount = users.filter(user => user.isSuperAdmin).length;
    const userToDelete = users.find(user => user.email === email);
    
    if (userToDelete?.isSuperAdmin && superAdminCount <= 1) {
      toast.error("不能删除最后一个超级管理员");
      return;
    }

    const updatedUsers = users.filter(user => user.email !== email);
    setUsers(updatedUsers);
    // 保存到localStorage
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    toast.success("删除用户成功");

    // 记录删除用户日志
    logger.log(email, '删除用户', `删除用户: ${email}`);
  };

  // 如果未登录，显示登录表单
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A192F] flex items-center justify-center p-4 relative overflow-hidden">
        {/* 粒子背景 */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-[#00D1FF]/20"
              style={{
                width: Math.random() * 10 + 5,
                height: Math.random() * 10 + 5,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`
              }}
              animate={{
                x: [0, Math.random() * 100 - 50],
                y: [0, Math.random() * 100 - 50],
                opacity: [0.2, 0.8, 0.2]
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            />
          ))}
        </div>

        {/* 登录表单 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-[#0A192F]/70 backdrop-blur-sm rounded-xl border border-[#00D1FF]/30 p-8 shadow-lg relative z-10"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#00D1FF] mb-2">管理员登录</h1>
            <p className="text-white/80">请输入您的管理员凭据</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1">
                电子邮箱
              </label>
              <input
                id="email"
                type="email"
                {...register("email", { required: "请输入邮箱" })}
                className={`w-full px-4 py-3 bg-[#0A192F]/50 border ${
                  errors.email ? "border-red-500" : "border-[#00D1FF]/50"
                } rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00D1FF] focus:border-transparent transition-all`}
                placeholder="admin@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-1">
                密码
              </label>
              <input
                id="password"
                type="password"
                {...register("password", { required: "请输入密码" })}
                className={`w-full px-4 py-3 bg-[#0A192F]/50 border ${
                  errors.password ? "border-red-500" : "border-[#00D1FF]/50"
                } rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00D1FF] focus:border-transparent transition-all`}
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  {...register("rememberMe")}
                  className="form-checkbox text-[#00D1FF]"
                />
                <span className="text-white/80">记住密码</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-[#00D1FF] hover:bg-[#00D1FF]/90 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "登录中..." : "登录"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // 如果已登录，显示管理员控制台
  return (
    <div className="min-h-screen bg-[#0A192F] text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#00D1FF]">管理员控制台</h1>
        </div>

        {/* 侧边栏 */}
        <div className="flex gap-6">
          <div className="w-64 bg-[#0A192F]/70 backdrop-blur-sm rounded-xl border border-[#00D1FF]/30 p-4">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full text-left px-4 py-2 rounded-lg ${
                  activeTab === 'users' ? 'bg-[#00D1FF]/10 text-[#00D1FF]' : 'text-white/80 hover:bg-[#00D1FF]/5'
                }`}
              >
                <i className="fa-solid fa-users mr-2"></i>
                用户管理
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`w-full text-left px-4 py-2 rounded-lg ${
                  activeTab === 'logs' ? 'bg-[#00D1FF]/10 text-[#00D1FF]' : 'text-white/80 hover:bg-[#00D1FF]/5'
                }`}
              >
                <i className="fa-solid fa-list mr-2"></i>
                操作日志
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full text-left px-4 py-2 rounded-lg ${
                  activeTab === 'settings' ? 'bg-[#00D1FF]/10 text-[#00D1FF]' : 'text-white/80 hover:bg-[#00D1FF]/5'
                }`}
              >
                <i className="fa-solid fa-gear mr-2"></i>
                系统设置
              </button>
            </nav>
          </div>

          {/* 主内容区 */}
          <div className="flex-1 bg-[#0A192F]/70 backdrop-blur-sm rounded-xl border border-[#00D1FF]/30 p-6">
            {activeTab === 'users' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">用户管理</h2>
                  <button
                    onClick={() => setShowAddUserModal(true)}
                    className="px-4 py-2 bg-[#00D1FF]/10 border border-[#00D1FF]/50 text-[#00D1FF] rounded-lg hover:bg-[#00D1FF]/20"
                  >
                    <i className="fa-solid fa-plus mr-2"></i>
                    添加用户
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#00D1FF]/30">
                        <th className="text-left py-2 text-white/80">邮箱</th>
                        <th className="text-left py-2 text-white/80">角色</th>
                        <th className="text-left py-2 text-white/80">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.email} className="border-b border-[#00D1FF]/10 hover:bg-[#00D1FF]/5">
                          <td className="py-2 text-white/90">{user.email}</td>
                          <td className="py-2 text-white/80">
                            {user.isSuperAdmin ? '超级管理员' : '普通用户'}
                          </td>
                          <td className="py-2 space-x-2">
                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setShowEditUserModal(true);
                              }}
                              className="px-3 py-1 bg-[#00D1FF]/20 text-[#00D1FF] rounded-lg hover:bg-[#00D1FF]/30 text-sm"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => onDeleteUser(user.email)}
                              className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 text-sm"
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">操作日志</h2>
                <LogViewer />
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">系统设置</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-[#0A192F]/50 rounded-lg border border-[#00D1FF]/30">
                    <h3 className="text-lg font-medium mb-2">安全设置</h3>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="form-checkbox text-[#00D1FF]" />
                        <span>启用双因素认证</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="form-checkbox text-[#00D1FF]" />
                        <span>登录失败锁定</span>
                      </label>
                    </div>
                  </div>
                  <div className="p-4 bg-[#0A192F]/50 rounded-lg border border-[#00D1FF]/30">
                    <h3 className="text-lg font-medium mb-2">通知设置</h3>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="form-checkbox text-[#00D1FF]" />
                        <span>异常登录通知</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="form-checkbox text-[#00D1FF]" />
                        <span>系统更新通知</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 添加用户模态框 */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0A192F] rounded-xl border border-[#00D1FF]/30 p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">添加用户</h3>
            <form onSubmit={handleSubmitUser(onAddUser)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  电子邮箱
                </label>
                <input
                  type="email"
                  {...registerUser("email", { required: "请输入邮箱" })}
                  className="w-full px-4 py-2 bg-[#0A192F]/50 border border-[#00D1FF]/50 rounded-lg text-white"
                />
                {userErrors.email && (
                  <p className="mt-1 text-sm text-red-500">{userErrors.email.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  密码
                </label>
                <input
                  type="password"
                  {...registerUser("password", { required: "请输入密码" })}
                  className="w-full px-4 py-2 bg-[#0A192F]/50 border border-[#00D1FF]/50 rounded-lg text-white"
                />
                {userErrors.password && (
                  <p className="mt-1 text-sm text-red-500">{userErrors.password.message}</p>
                )}
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...registerUser("isSuperAdmin")}
                    className="form-checkbox text-[#00D1FF]"
                  />
                  <span>超级管理员权限</span>
                </label>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUserModal(false);
                    resetUser();
                  }}
                  className="px-4 py-2 text-white/80 hover:text-white"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00D1FF] text-white rounded-lg hover:bg-[#00D1FF]/90"
                >
                  添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 编辑用户模态框 */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0A192F] rounded-xl border border-[#00D1FF]/30 p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">编辑用户</h3>
            <form onSubmit={handleSubmitEditUser(onEditUser)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  电子邮箱
                </label>
                <input
                  type="email"
                  defaultValue={editingUser.email}
                  {...registerEditUser("email", { required: "请输入邮箱" })}
                  className="w-full px-4 py-2 bg-[#0A192F]/50 border border-[#00D1FF]/50 rounded-lg text-white"
                />
                {editUserErrors.email && (
                  <p className="mt-1 text-sm text-red-500">{editUserErrors.email.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  密码
                </label>
                <input
                  type="password"
                  placeholder="留空表示不修改"
                  {...registerEditUser("password")}
                  className="w-full px-4 py-2 bg-[#0A192F]/50 border border-[#00D1FF]/50 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    defaultChecked={editingUser.isSuperAdmin}
                    {...registerEditUser("isSuperAdmin")}
                    className="form-checkbox text-[#00D1FF]"
                  />
                  <span>超级管理员权限</span>
                </label>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditUserModal(false);
                    setEditingUser(null);
                    resetEditUser();
                  }}
                  className="px-4 py-2 text-white/80 hover:text-white"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00D1FF] text-white rounded-lg hover:bg-[#00D1FF]/90"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
