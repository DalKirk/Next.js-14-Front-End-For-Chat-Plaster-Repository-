'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  SparklesIcon,
  PuzzlePieceIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ChatBubbleLeftRightIcon as ChatIconSolid,
  UserCircleIcon as UserIconSolid,
  Cog6ToothIcon as CogIconSolid,
  SparklesIcon as SparklesIconSolid,
  PuzzlePieceIcon as PuzzleIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  WrenchScrewdriverIcon as WrenchScrewdriverIconSolid,
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
    name: 'Berry',
    path: '/game-builder',
    icon: SparklesIcon, // Will be replaced with emoji
    iconSolid: SparklesIconSolid, // Will be replaced with emoji
    label: 'Berry - Game Builder'
  },
  {
    name: 'Rooms',
    path: '/chat',
    icon: ChatBubbleLeftRightIcon,
    iconSolid: ChatIconSolid,
    label: 'Chat Rooms'
  },
  {
    name: 'Games',
    path: '/games',
    icon: PuzzlePieceIcon,
    iconSolid: PuzzleIconSolid,
    label: 'Mini Games'
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
        borderRight: '1px solid #27272a',
        boxShadow: '2px 0 12px rgba(255, 153, 0, 0.1)',
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
          const isBerry = item.name === 'Berry';
          
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
                  ? 'bg-gradient-to-br from-[#FF9900] to-yellow-400 shadow-[0_0_15px_rgba(255,153,0,0.4)]' 
                  : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-[#FF9900]/50'
                }
              `}
              title={item.label}
            >
              {isBerry ? (
                <span className="text-xl">🫐</span>
              ) : (
                <Icon 
                  className={`w-5 h-5 transition-colors ${
                    active 
                      ? 'text-black' 
                      : 'text-zinc-400 group-hover:text-[#FF9900]'
                  }`}
                />
              )}

              {/* Hover tooltip */}
              <div className="absolute left-full ml-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-black/50">
                <span className="text-sm text-white font-medium">{item.label}</span>
              </div>
            </motion.button>
          );
        })}
      </nav>
    </aside>
  );
}
