
import React, { useState, useEffect, useRef } from 'react';
import { Project, ProjectMetadata } from '../types';
import { STAGES } from '../constants';
import { Send, Bot, User, ArrowLeft, Sparkles, BrainCircuit, MapPin, Hammer, FileText, AlertTriangle } from 'lucide-react';
import FixedFooter from './FixedFooter';

interface AIAgentProps {
  projects: Project[];
  onBack: () => void;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const KNOWLEDGE_BASE: {[key: string]: string} = {
  'phong thủy': "Dạ, về phong thủy, Tân Phát chú trọng sự hài hòa giữa công năng và dòng khí đối lưu. Chúng tôi thường tư vấn:\n- Bếp không đặt đối diện WC.\n- Cầu thang không hướng thẳng ra cửa chính.\n- Kích thước cửa theo thước Lỗ Ban.",
  'hướng nhà': "Dạ, việc chọn hướng nhà còn tùy thuộc vào tuổi gia chủ. Tuy nhiên, với khí hậu nhiệt đới, hướng Nam hoặc Đông Nam thường được ưu tiên để đón gió mát.",
  'đơn giá': "Thưa anh/chị, đơn giá thiết kế tiêu chuẩn năm nay của Tân Phát dao động tùy theo quy mô và phong cách (Cổ điển/Hiện đại). Anh/Chị vui lòng liên hệ hotline 09x.xxx.xxx để được báo giá chi tiết nhất ạ.",
  'quy trình': "Dạ, quy trình làm việc chuẩn của Tân Phát gồm **9 bước** chặt chẽ:\n1. Khảo sát\n2. Concept\n3. Xin phép XD\n4. 3D Nội thất\n5. Kết cấu\n6. Điện nước\n7. Triển khai kiến trúc\n8. Kiểm soát\n9. Bàn giao & Chọn vật liệu.",
  'mật độ': "Dạ, mật độ xây dựng phụ thuộc vào quy hoạch từng khu vực (lộ giới, diện tích đất). Anh/Chị có thể cung cấp sổ đỏ để bộ phận pháp lý của Tân Phát tra cứu chính xác ạ."
};

const AIAgent: React.FC<AIAgentProps> = ({ projects, onBack }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: 'Dạ, chào anh/chị! Em là Trợ lý ảo của Tân Phát.\nEm có thể giúp anh/chị kiểm tra workload nhân sự, tiến độ thi công, hoặc cảnh báo các dự án chậm trễ ạ.',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const calculateProgress = (project: Project) => {
    let progress = 0;
    if (!project.stageData) return 0;
    STAGES.forEach(stage => {
      const data = project.stageData[stage.id];
      if (data && data.checkedItems) {
        const checkedCount = data.checkedItems.filter(Boolean).length;
        const totalItems = stage.items.length;
        if (totalItems > 0) progress += (checkedCount / totalItems) * stage.percentage;
      }
    });
    return Math.min(100, progress);
  };

  const scanWorkload = (query: string): string | null => {
    const lowerQuery = query.toLowerCase();
    const personnelMap = new Map<string, string[]>();
    
    projects.forEach(p => {
      const meta = p.metadata;
      const roles = [
        { val: meta.ktsChuTri, role: 'KTS Chủ trì' },
        { val: meta.noiThatChuTri, role: 'NT' },
        { val: meta.hoSoThiCongChuTri, role: 'HSTC' },
        { val: meta.tuVanChamKhach, role: 'Tư vấn' }
      ];

      roles.forEach(r => {
        if (r.val && lowerQuery.includes(r.val.toLowerCase().split(' ').pop() || 'xyz')) {
           const key = r.val.trim();
           const current = personnelMap.get(key) || [];
           current.push(`${p.metadata.chuDauTu || p.tenDuAn} (${r.role})`);
           personnelMap.set(key, current);
        }
      });
    });

    if (personnelMap.size > 0) {
      let msg = "";
      personnelMap.forEach((list, name) => {
        msg += `Dạ, KTS **${name}** đang tham gia **${list.length}** dự án:\n` + list.map(i => `- ${i}`).join('\n') + "\n";
      });
      return msg;
    }
    return null;
  };

  const scanDesignDelays = (): string => {
    const now = new Date();
    const delayed = projects.filter(p => {
       if (p.metadata?.isConstruction) return false;
       const startDateStr = p.metadata?.ngayTraoDoi || p.metadata?.ngayThiCong;
       if (!startDateStr) return false;
       
       const start = new Date(startDateStr);
       const diffDays = (now.getTime() - start.getTime()) / (1000 * 3600 * 24);
       
       return diffDays > 90 && calculateProgress(p) < 100;
    });

    if (delayed.length === 0) return "Dạ, tin tốt là không có công trình thiết kế nào bị trễ hạn quá 3 tháng ạ.";
    
    return `⚠️ **CẢNH BÁO:** Có **${delayed.length}** công trình thiết kế đã quá 90 ngày chưa hoàn thành:\n` +
           delayed.map(p => `- ${p.metadata?.chuDauTu || p.tenDuAn} (${calculateProgress(p).toFixed(0)}%)`).join('\n');
  };

  const handleAIQuery = (query: string): string => {
    const lower = query.toLowerCase();

    if (lower.includes('bao nhiêu dự án') || lower.includes('công việc của') || lower.includes('chủ trì')) {
       const workload = scanWorkload(query);
       if (workload) return workload;
    }

    if (lower.includes('đang thi công') || lower.includes('xây dựng')) {
       const construction = projects.filter(p => p.metadata?.isConstruction);
       if (construction.length === 0) return "Dạ, hiện chưa có công trình nào đang ở giai đoạn thi công.";
       return `Dạ, danh sách **${construction.length}** công trình đang THI CÔNG:\n` + 
              construction.map(p => `- ${p.metadata?.chuDauTu || p.tenDuAn} [${p.metadata?.diaChi || ''}]`).join('\n');
    }

    if (lower.includes('trễ hạn') || lower.includes('chậm') || lower.includes('thiết kế lâu')) {
       return scanDesignDelays();
    }

    for (const key in KNOWLEDGE_BASE) {
      if (lower.includes(key)) return KNOWLEDGE_BASE[key];
    }

    if (lower.includes('xin chào') || lower.includes('hello')) return "Dạ, em chào anh/chị. Chúc anh/chị một ngày làm việc hiệu quả!";
    
    return "Dạ, vấn đề này chuyên sâu hoặc em chưa có dữ liệu. Anh/Chị có thể hỏi em về:\n- Workload nhân sự (vd: Huy chủ trì bao nhiêu?)\n- Tiến độ (vd: Dự án nào đang thi công?)\n- Cảnh báo trễ hạn.";
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const responseText = handleAIQuery(userMsg.text);
      const aiMsg: Message = { id: (Date.now() + 1).toString(), text: responseText, sender: 'ai', timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 relative pb-12">
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm z-10 sticky top-0">
        <div className="flex items-center gap-3">
           <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800">
              <ArrowLeft className="w-5 h-5" />
           </button>
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <BrainCircuit size={20} className="text-white" />
             </div>
             <div>
               <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
                 Tân Phát AI Assistant <Sparkles size={14} className="text-yellow-500 fill-yellow-500" />
               </h1>
               <div className="flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Gemini Lite Simulation</span>
               </div>
             </div>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 mb-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
             {msg.sender === 'ai' && (
               <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center mr-3 flex-shrink-0 shadow-sm mt-1">
                 <Bot size={18} className="text-purple-600" />
               </div>
             )}
             <div className={`max-w-[85%] md:max-w-[65%] p-4 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
               msg.sender === 'user' ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
             }`}>
               {msg.text.split('**').map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
             </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start items-center gap-3 ml-11 animate-fade-in">
            <div className="bg-slate-200/50 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white p-4 border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-10">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
           {[
             { icon: <User size={12}/>, text: "Workload nhân sự?" },
             { icon: <Hammer size={12}/>, text: "Công trình nào đang thi công?" },
             { icon: <AlertTriangle size={12}/>, text: "Cảnh báo thiết kế trễ hạn?" },
             { icon: <FileText size={12}/>, text: "Quy trình thiết kế?" }
           ].map((chip, idx) => (
             <button key={idx} onClick={() => setInput(chip.text)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-purple-50 hover:text-purple-700 border border-slate-200 rounded-lg text-xs font-bold transition-all whitespace-nowrap">
               {chip.icon} {chip.text}
             </button>
           ))}
        </div>
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Nhập câu hỏi..." className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium text-slate-700" />
          <button onClick={handleSend} disabled={!input.trim()} className="p-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg transition-all disabled:opacity-50"><Send size={20} /></button>
        </div>
      </div>
      <FixedFooter view="AI_AGENT" />
    </div>
  );
};

export default AIAgent;
