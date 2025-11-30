import React from 'react';
import { Minus, Square, X } from 'lucide-react';

/**
 * Custom title bar for frameless Electron window
 * Provides window controls and app branding
 */
function TitleBar() {
  return (
    <div className="h-12 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 select-none drag-region">
      {/* App branding */}
      <div className="flex items-center ml-2">
        <img src="/o.png" alt="RTGS" className="h-10 w-auto" />
      </div>

      {/* Window controls */}
      <div className="flex items-center space-x-2 no-drag">
        <button
          onClick={() => window.electron.minimizeWindow()}
          className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 rounded transition-colors"
          title="Minimize"
        >
          <Minus size={16} className="text-slate-400" />
        </button>
        <button
          onClick={() => window.electron.maximizeWindow()}
          className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 rounded transition-colors"
          title="Maximize"
        >
          <Square size={14} className="text-slate-400" />
        </button>
        <button
          onClick={() => window.electron.closeWindow()}
          className="w-8 h-8 flex items-center justify-center hover:bg-red-600 rounded transition-colors"
          title="Close"
        >
          <X size={16} className="text-slate-400 hover:text-white" />
        </button>
      </div>
    </div>
  );
}

export default TitleBar;
