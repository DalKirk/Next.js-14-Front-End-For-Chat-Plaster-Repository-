import React from 'react';
import { Terminal, Wifi, Server, Monitor, Lock, Unlock, Award, Target, Flag } from 'lucide-react';

export const TerminalHeader = ({ currentTarget, network, score, compromisedHosts, currentUser }) => {
  const getStatusIcon = () => {
    if (!currentTarget) return <Terminal className="w-4 h-4" />;
    const type = network[currentTarget].type;
    const icons = {
      router: <Wifi className="w-4 h-4" />,
      server: <Server className="w-4 h-4" />,
      workstation: <Monitor className="w-4 h-4" />
    };
    return icons[type] || <Terminal className="w-4 h-4" />;
  };

  return (
    <>
      <div className="bg-gray-950 px-4 py-3 flex items-center justify-between border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <span className="text-green-400 font-mono text-sm font-semibold">
            {currentTarget ? `${network[currentTarget].name} - ${currentTarget}` : 'Kali Linux'}
          </span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-400 font-mono">Score: {score}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-gray-400 font-mono">
              Compromised: {compromisedHosts.length}/{Object.keys(network).length}
            </span>
          </div>

          {currentTarget && (
            <div className="flex items-center gap-2">
              {currentUser === 'root' ? (
                <Unlock className="w-4 h-4 text-red-400" />
              ) : (
                <Lock className="w-4 h-4 text-yellow-400" />
              )}
              <span className="text-xs text-gray-400 font-mono">{currentUser}</span>
            </div>
          )}
          
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
        </div>
      </div>

      {/* Status Bar at bottom */}
      <div className="bg-gray-950 px-4 py-2 border-t border-gray-700 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Flag className="w-3 h-3 text-cyan-400" />
            <span>Mission: Compromise entire network</span>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 font-mono">
          Documentation panel on the right →
        </div>
      </div>
    </>
  );
};
