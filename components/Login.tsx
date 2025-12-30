
import React, { useState } from 'react';
import { Lock, User, Star, ExternalLink, ArrowRight } from 'lucide-react';
import FixedFooter from './FixedFooter';
import { AppLink } from '../types';

interface LoginProps {
  onLogin: () => void;
  appLinks: AppLink[];
  onToggleFavorite: (id: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, appLinks, onToggleFavorite }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (username === 'tanphatcompany' && password === 'TANPHAT') ||
      (username === '1' && password === '1')
    ) {
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 500);
    }
  };

  const handleAppClick = (url: string) => {
    if (!url || url === '#' || url === '') {
      alert("Đường dẫn chưa được cấu hình. Vui lòng liên hệ quản trị viên.");
      return;
    }
    window.open(url, '_blank');
  };

  // Sort: Favorites first
  const sortedApps = [...appLinks].sort((a, b) => {
    if (a.isFavorite === b.isFavorite) return 0;
    return a.isFavorite ? -1 : 1;
  });

  return (
    <div className="relative min-h-screen w-full bg-slate-900 overflow-y-auto overflow-x-hidden flex flex-col">
      <div 
        className="fixed inset-0 bg-cover bg-center z-0 opacity-40"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop")' }}
      ></div>
      <div className="fixed inset-0 bg-gradient-to-t from-slate-900 via-slate-900/90 to-slate-900/50 z-10 pointer-events-none"></div>

      <div className="relative z-20 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col items-center gap-8 pb-20">
        
        {/* LOGIN SECTION */}
        <div className={`w-full max-w-sm p-6 bg-slate-50/90 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl mt-4 ${error ? 'animate-shake' : ''}`}>
          
          <div className="flex flex-col items-center mb-6 text-center">
            <h2 className="text-2xl font-black leading-none tracking-tight mb-1">
              <span className="text-red-600">TÂN PHÁT</span> <span className="text-slate-900">TOTE & BUILDING</span>
            </h2>
            <p className="text-slate-500 text-[10px] italic font-medium tracking-wide">
              Luôn luôn đồng hành - Luôn luôn chia sẻ
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <User className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Tên đăng nhập"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 placeholder-slate-400 pl-9 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all shadow-sm text-sm"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                <input 
                  type="password" 
                  placeholder="Mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 placeholder-slate-400 pl-9 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all shadow-sm text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-xs font-bold text-center bg-red-100 py-2 rounded-lg border border-red-200">
                Thông tin đăng nhập không chính xác!
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-red-600/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-sm"
            >
              ĐĂNG NHẬP HỆ THỐNG
            </button>
          </form>
        </div>

        {/* APP PORTAL SECTION */}
        <div className="w-full animate-fade-in-up mt-4">
           <div className="flex items-center gap-4 mb-4">
             <div className="h-[1px] flex-1 bg-white/20"></div>
             <h3 className="text-white/60 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                <ExternalLink size={12} /> Cổng ứng dụng mở rộng
             </h3>
             <div className="h-[1px] flex-1 bg-white/20"></div>
           </div>

           {/* INCREASED GRID DENSITY: grid-cols-4 on large screens */}
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sortedApps.map((app) => (
                <div 
                  key={app.id}
                  onClick={() => handleAppClick(app.defaultUrl)}
                  className="group relative bg-slate-800/60 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden hover:bg-slate-700/80 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer flex flex-col"
                >
                  {/* Fixed Height Image Area with Fallback Background */}
                  <div className="h-40 w-full bg-slate-800 overflow-hidden relative">
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors z-10"></div>
                    <img 
                      src={app.imageUrl} 
                      alt={app.name} 
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'; // Hide broken image to show fallback bg
                      }}
                    />
                    
                    {/* Favorite Button */}
                    <button 
                       onClick={(e) => { e.stopPropagation(); onToggleFavorite(app.id); }}
                       className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-colors"
                    >
                       <Star 
                         size={14} 
                         className={`${app.isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-white'}`} 
                       />
                    </button>
                  </div>

                  {/* Content Area */}
                  <div className="p-3 flex-1 flex flex-col">
                     <h4 className="font-bold text-white text-sm leading-tight mb-1 group-hover:text-blue-400 transition-colors line-clamp-2 min-h-[2.5em]">
                       {app.name}
                     </h4>
                     <p className="text-slate-400 text-[10px] mb-3 line-clamp-2 leading-relaxed flex-1">
                       {app.description}
                     </p>
                     
                     <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-400 group-hover:text-blue-300 transition-colors mt-auto">
                        Truy cập <ArrowRight size={10} />
                     </div>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>
      
      <FixedFooter view="LOGIN" />

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
};

export default Login;
