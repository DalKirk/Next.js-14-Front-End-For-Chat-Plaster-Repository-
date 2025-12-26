'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
  SparklesIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
  PhotoIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ChatBubbleLeftRightIcon as ChatIconSolid,
  UserCircleIcon as UserIconSolid,
  SparklesIcon as SparklesIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  WrenchScrewdriverIcon as WrenchScrewdriverIconSolid,
  PhotoIcon as PhotoIconSolid,
  CommandLineIcon as CommandLineIconSolid,
} from '@heroicons/react/24/solid';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  iconSolid: React.ElementType;
  label: string;
}

const navItems: NavItem[] = [
  {
    name: 'Home',
    path: '/',
    icon: HomeIcon,
    iconSolid: HomeIconSolid,
    label: 'Home'
  },
  {
    name: 'Pluto',
    path: '/game-builder',
    icon: SparklesIcon, // Will be replaced with emoji
    iconSolid: SparklesIconSolid, // Will be replaced with emoji
    label: 'Pluto - Game Builder'
  },
  {
    name: 'Image Analysis',
    path: '/image-analysis',
    icon: PhotoIcon,
    iconSolid: PhotoIconSolid,
    label: 'Snapshot Analyzer'
  },
  {
    name: '3D Generator',
    path: '/3d-generator',
    icon: SparklesIcon, // Will be replaced with emoji
    iconSolid: SparklesIconSolid, // Will be replaced with emoji
    label: 'Gen-3D'
  },
  {
    name: 'Hacking Terminal',
    path: '/hacking-terminal',
    icon: CommandLineIcon,
    iconSolid: CommandLineIconSolid,
    label: 'Penetration Testing Simulator'
  },
  {
    name: 'Rooms',
    path: '/chat',
    icon: ChatBubbleLeftRightIcon,
    iconSolid: ChatIconSolid,
    label: 'Chat Rooms'
  },
  {
    name: 'Profile',
    path: '/profile',
    icon: UserCircleIcon,
    iconSolid: UserIconSolid,
    label: 'User Profile'
  },
  {
    name: 'Dev Notes',
    path: '/dev-notes',
    icon: DocumentTextIcon,
    iconSolid: DocumentTextIconSolid,
    label: 'Developer Notes & Updates'
  },
  {
    name: 'Tools',
    path: '/tools',
    icon: WrenchScrewdriverIcon,
    iconSolid: WrenchScrewdriverIconSolid,
    label: 'Tools & Settings'
  },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <aside 
      className="sidebar-fixed"
      style={{
        backgroundColor: '#000000',
        borderRight: '1px solid rgb(51 65 85 / 0.5)',
        boxShadow: '2px 0 12px rgba(34, 197, 94, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Navigation Items */}
      <nav style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        {navItems.map((item, index) => {
          const active = isActive(item.path);
          const Icon = active ? item.iconSolid : item.icon;
          const isPluto = item.name === 'Pluto';
          const isPineapple = item.name === 'Image Analysis';
          const is3DGen = item.name === '3D Generator';
          
          return (
            <motion.button
              key={item.name}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => router.push(item.path)}
              className={`
                relative w-10 h-10 rounded-lg flex items-center justify-center
                transition-all duration-200 group
                ${active 
                  ? 'bg-gradient-to-br from-green-500 to-emerald-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]' 
                  : 'bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 hover:bg-slate-800/60 border border-slate-700/50 hover:border-green-500/50'
                }
              `}
              title={item.label}
            >
              {isPluto ? (
                <span className="text-xl">🪐</span>
              ) : isPineapple ? (
                <span className="text-xl">📸</span>
              ) : is3DGen ? (
                <span className="text-xl">🧊</span>
              ) : (
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    active 
                      ? 'text-black' 
                      : 'text-slate-400 group-hover:text-green-400'
                  }`}
                />
              )}

              {/* Hover tooltip */}
              <div className="absolute left-full ml-2 px-3 py-1.5 bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 backdrop-blur-xl border border-slate-700/50 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
                <span className="text-sm text-slate-300 font-medium">{item.label}</span>
              </div>
            </motion.button>
          );
        })}
      </nav>
    </aside>
  );
}
