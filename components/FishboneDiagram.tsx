
import React from 'react';
import { Project } from '../types';
import { STAGES } from '../constants';
import { CheckCircle2, Circle, AlertCircle, FileCheck2 } from 'lucide-react';

interface FishboneDiagramProps {
  project: Project;
  totalProgress: number;
}

const FishboneDiagram: React.FC<FishboneDiagramProps> = ({ project }) => {
  const getStageStatus = (stageId: number) => {
    const stageDef = STAGES.find(s => s.id === stageId);
    if (!stageDef) return 'red'; // Default to red if undefined
    const data = project.stageData[stageId];
    if (!data) return 'red';
    
    // Check if all items are true
    const allChecked = data.checkedItems.length === stageDef.items.length && data.checkedItems.every(Boolean);
    
    // Strict Binary: Green if 100% done, otherwise Red.
    return allChecked ? 'green' : 'red';
  };

  const getPendingCount = (stageId: number) => {
    const data = project.stageData[stageId];
    if (!data) return STAGES.find(s => s.id === stageId)?.items.length || 0;
    return data.checkedItems.filter(item => !item).length;
  };

  return (
    <div className="w-full relative overflow-hidden rounded-xl border border-slate-200 bg-white">
      
      <div className="relative z-10 w-full p-4 md:p-12 overflow-x-auto">
        <div className="min-w-[1000px] flex flex-col items-center">
          
          {/* Header */}
          <div className="mb-20 text-center relative">
            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-[0.15em] mb-2 font-sans">
              Quy Trình Hồ Sơ
            </h2>
            <div className="flex items-center justify-center gap-3">
               <div className="h-0.5 w-16 bg-red-600"></div>
               <div className="text-slate-900 font-bold tracking-widest text-xs uppercase"><span className="text-red-600">TÂN PHÁT</span> TOTE & BUILDING</div>
               <div className="h-0.5 w-16 bg-red-600"></div>
            </div>
          </div>

          {/* Main Diagram Area */}
          <div className="relative w-full max-w-6xl py-10">
            
            {/* The Spine (Central Line) - Solid Black */}
            <div className="absolute top-1/2 left-0 right-36 h-[2px] bg-slate-900 rounded-full -translate-y-1/2 z-0"></div>

            {/* The Head (Arrow Goal) - REDESIGNED */}
            <div 
                className="absolute top-1/2 right-0 -translate-y-1/2 z-20 w-52 h-36 flex flex-col items-center justify-center shadow-2xl drop-shadow-2xl bg-gradient-to-br from-red-600 via-red-700 to-red-900"
                style={{ 
                    clipPath: "polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%, 10% 50%)",
                }}
            >
               <div className="text-center pr-2 pl-4 flex flex-col items-center">
                  <div className="p-2 bg-white/10 rounded-full mb-1 border border-white/20">
                     <FileCheck2 size={28} className="text-white" />
                  </div>
                  <div className="text-base font-black uppercase text-white tracking-widest leading-none mb-1 text-shadow">HỒ SƠ</div>
                  <div className="text-xs font-bold text-red-100 uppercase tracking-wide">THI CÔNG</div>
               </div>
            </div>

            {/* The Ribs (Nodes) */}
            <div className="relative z-10 grid grid-cols-5 gap-y-36 gap-x-6 w-[90%]">
               {/* Top row: 1, 3, 5, 7, 9. Bottom row: 2, 4, 6, 8 */}
               {STAGES.map((stage, index) => {
                 const isTop = index % 2 === 0;
                 const status = getStageStatus(stage.id);
                 const pendingCount = getPendingCount(stage.id);
                 
                 // STRICT RED/GREEN THEME LOGIC
                 let cardBg, cardBorder, textColor, badgeBg, icon;

                 if (status === 'green') {
                   // COMPLETED
                   cardBg = "bg-green-50";
                   cardBorder = "border-green-600 ring-1 ring-green-600";
                   textColor = "text-green-700";
                   badgeBg = "bg-green-600 text-white";
                   icon = <CheckCircle2 size={18} className="text-green-600" />;
                 } else {
                   // INCOMPLETE (RED)
                   cardBg = "bg-red-50";
                   cardBorder = "border-red-600";
                   textColor = "text-red-600";
                   badgeBg = "bg-red-600 text-white";
                   icon = <AlertCircle size={18} className="text-red-600" />;
                 }

                 // Missing Items Logic
                 const data = project.stageData[stage.id];
                 let missingItems: string[] = [];
                 if (data && status !== 'green') {
                    const uncheckedIndices = data.checkedItems
                       .map((checked, i) => checked ? -1 : i)
                       .filter(i => i !== -1);
                    missingItems = uncheckedIndices.slice(0, 2).map(i => stage.items[i]);
                 }

                 // Grid positioning
                 const colStart = Math.floor(index / 2) + 1;
                 const rowStart = isTop ? 1 : 2;

                 return (
                   <div 
                      key={stage.id}
                      className={`flex flex-col items-center relative group`}
                      style={{ 
                        gridColumn: colStart, 
                        gridRow: rowStart,
                        marginTop: isTop ? '0' : '3rem',
                        marginBottom: isTop ? '3rem' : '0'
                      }}
                   >
                      {/* Node Card */}
                      <div className={`
                        relative w-48 p-4 rounded-xl border transition-all duration-300 transform group-hover:-translate-y-2
                        ${cardBg} ${cardBorder} shadow-lg
                      `}>
                         {/* Number Badge */}
                         <div className={`absolute -top-4 -left-2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm z-30 ${badgeBg}`}>
                           {index + 1}
                         </div>
                         
                         <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 mt-1 ${textColor}`}>Giai đoạn {index + 1}</div>
                         
                         {/* UPDATED LABEL LOGIC */}
                         <div className={`text-sm font-bold leading-tight mb-3 min-h-[2.5em] flex flex-col justify-center ${textColor}`}>
                           <span>{stage.title.split(':')[1] || stage.title}</span>
                           <span className="text-[10px] opacity-80 font-normal mt-0.5">
                             ({status === 'green' ? 'Hoàn thành' : `${pendingCount} công tác chưa xong`})
                           </span>
                         </div>
                         
                         <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 mt-auto">
                           {/* STATUS TEXT */}
                           <span className={`text-[10px] font-bold ${status === 'green' ? 'text-green-600' : 'text-red-600'}`}>
                             {status === 'green' ? 'Đã duyệt' : 'Đang thực hiện'}
                           </span>
                           {icon}
                         </div>

                         {/* Missing Items Preview */}
                         {missingItems.length > 0 && (
                            <div className="mt-2 pt-1">
                               {missingItems.map((item, i) => (
                                 <div key={i} className="text-[10px] text-slate-500 truncate flex items-center gap-1.5 opacity-80">
                                   <div className="w-1 h-1 rounded-full bg-red-600"></div> {item}
                                 </div>
                               ))}
                            </div>
                         )}
                      </div>

                      {/* Connector Line to Spine */}
                      <div 
                        className="absolute w-[1px] h-24 z-0 bg-slate-900"
                        style={{
                          bottom: isTop ? '-3rem' : 'auto',
                          top: isTop ? 'auto' : '-3rem',
                        }}
                      >
                        <div className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full border border-slate-900 bg-white ${isTop ? 'bottom-0' : 'top-0'}`}></div>
                      </div>

                   </div>
                 );
               })}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default FishboneDiagram;
