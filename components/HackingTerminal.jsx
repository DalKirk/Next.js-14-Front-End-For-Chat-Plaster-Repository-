import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Wifi, Server, Monitor, Lock, Unlock, Award, Flag, CheckCircle, XCircle, Target, Book, Home, Code, Shield, Clock, RotateCcw, Share2 } from 'lucide-react';

const HackingTerminal = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentTarget, setCurrentTarget] = useState(null);
  const [discoveredHosts, setDiscoveredHosts] = useState([]);
  const [currentDir, setCurrentDir] = useState('~');
  const [currentUser, setCurrentUser] = useState('user');
  const [hostname, setHostname] = useState('kali');
  const [authenticated, setAuthenticated] = useState(false);
  
  // Documentation tab state
  const [activeTab, setActiveTab] = useState('welcome');
  
  // Achievement and objective tracking
  const [achievements, setAchievements] = useState({
    first_ping: false,
    network_scan: false,
    first_ssh: false,
    found_credentials: false,
    root_access: false,
    firewall_bypass: false,
    flag_captured: false,
    all_hosts_pwned: false,
    speed_run: false,
    password_cracker: false
  });
  
  const [objectives, setObjectives] = useState({
    discover_network: false,
    connect_to_host: false,
    find_passwords: false,
    escalate_privileges: false,
    read_firewall_logs: false,
    capture_flag: false,
    compromise_all_hosts: false
  });

  const [compromisedHosts, setCompromisedHosts] = useState([]);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  
  // NEW: Victory and stats tracking
  const [showVictory, setShowVictory] = useState(false);
  const [gameStats, setGameStats] = useState({
    commandsUsed: 0,
    timeElapsed: 0,
    efficiencyScore: 'B'
  });
  
  const terminalRef = useRef(null);
  const inputRef = useRef(null);
  const justReset = useRef(false);

  // Network configuration
  const network = {
    '192.168.1.1': {
      type: 'router',
      name: 'TP-Link-Router',
      hostname: 'tplink-router',
      os: 'Linux 3.10.14',
      mac: '00:14:22:ab:cd:ef',
      latency: 1.2,
      uptime: 172800,
      value: 100,
      services: { 
        22: { name: 'ssh', state: 'open', version: 'OpenSSH 7.4' },
        80: { name: 'http', state: 'open', version: 'lighttpd 1.4.35' },
        23: { name: 'telnet', state: 'open', version: 'telnetd' },
        443: { name: 'https', state: 'filtered', version: 'lighttpd 1.4.35' }
      },
      firewall: {
        enabled: true,
        default_policy: 'DROP',
        rules: [
          { port: 22, action: 'ACCEPT', from: 'any' },
          { port: 80, action: 'ACCEPT', from: 'any' },
          { port: 23, action: 'ACCEPT', from: '192.168.1.0/24' },
          { port: 443, action: 'DROP', from: 'external' },
          { icmp: true, action: 'ACCEPT' }
        ]
      },
      vulnerabilities: ['CVE-2019-7219', 'default_creds', 'weak_password'],
      users: { 'admin': 'admin', 'root': 'toor' },
      secrets: ['WiFi password', 'Network topology', 'Admin credentials'],
      fileSystem: {
        '/': { type: 'dir', contents: ['etc', 'var', 'bin', 'root'] },
        '/etc': { type: 'dir', contents: ['passwd', 'config', 'hosts'] },
        '/etc/passwd': { type: 'file', content: 'root:x:0:0:root:/root:/bin/ash\nadmin:x:1000:1000:admin:/home/admin:/bin/ash\n' },
        '/etc/config': { type: 'file', content: 'SSID=MyHomeNetwork\nWPA_KEY=SecurePass2023!\nADMIN_PASSWORD=admin\n' },
        '/etc/hosts': { type: 'file', content: '127.0.0.1 localhost\n192.168.1.1 router\n192.168.1.10 web-server\n192.168.1.15 workstation\n' },
        '/var': { type: 'dir', contents: ['log'] },
        '/var/log': { type: 'dir', contents: ['firewall.log'] },
        '/var/log/firewall.log': { type: 'file', content: '2024-12-26 08:15:00 DROPPED: SRC=203.0.113.5 DST=192.168.1.1 PROTO=TCP DPT=443\n' },
        '/root': { type: 'dir', contents: ['network-keys.txt'], protected: true },
        '/root/network-keys.txt': { type: 'file', content: 'Router: admin/admin\nServer: webadmin/P@ssw0rd123\nWorkstation: employee/Welcome123!\n', protected: true }
      }
    },
    '192.168.1.10': {
      type: 'server',
      name: 'ubuntu-server',
      hostname: 'web-server-01',
      os: 'Ubuntu 20.04.3 LTS',
      mac: '00:0c:29:3f:4a:5b',
      latency: 0.8,
      uptime: 259200,
      value: 250,
      services: { 
        22: { name: 'ssh', state: 'open', version: 'OpenSSH 8.2p1' },
        80: { name: 'http', state: 'open', version: 'Apache 2.4.41' },
        3306: { name: 'mysql', state: 'filtered', version: 'MySQL 5.7.33' },
        21: { name: 'ftp', state: 'open', version: 'vsftpd 3.0.3' }
      },
      firewall: {
        enabled: true,
        default_policy: 'DROP',
        rules: [
          { port: 22, action: 'ACCEPT', from: 'any' },
          { port: 80, action: 'ACCEPT', from: 'any' },
          { port: 21, action: 'ACCEPT', from: 'any' },
          { port: 3306, action: 'ACCEPT', from: '192.168.1.0/24' },
          { icmp: true, action: 'ACCEPT', rate_limit: 5 }
        ]
      },
      vulnerabilities: ['CVE-2021-3156', 'sql_injection', 'weak_mysql_root'],
      users: { 'root': 'toor', 'webadmin': 'P@ssw0rd123' },
      secrets: ['Customer database', 'Admin credentials', 'Corporate flag'],
      fileSystem: {
        '/': { type: 'dir', contents: ['home', 'etc', 'var', 'root'] },
        '/home': { type: 'dir', contents: ['webadmin'] },
        '/home/webadmin': { type: 'dir', contents: ['documents', '.bash_history'] },
        '/home/webadmin/documents': { type: 'dir', contents: ['credentials.txt', 'notes.txt'] },
        '/home/webadmin/documents/credentials.txt': { type: 'file', content: 'MySQL Root: toor\nAdmin Portal: admin/SuperSecure2024!\n' },
        '/home/webadmin/documents/notes.txt': { type: 'file', content: 'IMPORTANT: Flag is in /var/www/html/admin/flag.txt\nNeed to patch CVE-2021-3156\n' },
        '/home/webadmin/.bash_history': { type: 'file', content: 'sudo su\ncat documents/credentials.txt\n', hidden: true },
        '/etc': { type: 'dir', contents: ['passwd'] },
        '/etc/passwd': { type: 'file', content: 'root:x:0:0:root:/root:/bin/bash\nwebadmin:x:1000:1000::/home/webadmin:/bin/bash\n' },
        '/var': { type: 'dir', contents: ['www', 'log'] },
        '/var/www': { type: 'dir', contents: ['html'] },
        '/var/www/html': { type: 'dir', contents: ['admin'] },
        '/var/www/html/admin': { type: 'dir', contents: ['flag.txt'] },
        '/var/www/html/admin/flag.txt': { type: 'file', content: '========================================\n\n           CONGRATULATIONS!\n\n  FLAG{pwn3d_th3_s3rv3r_l1k3_a_pr0_2024}\n\n========================================' },
        '/var/log': { type: 'dir', contents: ['ufw.log'] },
        '/var/log/ufw.log': { type: 'file', content: '2024-12-26 10:15:33 [UFW BLOCK] SRC=203.0.113.100 DST=192.168.1.10 DPT=3306\n' },
        '/root': { type: 'dir', contents: ['secret.txt'], protected: true },
        '/root/secret.txt': { type: 'file', content: 'Master Password: R00t_M4st3r_2024\nDatabase: root/toor\n', protected: true }
      }
    },
    '192.168.1.15': {
      type: 'workstation',
      name: 'DESKTOP-PC',
      hostname: 'employee-pc',
      os: 'Ubuntu 22.04 LTS',
      mac: '08:00:27:4e:66:a1',
      latency: 0.5,
      uptime: 86400,
      value: 150,
      services: { 
        22: { name: 'ssh', state: 'open', version: 'OpenSSH 8.9p1' },
        445: { name: 'smb', state: 'filtered', version: 'Samba 4.15.5' }
      },
      firewall: {
        enabled: true,
        default_policy: 'DROP',
        rules: [
          { port: 22, action: 'ACCEPT', from: '192.168.1.0/24' },
          { port: 445, action: 'DROP', from: 'external' },
          { icmp: true, action: 'ACCEPT' }
        ]
      },
      vulnerabilities: ['weak_password'],
      users: { 'employee': 'Welcome123!' },
      secrets: ['Employee passwords', 'Network diagram'],
      fileSystem: {
        '/': { type: 'dir', contents: ['home', 'etc'] },
        '/home': { type: 'dir', contents: ['employee'] },
        '/home/employee': { type: 'dir', contents: ['Desktop', '.bash_history'] },
        '/home/employee/Desktop': { type: 'dir', contents: ['passwords.txt'] },
        '/home/employee/Desktop/passwords.txt': { type: 'file', content: 'Work VPN: employee / Welcome123!\nServer Admin: webadmin / P@ssw0rd123\nRouter: admin / admin\n' },
        '/home/employee/.bash_history': { type: 'file', content: 'ssh webadmin@192.168.1.10\ncat passwords.txt\n', hidden: true },
        '/etc': { type: 'dir', contents: ['passwd'] },
        '/etc/passwd': { type: 'file', content: 'employee:x:1000:1000::/home/employee:/bin/bash\n' }
      }
    }
  };

  const unlockAchievement = (achievementKey, message, points = 0) => {
    if (!achievements[achievementKey]) {
      setAchievements(prev => ({ ...prev, [achievementKey]: true }));
      setScore(prev => prev + points);
      addOutput('');
      addOutput('========================================', 'fuchsia');
      addOutput('');
      addOutput('      ACHIEVEMENT UNLOCKED!', 'achievement');
      addOutput('');
      addOutput('  ' + message, 'achievement');
      addOutput('  Points: +' + points, 'achievement');
      addOutput('');
      addOutput('========================================', 'fuchsia');
      addOutput('');
    }
  };

  const completeObjective = (objectiveKey, message, points = 0) => {
    if (!objectives[objectiveKey]) {
      setObjectives(prev => ({ ...prev, [objectiveKey]: true }));
      setScore(prev => prev + points);
      addOutput(`✓ Objective Complete: ${message} [+${points} points]`, 'success');
    }
  };

  const compromiseHost = (targetIP) => {
    if (!compromisedHosts.includes(targetIP)) {
      setCompromisedHosts(prev => [...prev, targetIP]);
      const host = network[targetIP];
      setScore(prev => prev + host.value);
      
      addOutput('');
      addOutput('========================================', 'fuchsia');
      addOutput('');
      addOutput('        HOST COMPROMISED!', 'success');
      addOutput('');
      addOutput('  Target: ' + host.name, 'success');
      addOutput('  IP: ' + targetIP, 'success');
      addOutput('  Points Earned: +' + host.value, 'success');
      addOutput('');
      addOutput('========================================', 'fuchsia');
      addOutput('');

      if (compromisedHosts.length + 1 === Object.keys(network).length) {
        setTimeout(() => showVictoryScreen(), 1000);
      }
    }
  };

  // NEW: Calculate efficiency metrics
  const calculateEfficiency = () => {
    const commandEfficiency = gameStats.commandsUsed < 30 ? 'A+' : 
                             gameStats.commandsUsed < 50 ? 'A' :
                             gameStats.commandsUsed < 70 ? 'B' :
                             gameStats.commandsUsed < 100 ? 'C' : 'D';
    
    const elapsedMinutes = (Date.now() - startTime) / 60000;
    const timeEfficiency = elapsedMinutes < 5 ? 'Lightning Fast' :
                          elapsedMinutes < 10 ? 'Quick' :
                          elapsedMinutes < 15 ? 'Steady' : 'Methodical';
    
    return { commandEfficiency, timeEfficiency };
  };

  // NEW: Share results function
  const shareResults = () => {
    const minutes = Math.floor(gameStats.timeElapsed / 60);
    const seconds = gameStats.timeElapsed % 60;
    const text = `I just completed the Penetration Testing Simulator!\n\nTime: ${minutes}m ${seconds}s\nCommands: ${gameStats.commandsUsed}\nEfficiency: ${gameStats.efficiencyScore}\nScore: ${score}\n\nCan you beat my time?`;
    
    if (navigator.share) {
      navigator.share({ text }).catch(console.error);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => alert('Results copied to clipboard!'))
        .catch(() => alert('Failed to copy. Try again.'));
    } else {
      alert('Sharing not supported in this browser.');
    }
  };

  // NEW: Reset game function
  const resetGame = () => {
    console.log('=== RESET GAME STARTED ===');
    console.log('Before reset - compromised:', compromisedHosts.length);
    console.log('Before reset - localStorage:', localStorage.getItem('hackingTerminalProgress') ? 'EXISTS' : 'EMPTY');
    
    // Clear localStorage IMMEDIATELY
    localStorage.removeItem('hackingTerminalProgress');
    console.log('After clear - localStorage:', localStorage.getItem('hackingTerminalProgress') ? 'EXISTS' : 'EMPTY');
    
    // Set flag to prevent auto-load
    justReset.current = true;
    
    // Reset all state in batched update
    setShowVictory(false);
    setCompromisedHosts([]);
    setDiscoveredHosts([]);
    setScore(0);
    setHistory([]);
    setCommandHistory([]);
    setHistoryIndex(-1);
    setInput('');
    setCurrentTarget(null);
    setAuthenticated(false);
    setCurrentUser('user');
    setHostname('kali');
    setCurrentDir('~');
    setGameStats({ commandsUsed: 0, timeElapsed: 0, efficiencyScore: 'B' });
    setStartTime(Date.now());
    setActiveTab('welcome');
    
    setAchievements({
      first_ping: false,
      network_scan: false,
      first_ssh: false,
      found_credentials: false,
      root_access: false,
      firewall_bypass: false,
      flag_captured: false,
      all_hosts_pwned: false,
      speed_run: false,
      password_cracker: false
    });
    
    setObjectives({
      discover_network: false,
      connect_to_host: false,
      find_passwords: false,
      escalate_privileges: false,
      read_firewall_logs: false,
      capture_flag: false,
      compromise_all_hosts: false
    });
    
    // Verify clear again after all updates
    setTimeout(() => {
      localStorage.removeItem('hackingTerminalProgress');
      console.log('Final check - localStorage:', localStorage.getItem('hackingTerminalProgress') ? 'EXISTS' : 'EMPTY');
      console.log('=== RESET GAME COMPLETE ===');
    }, 200);
  };

  const showVictoryScreen = () => {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    const efficiency = calculateEfficiency();
    
    // Update stats
    setGameStats(prev => ({
      ...prev,
      timeElapsed: elapsedTime,
      efficiencyScore: efficiency.commandEfficiency
    }));
    
    // Play victory siren
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.type = 'sawtooth';
      
      const now = audioContext.currentTime;
      oscillator.frequency.setValueAtTime(700, now);
      oscillator.frequency.linearRampToValueAtTime(1200, now + 0.5);
      oscillator.frequency.linearRampToValueAtTime(700, now + 1.0);
      oscillator.frequency.linearRampToValueAtTime(1200, now + 1.5);
      oscillator.frequency.linearRampToValueAtTime(700, now + 2.0);
      oscillator.frequency.linearRampToValueAtTime(1200, now + 2.5);
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.4, now + 0.1);
      gainNode.gain.setValueAtTime(0.4, now + 2.4);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 3.0);
      
      oscillator.start(now);
      oscillator.stop(now + 3.0);
    } catch (err) {
      console.error('Audio error:', err);
    }

    // Show victory modal
    setShowVictory(true);
    
    unlockAchievement('all_hosts_pwned', 'Network Domination - All hosts compromised!', 1000);
    completeObjective('compromise_all_hosts', 'Complete Network Compromise', 500);

    if (elapsedTime < 600) {
      unlockAchievement('speed_run', 'Speed Demon - Compromised in <10 min', 500);
    }
  };

  const checkFirewall = (targetIP, port, protocol = 'tcp') => {
    const host = network[targetIP];
    if (!host || !host.firewall.enabled) {
      return { allowed: true, reason: 'no_firewall' };
    }

    const sourceIP = '192.168.1.100';
    const rule = host.firewall.rules.find(r => {
      if (protocol === 'icmp' && r.icmp) return true;
      if (r.port === port) {
        if (r.from === 'any') return true;
        if (r.from === '192.168.1.0/24' && sourceIP.startsWith('192.168.1.')) return true;
      }
      return false;
    });

    if (rule) {
      return { allowed: rule.action === 'ACCEPT', reason: rule.action };
    }

    return { allowed: host.firewall.default_policy === 'ACCEPT', reason: 'default_policy' };
  };

  const simulateLatency = async (targetIP) => {
    const host = network[targetIP];
    const latency = host ? host.latency : 50;
    return new Promise(resolve => setTimeout(resolve, latency));
  };

  useEffect(() => {
    addOutput('===============================================', 'fuchsia');
    addOutput('');
    addOutput('  Penetration Testing Framework v4.0.0');
    addOutput('  Full Network Simulation with Tutorial');
    addOutput('');
    addOutput('===============================================', 'fuchsia');
    addOutput('');
    addOutput('Mission: Compromise the entire corporate network', 'info');
    addOutput('Attack Source: 192.168.1.100 (Kali Linux)', 'info');
    addOutput('');
    addOutput('📚 Check the DOCUMENTATION panel for guidance', 'success');
    addOutput('');
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const addOutput = (text, type = 'output') => {
    setHistory(prev => [...prev, { text, type, timestamp: Date.now() }]);
  };

  // NEW: Load saved progress on mount
  useEffect(() => {
    console.log('=== LOAD PROGRESS CHECK ===');
    console.log('justReset flag:', justReset.current);
    
    // Don't load if we just reset
    if (justReset.current) {
      console.log('Skipping load - just reset');
      justReset.current = false;
      return;
    }
    
    const saved = localStorage.getItem('hackingTerminalProgress');
    console.log('localStorage exists:', saved ? 'YES' : 'NO');
    
    if (saved) {
      try {
        const data = JSON.parse(saved);
        console.log('Loading progress - compromised hosts:', data.compromisedHosts?.length || 0);
        if (data.compromisedHosts) setCompromisedHosts(data.compromisedHosts);
        if (data.discoveredHosts) setDiscoveredHosts(data.discoveredHosts);
        if (data.score) setScore(data.score);
        if (data.achievements) setAchievements(data.achievements);
        if (data.objectives) setObjectives(data.objectives);
        console.log('Progress restored from', new Date(data.timestamp).toLocaleString());
      } catch (e) {
        console.error('Failed to load progress');
      }
    } else {
      console.log('No saved progress found');
    }
  }, []);

  // NEW: Auto-save progress
  useEffect(() => {
    // Only save if we have actual progress AND not in victory screen AND not a fresh reset
    if (compromisedHosts.length > 0 && !showVictory && commandHistory.length > 0) {
      const progressData = {
        compromisedHosts,
        discoveredHosts,
        score,
        achievements,
        objectives,
        commandsUsed: commandHistory.length,
        timestamp: Date.now()
      };
      localStorage.setItem('hackingTerminalProgress', JSON.stringify(progressData));
      console.log('Progress saved - compromised:', compromisedHosts.length);
    } else if (compromisedHosts.length === 0 && commandHistory.length === 0 && !showVictory) {
      // If everything is reset, make sure localStorage is cleared
      localStorage.removeItem('hackingTerminalProgress');
      console.log('Progress cleared - fresh game state');
    }
  }, [compromisedHosts, discoveredHosts, score, achievements, objectives, commandHistory.length, showVictory]);

  // NEW: Track command count
  useEffect(() => {
    setGameStats(prev => ({ ...prev, commandsUsed: commandHistory.length }));
  }, [commandHistory.length]);

  const resolvePath = (path, current = currentDir) => {
    if (!currentTarget) return path;
    
    // Handle tilde (~) expansion to home directory
    if (path.startsWith('~')) {
      const host = network[currentTarget];
      const homeDir = `/home/${currentUser}`;
      // Use home dir if it exists, otherwise use root
      const expandedHome = host.fileSystem[homeDir] ? homeDir : '/';
      path = path.replace('~', expandedHome);
    }
    
    if (!path.startsWith('/')) {
      if (current === '/') {
        path = '/' + path;
      } else {
        path = current + '/' + path;
      }
    }
    
    const parts = path.split('/').filter(p => p);
    const resolved = [];
    
    for (const part of parts) {
      if (part === '..') {
        resolved.pop();
      } else if (part !== '.') {
        resolved.push(part);
      }
    }
    
    return '/' + resolved.join('/');
  };

  const getFileSystemNode = (path) => {
    if (!currentTarget) return null;
    const host = network[currentTarget];
    const resolvedPath = path === '/' ? '/' : resolvePath(path);
    return host.fileSystem[resolvedPath];
  };

  // Commands object (removed help and tutorial commands)
  const commands = {
    achievements: () => {
      addOutput('');
      addOutput('========================================', 'fuchsia');
      addOutput('            ACHIEVEMENTS');
      addOutput('========================================', 'fuchsia');
      addOutput('');

      const achList = [
        { key: 'first_ping', name: 'First Contact', desc: 'Send your first ping' },
        { key: 'network_scan', name: 'Network Mapper', desc: 'Scan the entire network' },
        { key: 'first_ssh', name: 'Shell Shock', desc: 'Successfully SSH into a host' },
        { key: 'found_credentials', name: 'Password Hunter', desc: 'Find hidden credentials' },
        { key: 'root_access', name: 'Root God', desc: 'Gain root access' },
        { key: 'firewall_bypass', name: 'Firewall Ninja', desc: 'Analyze firewall config' },
        { key: 'flag_captured', name: 'Flag Bearer', desc: 'Capture the corporate flag' },
        { key: 'all_hosts_pwned', name: 'Network Dominator', desc: 'Compromise all hosts' },
        { key: 'speed_run', name: 'Speed Demon', desc: 'Complete in under 10 minutes' }
      ];

      let unlockedCount = 0;
      achList.forEach(ach => {
        const unlocked = achievements[ach.key];
        if (unlocked) unlockedCount++;
        const icon = unlocked ? '🏆' : '🔒';
        const color = unlocked ? 'achievement' : 'output';
        addOutput(`  ${icon} ${ach.name.padEnd(20)} - ${ach.desc}`, color);
      });

      addOutput('');
      addOutput(`Unlocked: ${unlockedCount}/${achList.length} achievements`, 'info');
      addOutput('');
    },

    status: () => {
      addOutput('');
      addOutput('========================================', 'fuchsia');
      addOutput('       PENETRATION TEST STATUS');
      addOutput('========================================', 'fuchsia');
      addOutput('');
      addOutput(`Score: ${score} points`, 'output');
      addOutput(`Compromised Hosts: ${compromisedHosts.length}/${Object.keys(network).length}`, 'output');
      addOutput(`Objectives Complete: ${Object.values(objectives).filter(v => v).length}/7`, 'output');
      addOutput(`Achievements: ${Object.values(achievements).filter(v => v).length}/9`, 'output');
      addOutput('');
      
      if (compromisedHosts.length > 0) {
        addOutput('Compromised Systems:', 'section');
        compromisedHosts.forEach(ip => {
          const host = network[ip];
          addOutput(`  ✓ ${ip} - ${host.name}`, 'success');
        });
        addOutput('');
      }
    },

    score: () => {
      addOutput(`Current Score: ${score} points`, 'success');
    },

    clear: () => {
      setHistory([]);
    },

    ping: async (args) => {
      if (args.length === 0) {
        addOutput('ping: usage error: Destination address required', 'error');
        return;
      }

      if (!achievements.first_ping) {
        unlockAchievement('first_ping', 'First Contact - Sent your first ping', 10);
      }

      const target = args[0];
      const countIndex = args.indexOf('-c');
      const count = countIndex !== -1 && args[countIndex + 1] ? parseInt(args[countIndex + 1]) : 4;

      const host = network[target];
      
      if (!host) {
        addOutput(`ping: ${target}: Name or service not known`, 'error');
        return;
      }

      const firewallCheck = checkFirewall(target, null, 'icmp');
      
      if (!firewallCheck.allowed) {
        addOutput(`PING ${target} (${target}) 56(84) bytes of data.`, 'output');
        for (let i = 0; i < count; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          addOutput(`Request timeout for icmp_seq ${i}`, 'error');
        }
        addOutput('', 'output');
        addOutput(`--- ${target} ping statistics ---`, 'output');
        addOutput(`${count} packets transmitted, 0 received, 100% packet loss`, 'error');
        return;
      }

      addOutput(`PING ${target} (${target}) 56(84) bytes of data.`, 'output');
      
      let transmitted = 0;
      let received = 0;
      let totalTime = 0;

      for (let i = 0; i < count; i++) {
        transmitted++;
        await simulateLatency(target);
        
        if (Math.random() > 0.05) {
          received++;
          const time = (host.latency + Math.random() * 2 - 1).toFixed(3);
          totalTime += parseFloat(time);
          addOutput(`64 bytes from ${target}: icmp_seq=${i+1} ttl=64 time=${time} ms`, 'output');
        } else {
          addOutput(`Request timeout for icmp_seq ${i+1}`, 'warning');
        }
        
        await new Promise(resolve => setTimeout(resolve, 900));
      }

      const loss = ((transmitted - received) / transmitted * 100).toFixed(1);
      const avgTime = received > 0 ? (totalTime / received).toFixed(3) : '0.000';
      
      addOutput('', 'output');
      addOutput(`--- ${target} ping statistics ---`, 'output');
      addOutput(`${transmitted} packets transmitted, ${received} received, ${loss}% packet loss`, 'output');
      if (received > 0) {
        addOutput(`rtt min/avg/max = ${(host.latency - 0.5).toFixed(3)}/${avgTime}/${(host.latency + 1.5).toFixed(3)} ms`, 'output');
      }
    },

    nmap: async (args) => {
      const target = args[0];
      
      if (!target) {
        addOutput('Starting Nmap 7.94 ( https://nmap.org )', 'system');
        addOutput('Scanning local network 192.168.1.0/24...', 'system');
        addOutput('', 'output');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        for (const [ip, host] of Object.entries(network)) {
          addOutput(`Nmap scan report for ${host.name} (${ip})`, 'output');
          addOutput(`Host is up (0.00${Math.floor(Math.random() * 9)}s latency).`, 'output');
          addOutput('', 'output');
          addOutput('PORT      STATE      SERVICE', 'output');
          
          // Show open ports for each host
          for (const [port, service] of Object.entries(host.services)) {
            const firewallCheck = checkFirewall(ip, parseInt(port));
            const state = firewallCheck.allowed ? service.state : 'filtered';
            
            const portStr = `${port}/tcp`.padEnd(9);
            const stateStr = state.padEnd(10);
            const serviceStr = service.name;
            
            addOutput(`${portStr} ${stateStr} ${serviceStr}`, state === 'filtered' ? 'warning' : 'success');
          }
          
          addOutput('MAC Address: ' + host.mac, 'output');
          addOutput('', 'output');
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        setDiscoveredHosts(Object.keys(network));
        addOutput(`Nmap done: ${Object.keys(network).length} IP addresses scanned`, 'success');
        
        if (!achievements.network_scan) {
          unlockAchievement('network_scan', 'Network Mapper - Scanned entire network', 50);
        }
        completeObjective('discover_network', 'Discover all hosts on the network', 50);
        return;
      }

      const host = network[target];
      if (!host) {
        addOutput(`Failed to resolve "${target}".`, 'error');
        return;
      }

      addOutput(`Starting Nmap scan on ${target}...`, 'system');
      await new Promise(resolve => setTimeout(resolve, 1500));

      addOutput(`Nmap scan report for ${host.name} (${target})`, 'output');
      addOutput(`Host is up (${host.latency.toFixed(3)}s latency).`, 'output');
      addOutput('', 'output');
      addOutput('PORT      STATE      SERVICE       VERSION', 'output');

      for (const [port, service] of Object.entries(host.services)) {
        const firewallCheck = checkFirewall(target, parseInt(port));
        const state = firewallCheck.allowed ? service.state : 'filtered';
        
        const portStr = port.toString().padEnd(5);
        const stateStr = state.padEnd(10);
        const serviceStr = service.name.padEnd(13);
        
        addOutput(`${portStr} ${stateStr} ${serviceStr} ${service.version}`, state === 'filtered' ? 'warning' : 'output');
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      addOutput('', 'output');
      addOutput(`OS: ${host.os}`, 'output');
      
      if (host.firewall.enabled) {
        addOutput('⚠ Firewall detected!', 'warning');
        if (!achievements.firewall_bypass) {
          unlockAchievement('firewall_bypass', 'Firewall Ninja - Analyzed firewall', 100);
        }
      }
    },

    ssh: async (args) => {
      if (args.length === 0) {
        addOutput('usage: ssh [user@]hostname', 'error');
        return;
      }

      let username = 'user';
      let targetHost = args[0];

      if (args[0].includes('@')) {
        [username, targetHost] = args[0].split('@');
      }

      const host = network[targetHost];
      
      if (!host) {
        addOutput(`ssh: Could not resolve hostname ${targetHost}`, 'error');
        return;
      }

      const firewallCheck = checkFirewall(targetHost, 22);
      if (!firewallCheck.allowed) {
        addOutput(`ssh: connect to host ${targetHost} port 22: Connection refused`, 'error');
        addOutput('⚠ Port is filtered by firewall.', 'warning');
        return;
      }

      addOutput(`Connecting to ${targetHost}...`, 'system');
      await simulateLatency(targetHost);
      
      addOutput(`${username}@${targetHost}'s password: `, 'output');
      
      await new Promise(resolve => setTimeout(resolve, 800));

      if (host.users[username]) {
        setCurrentTarget(targetHost);
        setCurrentUser(username);
        setHostname(host.hostname);
        
        // Check if /home directory exists, otherwise use root
        const homeDir = `/home/${username}`;
        const homeDirExists = host.fileSystem[homeDir];
        setCurrentDir(homeDirExists ? homeDir : '/');
        setAuthenticated(true);
        
        addOutput('', 'output');
        addOutput(`Last login: ${new Date().toLocaleString()}`, 'output');
        addOutput(`Welcome to ${host.os}`, 'success');
        addOutput('', 'output');

        if (!achievements.first_ssh) {
          unlockAchievement('first_ssh', 'Shell Shock - First successful SSH', 100);
        }
        completeObjective('connect_to_host', 'Successfully SSH into a target', 100);

        if (username === 'root' || currentUser === 'root') {
          compromiseHost(targetHost);
        }
      } else {
        addOutput('', 'output');
        addOutput('Permission denied.', 'error');
        addOutput(`Available users: ${Object.keys(host.users).join(', ')}`, 'warning');
      }
    },

    sudo: (args) => {
      if (!currentTarget) {
        addOutput('sudo: unable to resolve host', 'error');
        return;
      }

      if (args[0] === 'su' || args[0] === '-i') {
        addOutput(`[sudo] password for ${currentUser}: `, 'output');
        setTimeout(() => {
          setCurrentUser('root');
          setCurrentDir('/root');
          addOutput('', 'output');
          addOutput('# Root access granted!', 'success');
          
          if (!achievements.root_access) {
            unlockAchievement('root_access', 'Root God - Escalated to root', 200);
          }
          completeObjective('escalate_privileges', 'Escalate to root access', 200);
          compromiseHost(currentTarget);
        }, 500);
        return;
      }

      if (args[0] === 'iptables' && args[1] === '-L') {
        commands.iptables(['-L']);
        return;
      }

      const cmd = args.join(' ');
      addOutput(`[sudo] password for ${currentUser}: `, 'output');
      setTimeout(() => {
        const tempUser = currentUser;
        setCurrentUser('root');
        executeCommand(cmd);
        setCurrentUser(tempUser);
      }, 300);
    },

    cat: (args) => {
      if (!currentTarget) {
        addOutput('Not connected to a remote host.', 'error');
        return;
      }

      if (args.length === 0) {
        addOutput('cat: missing file operand', 'error');
        return;
      }

      const filePath = resolvePath(args[0]);
      const node = getFileSystemNode(filePath);

      if (!node) {
        addOutput(`cat: ${args[0]}: No such file or directory`, 'error');
        return;
      }

      if (node.type === 'dir') {
        addOutput(`cat: ${args[0]}: Is a directory`, 'error');
        return;
      }

      if (node.protected && currentUser !== 'root') {
        addOutput(`cat: ${args[0]}: Permission denied`, 'error');
        return;
      }

      if (filePath.includes('password') || filePath.includes('credential')) {
        if (!achievements.found_credentials) {
          unlockAchievement('found_credentials', 'Password Hunter - Found credentials', 150);
        }
        completeObjective('find_passwords', 'Find hidden password files', 150);
      }

      if (filePath.includes('firewall') || filePath.includes('ufw')) {
        completeObjective('read_firewall_logs', 'Access firewall logs', 100);
      }

      if (filePath.includes('flag')) {
        const lines = node.content.split('\n');
        addOutput('', 'output');
        lines.forEach(line => {
          if (line.includes('=')) {
            addOutput(line, 'fuchsia');
          } else {
            addOutput(line, 'victory');
          }
        });
        addOutput('', 'output');
        
        if (!achievements.flag_captured) {
          unlockAchievement('flag_captured', 'Flag Bearer - Captured the flag!', 500);
        }
        completeObjective('capture_flag', 'Capture the corporate FLAG', 500);
        setScore(prev => prev + 500);
      } else {
        addOutput(node.content, 'output');
      }
    },

    iptables: (args) => {
      if (!currentTarget) {
        addOutput('iptables: Permission denied', 'error');
        return;
      }

      if (currentUser !== 'root') {
        addOutput('iptables: Permission denied (you must be root)', 'error');
        return;
      }

      const host = network[currentTarget];
      
      if (args.includes('-L')) {
        addOutput('Chain INPUT (policy ' + host.firewall.default_policy + ')', 'output');
        addOutput('target     prot opt source               destination', 'output');
        
        host.firewall.rules.forEach(rule => {
          if (rule.icmp) {
            addOutput(`ACCEPT     icmp --  anywhere             anywhere`, 'output');
          } else if (rule.port) {
            const target = rule.action === 'ACCEPT' ? 'ACCEPT' : 'DROP';
            const source = rule.from === 'any' ? 'anywhere' : rule.from;
            addOutput(`${target.padEnd(10)} tcp  --  ${source.padEnd(20)} anywhere             tcp dpt:${rule.port}`, 'output');
          }
        });
      }
    },

    ufw: (args) => {
      if (!currentTarget) {
        addOutput('ufw: command not found', 'error');
        return;
      }

      const host = network[currentTarget];
      
      if (args.includes('status')) {
        if (host.firewall.enabled) {
          addOutput('Status: active', 'success');
          addOutput('', 'output');
          addOutput('To                         Action      From', 'output');
          addOutput('--                         ------      ----', 'output');
          
          host.firewall.rules.forEach(rule => {
            if (rule.port) {
              const action = rule.action === 'ACCEPT' ? 'ALLOW' : 'DENY';
              const from = rule.from === 'any' ? 'Anywhere' : rule.from;
              addOutput(`${rule.port.toString().padEnd(26)} ${action.padEnd(11)} ${from}`, 'output');
            }
          });
        }
      }
    },

    ls: (args) => {
      if (!currentTarget) {
        addOutput('Documents  Downloads  Desktop  scripts  tools', 'output');
        return;
      }

      const showAll = args.includes('-a') || args.includes('-la');
      let path = currentDir;
      const nonFlagArgs = args.filter(a => !a.startsWith('-'));
      if (nonFlagArgs.length > 0) {
        path = resolvePath(nonFlagArgs[0]);
      }

      const node = getFileSystemNode(path);
      
      if (!node) {
        addOutput(`ls: cannot access '${path}': No such file or directory`, 'error');
        return;
      }

      if (node.type === 'file') {
        addOutput(path.split('/').pop(), 'output');
        return;
      }

      if (node.type === 'dir') {
        let items = node.contents || [];
        
        if (showAll) {
          items = ['.', '..', ...items];
        } else {
          items = items.filter(item => !item.startsWith('.'));
        }

        addOutput(items.join('  '), 'output');
      }
    },

    cd: (args) => {
      if (!currentTarget) {
        addOutput('Not connected to a remote host.', 'error');
        return;
      }

      if (args.length === 0 || args[0] === '~') {
        setCurrentDir('/home/' + currentUser);
        return;
      }

      const targetPath = resolvePath(args[0]);
      const node = getFileSystemNode(targetPath);

      if (!node) {
        addOutput(`cd: ${args[0]}: No such file or directory`, 'error');
        return;
      }

      if (node.type !== 'dir') {
        addOutput(`cd: ${args[0]}: Not a directory`, 'error');
        return;
      }

      if (node.protected && currentUser !== 'root') {
        addOutput(`cd: ${args[0]}: Permission denied`, 'error');
        return;
      }

      setCurrentDir(targetPath);
    },

    pwd: () => {
      if (currentTarget) {
        addOutput(currentDir, 'output');
      } else {
        addOutput('/home/user', 'output');
      }
    },

    whoami: () => {
      addOutput(currentUser, 'output');
    },

    id: () => {
      if (currentUser === 'root') {
        addOutput('uid=0(root) gid=0(root) groups=0(root)', 'output');
      } else {
        addOutput(`uid=1000(${currentUser}) gid=1000(${currentUser}) groups=1000(${currentUser})`, 'output');
      }
    },

    su: (args) => {
      if (!currentTarget) {
        addOutput('su: must be run from terminal', 'error');
        return;
      }

      const targetUser = args[0] || 'root';
      const host = network[currentTarget];

      if (host.users[targetUser]) {
        addOutput(`Password: `, 'output');
        setTimeout(() => {
          setCurrentUser(targetUser);
          if (targetUser === 'root') {
            setCurrentDir('/root');
            if (!achievements.root_access) {
              unlockAchievement('root_access', 'Root God - Escalated to root', 200);
            }
            completeObjective('escalate_privileges', 'Escalate to root access', 200);
            compromiseHost(currentTarget);
          } else {
            setCurrentDir(`/home/${targetUser}`);
          }
          addOutput(`${targetUser}@${hostname}:~$ `, 'output');
        }, 500);
      } else {
        addOutput('su: user does not exist', 'error');
      }
    },

    uname: (args) => {
      if (args.includes('-a')) {
        if (currentTarget) {
          const host = network[currentTarget];
          addOutput(`Linux ${host.hostname} 5.15.0-56-generic #62-Ubuntu SMP ${host.os} x86_64 GNU/Linux`, 'output');
        } else {
          addOutput('Linux kali 6.1.0-kali5-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.12-1kali2 (2023-02-23) x86_64 GNU/Linux', 'output');
        }
      } else {
        addOutput('Linux', 'output');
      }
    },

    arp: (args) => {
      if (args.includes('-a')) {
        addOutput('Address                  HWtype  HWaddress           Flags Mask            Iface', 'output');
        Object.entries(network).forEach(([ip, host]) => {
          addOutput(`${ip.padEnd(24)} ether   ${host.mac.padEnd(19)} C                     eth0`, 'output');
        });
      } else {
        addOutput('usage: arp [-a]', 'error');
      }
    },

    route: () => {
      addOutput('Kernel IP routing table', 'output');
      addOutput('Destination     Gateway         Genmask         Flags Metric Ref    Use Iface', 'output');
      addOutput('default         192.168.1.1     0.0.0.0         UG    100    0        0 eth0', 'output');
      addOutput('192.168.1.0     0.0.0.0         255.255.255.0   U     100    0        0 eth0', 'output');
    },

    hostname: () => {
      addOutput(hostname, 'output');
    },

    netstat: () => {
      addOutput('Active Internet connections', 'output');
      addOutput('Proto Recv-Q Send-Q Local Address           Foreign Address         State', 'output');
      if (currentTarget) {
        addOutput(`tcp        0      0 ${currentTarget}:22          192.168.1.100:45678     ESTABLISHED`, 'output');
      }
    },

    ifconfig: () => {
      if (currentTarget) {
        const host = network[currentTarget];
        addOutput('eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500', 'output');
        addOutput(`        inet ${currentTarget}  netmask 255.255.255.0`, 'output');
        addOutput(`        ether ${host.mac}`, 'output');
      } else {
        addOutput('eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500', 'output');
        addOutput('        inet 192.168.1.100  netmask 255.255.255.0', 'output');
      }
    },

    find: (args) => {
      if (!currentTarget) {
        addOutput('Not connected to a remote host.', 'error');
        return;
      }

      const nameIndex = args.indexOf('-name');
      if (nameIndex === -1) {
        addOutput('usage: find <path> -name <pattern>', 'error');
        return;
      }

      const pattern = args[nameIndex + 1].replace(/"/g, '').replace(/\*/g, '');
      const host = network[currentTarget];
      const results = [];

      Object.keys(host.fileSystem).forEach(path => {
        if (path.toLowerCase().includes(pattern.toLowerCase())) {
          const node = host.fileSystem[path];
          if (!node.hidden || currentUser === 'root') {
            results.push(path);
          }
        }
      });

      if (results.length > 0) {
        results.forEach(path => addOutput(path, 'output'));
      }
    },

    grep: (args) => {
      if (args.length < 2) {
        addOutput('usage: grep <pattern> <file>', 'error');
        return;
      }

      const pattern = args[0];
      const filePath = resolvePath(args[1]);
      const node = getFileSystemNode(filePath);

      if (!node || node.type !== 'file') {
        addOutput(`grep: ${args[1]}: No such file or directory`, 'error');
        return;
      }

      const lines = node.content.split('\n');
      const matches = lines.filter(line => line.toLowerCase().includes(pattern.toLowerCase()));
      
      if (matches.length > 0) {
        matches.forEach(line => addOutput(line, 'output'));
      }
    },

    exit: () => {
      if (currentTarget) {
        addOutput('logout', 'output');
        addOutput(`Connection to ${currentTarget} closed.`, 'system');
        setCurrentTarget(null);
        setCurrentUser('user');
        setHostname('kali');
        setCurrentDir('~');
      }
    },

    hydra: async (args) => {
      // Usage: hydra -l admin -P wordlist.txt 192.168.1.1 ssh
      // Or simplified: hydra 192.168.1.1
      
      if (args.length === 0) {
        addOutput('Hydra v9.5 (c) 2023 by van Hauser/THC - Password Cracker', 'system');
        addOutput('', 'output');
        addOutput('Usage: hydra [[[-l LOGIN|-L FILE] [-p PASS|-P FILE]] | [-C FILE]]', 'output');
        addOutput('       [-t TASKS] [-M FILE] target service', 'output');
        addOutput('', 'output');
        addOutput('Example: hydra -l admin -p admin 192.168.1.1 ssh', 'output');
        addOutput('         hydra 192.168.1.1  (auto-crack with common passwords)', 'output');
        return;
      }

      const target = args[args.length - 1];
      let username = 'admin';
      let useWordlist = true;
      
      // Parse arguments
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-l' && i + 1 < args.length) {
          username = args[i + 1];
        }
      }

      const host = network[target];
      if (!host) {
        addOutput(`Error: Target ${target} not found`, 'error');
        return;
      }

      addOutput(`Hydra v9.5 starting at ${new Date().toLocaleTimeString()}`, 'system');
      addOutput(`[INFO] Targeting ${target} (${host.name})`, 'output');
      addOutput(`[INFO] Service: SSH (port 22)`, 'output');
      addOutput(`[INFO] Username: ${username}`, 'output');
      addOutput(`[INFO] Loading wordlist: /usr/share/wordlists/rockyou.txt`, 'output');
      addOutput(`[INFO] Wordlist loaded: 14,344,392 passwords`, 'output');
      addOutput('', 'output');
      
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Extended password list for more realistic feel
      const commonPasswords = [
        'password', '123456', '12345678', 'qwerty', 'abc123',
        'monkey', '1234567', 'letmein', 'trustno1', 'dragon',
        'baseball', '111111', 'iloveyou', 'master', 'sunshine',
        'ashley', 'bailey', 'passw0rd', 'shadow', '123123',
        'password1', '000000', 'qwerty123', 'admin', 'root',
        'toor', 'pass', 'test', 'guest', 'info',
        'P@ssw0rd', 'P@ssw0rd123', 'Welcome1', 'Welcome123', 'Welcome123!',
        'admin123', 'root123', 'password123', 'changeme', 'default'
      ];

      // Find if this host has a valid login
      let foundPassword = null;
      let foundUser = null;
      let foundAttempt = -1;

      // Check router
      if (target === '192.168.1.1' && username === 'admin') {
        foundPassword = 'admin';
        foundUser = 'admin';
        foundAttempt = commonPasswords.indexOf('admin');
      }
      // Check web server
      else if (target === '192.168.1.10' && username === 'webadmin') {
        foundPassword = 'P@ssw0rd123';
        foundUser = 'webadmin';
        foundAttempt = commonPasswords.indexOf('P@ssw0rd123');
      }
      // Check workstation
      else if (target === '192.168.1.15' && username === 'employee') {
        foundPassword = 'Welcome123!';
        foundUser = 'employee';
        foundAttempt = commonPasswords.indexOf('Welcome123!');
      }

      // Simulate trying passwords with realistic timing
      let attemptCount = 0;
      for (let i = 0; i < commonPasswords.length; i++) {
        const pwd = commonPasswords[i];
        attemptCount++;
        
        if (pwd === foundPassword) {
          addOutput(`[${attemptCount}][ssh] Trying ${username}:${pwd}`, 'warning');
          await new Promise(resolve => setTimeout(resolve, 400));
          addOutput('', 'output');
          addOutput(`[22][ssh] host: ${target}   login: ${foundUser}   password: ${foundPassword}`, 'success');
          addOutput('', 'output');
          addOutput(`✓ SUCCESS! Valid credentials discovered`, 'success');
          addOutput(``, 'output');
          addOutput(`  Target: ${target}`, 'success');
          addOutput(`  Username: ${foundUser}`, 'success');
          addOutput(`  Password: ${foundPassword}`, 'success');
          addOutput(`  Attempts: ${attemptCount} / ${commonPasswords.length}`, 'success');
          addOutput('', 'output');
          addOutput(`Next step: ssh ${foundUser}@${target}`, 'info');
          
          if (!achievements.password_cracker) {
            unlockAchievement('password_cracker', 'Password Cracker - Used hydra successfully', 100);
          }
          return;
        } else {
          // Show every 5th attempt to avoid spam but show activity
          if (i % 5 === 0 || i < 10) {
            addOutput(`[${attemptCount}][ssh] Trying ${username}:${pwd}`, 'warning');
            await new Promise(resolve => setTimeout(resolve, 400));
          } else {
            // Just wait without outputting for other attempts
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }

      // If no password found
      addOutput('', 'output');
      addOutput(`✗ FAILED - No valid credentials found`, 'error');
      addOutput(`  Tested: ${attemptCount} passwords`, 'error');
      addOutput(`  Target: ${target}`, 'error');
      addOutput(`  Username: ${username}`, 'error');
      addOutput('', 'output');
      addOutput(`Tip: Try a different username with -l option`, 'info');
      addOutput(`     hydra -l <username> ${target}`, 'info');
    },
  };

  commands.logout = commands.exit;

  const executeCommand = (cmdLine) => {
    const trimmed = cmdLine.trim();
    if (!trimmed) return;

    const parts = trimmed.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    setCommandHistory(prev => [...prev, trimmed]);

    if (commands[cmd]) {
      commands[cmd](args);
    } else {
      addOutput(`${cmd}: command not found`, 'error');
    }
  };

  const handleInput = (e) => {
    if (e.key === 'Enter') {
      const cmd = input.trim();
      if (cmd) {
        addOutput(getPrompt() + cmd, 'command');
        executeCommand(cmd);
      }
      setInput('');
      setHistoryIndex(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(commandHistory[newIndex]);
        }
      }
    }
  };

  const getPrompt = () => {
    if (currentTarget) {
      const prompt = currentUser === 'root' ? '#' : '$';
      const displayDir = currentDir.replace(`/home/${currentUser}`, '~');
      return `${currentUser}@${hostname}:${displayDir}${prompt} `;
    }
    return 'user@kali:~$ ';
  };

  const getTypeColor = (type) => {
    const colors = {
      command: 'text-green-400',
      output: 'text-gray-300',
      error: 'text-red-400',
      success: 'text-cyan-400',
      warning: 'text-yellow-400',
      system: 'text-purple-400',
      info: 'text-blue-400',
      header: 'text-green-500',
      section: 'text-cyan-500',
      cmd: 'text-yellow-300',
      ascii: 'text-green-500',
      achievement: 'text-yellow-300',
      victory: 'text-cyan-300',
      fuchsia: 'text-fuchsia-500'
    };
    return colors[type] || 'text-gray-300';
  };

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

  // Render documentation content
  const renderDocContent = () => {
    switch(activeTab) {
      case 'welcome':
        return (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-green-900/30 to-cyan-900/30 border border-green-700 rounded-lg p-4">
              <h3 className="text-green-400 font-bold text-lg mb-2">Your Mission</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Compromise the entire corporate network by exploiting vulnerabilities, escalating privileges, and capturing the hidden FLAG.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-cyan-400 font-semibold text-sm">Quick Start:</h4>
              <div className="space-y-2 text-sm">
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-yellow-300 font-mono">ping 192.168.1.1</div>
                  <div className="text-gray-400 text-xs">Test network connectivity</div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-yellow-300 font-mono">nmap</div>
                  <div className="text-gray-400 text-xs">Scan all hosts</div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-yellow-300 font-mono">ssh admin@192.168.1.1</div>
                  <div className="text-gray-400 text-xs">Connect to router (password: admin)</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-cyan-400 font-semibold text-sm">Network Targets:</h4>
              <div className="space-y-2 text-xs">
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-green-400 font-mono font-bold">192.168.1.1</div>
                  <div className="text-gray-400">Router - Credentials: admin/admin</div>
                  <div className="text-gray-500">Files: /etc/config, /root/network-keys.txt</div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-green-400 font-mono font-bold">192.168.1.10</div>
                  <div className="text-gray-400">Web Server - Contains FLAG</div>
                  <div className="text-gray-500">Files: ~/documents/*.txt, /var/www/html/admin/flag.txt</div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-green-400 font-mono font-bold">192.168.1.15</div>
                  <div className="text-gray-400">Workstation - All passwords</div>
                  <div className="text-gray-500">Files: ~/Desktop/passwords.txt</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'tutorial':
        return (
          <div className="space-y-4">
            <h3 className="text-green-400 font-bold text-lg">Complete Walkthrough - 3/3 Compromises</h3>
            <p className="text-gray-400 text-xs">Follow these steps to fully compromise the network</p>

            {/* Understanding the Workflow */}
            <div className="bg-cyan-900/30 border-2 border-cyan-500 rounded-lg p-3">
              <h4 className="text-cyan-400 font-semibold mb-2 text-sm">💡 Understanding the Attack Flow</h4>
              <div className="text-xs text-gray-300 space-y-1">
                <p><strong className="text-yellow-300">You start on:</strong> Kali Linux (your attacking machine)</p>
                <p><strong className="text-yellow-300">The pattern:</strong></p>
                <div className="ml-3 space-y-1 font-mono text-xs">
                  <p>1. <span className="text-green-400">ssh</span> user@target → Connect to remote host</p>
                  <p>2. <span className="text-green-400">explore</span> files → Find sensitive data</p>
                  <p>3. <span className="text-green-400">sudo su</span> → Become root = COMPROMISE!</p>
                  <p>4. <span className="text-green-400">exit</span> → Return to Kali for next target</p>
                </div>
                <p className="text-cyan-300 mt-2"><strong>Why exit?</strong> You&apos;re &quot;inside&quot; the target when SSH&apos;d. Must return to Kali to attack the next target.</p>
                <p className="text-fuchsia-300"><strong>Repeat 3 times</strong> (router → server → workstation) = Victory! 🎉</p>
              </div>
            </div>

            {/* Phase 1: Reconnaissance */}
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
              <h4 className="text-green-400 font-semibold mb-2 text-sm">Phase 1: Reconnaissance</h4>
              <p className="text-gray-300 text-xs mb-3">Discover what&apos;s on the network before attacking</p>
              
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-cyan-300 font-semibold text-xs mb-1">Step 1: Network Discovery</div>
                  <div className="bg-black/50 rounded p-2 font-mono text-xs text-green-400">nmap</div>
                  <p className="text-gray-300 text-xs mt-1">
                    <strong className="text-yellow-300">Why:</strong> Scans all hosts on 192.168.1.0/24 network<br/>
                    <strong className="text-yellow-300">Shows:</strong> IP addresses, open ports, and services<br/>
                    <strong className="text-yellow-300">Learn:</strong> 3 targets - Router (.1), Server (.10), Workstation (.15)
                  </p>
                </div>

                <div>
                  <div className="text-cyan-300 font-semibold text-xs mb-1">Step 2: Detailed Port Scan (Optional)</div>
                  <div className="bg-black/50 rounded p-2 font-mono text-xs text-green-400">nmap 192.168.1.10</div>
                  <p className="text-gray-300 text-xs mt-1">
                    <strong className="text-yellow-300">Why:</strong> Get detailed info on specific target<br/>
                    <strong className="text-yellow-300">Port States:</strong><br/>
                    • <span className="text-green-400">OPEN</span> - Service is running and accessible<br/>
                    • <span className="text-yellow-400">FILTERED</span> - Firewall is blocking the port
                  </p>
                </div>
              </div>
            </div>

            {/* Phase 2: Compromise Router */}
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
              <h4 className="text-blue-400 font-semibold mb-2 text-sm">Phase 2: Compromise Router (1/3)</h4>
              <p className="text-gray-300 text-xs mb-3">Attack the router with default credentials</p>
              
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-cyan-300 font-semibold text-xs mb-1">Step 1: SSH to Router</div>
                  <div className="bg-black/50 rounded p-2 font-mono text-xs text-green-400">
                    ssh admin@192.168.1.1<br/>
                    <span className="text-gray-500"># Password: admin</span>
                  </div>
                  <p className="text-gray-300 text-xs mt-1">
                    <strong className="text-yellow-300">Why admin/admin?</strong> Many routers ship with default credentials that admins forget to change
                  </p>
                </div>

                <div>
                  <div className="text-cyan-300 font-semibold text-xs mb-1">Step 2: Explore Router Files</div>
                  <div className="bg-black/50 rounded p-2 font-mono text-xs text-green-400">
                    pwd<br/>
                    ls -la<br/>
                    cat /etc/config
                  </div>
                  <p className="text-gray-300 text-xs mt-1">
                    <strong className="text-yellow-300">What you&apos;ll find:</strong> WiFi password, admin credentials, network config
                  </p>
                </div>

                <div>
                  <div className="text-cyan-300 font-semibold text-xs mb-1">Step 3: Escalate to Root</div>
                  <div className="bg-black/50 rounded p-2 font-mono text-xs text-green-400">sudo su</div>
                  <p className="text-gray-300 text-xs mt-1">
                    <strong className="text-yellow-300">Critical:</strong> This COMPROMISES the host!<br/>
                    <strong className="text-yellow-300">Why:</strong> Root = full system control<br/>
                    <strong className="text-yellow-300">Result:</strong> 🎉 Router compromised (1/3)
                  </p>
                </div>

                <div>
                  <div className="text-cyan-300 font-semibold text-xs mb-1">Step 4: Get All Credentials</div>
                  <div className="bg-black/50 rounded p-2 font-mono text-xs text-green-400">cat /root/network-keys.txt</div>
                  <p className="text-gray-300 text-xs mt-1">
                    <strong className="text-yellow-300">Goldmine:</strong> Contains passwords for ALL systems!<br/>
                    <strong className="text-yellow-300">Use:</strong> These credentials to attack other hosts
                  </p>
                </div>

                <div>
                  <div className="text-cyan-300 font-semibold text-xs mb-1">Step 5: Disconnect</div>
                  <div className="bg-black/50 rounded p-2 font-mono text-xs text-green-400">exit</div>
                  <p className="text-gray-300 text-xs mt-1">
                    <strong className="text-yellow-300">Why exit?</strong><br/>
                    • You&apos;ve fully compromised this host (1/3 complete)<br/>
                    • Need to return to Kali to attack next target<br/>
                    • SSH sessions are per-host, so exit to disconnect<br/>
                    • All your progress is saved (router stays compromised)<br/>
                    <strong className="text-yellow-300">What happens:</strong> Returns you to root@kali:~#
                  </p>
                </div>
              </div>
            </div>

            {/* Phase 3: Compromise Web Server */}
            <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3">
              <h4 className="text-purple-400 font-semibold mb-2 text-sm">Phase 3: Compromise Web Server (2/3)</h4>
              <p className="text-gray-300 text-xs mb-3">Attack the web server and capture the FLAG</p>
              
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-cyan-300 font-semibold text-xs mb-1">Step 1: SSH to Web Server</div>
                  <div className="bg-black/50 rounded p-2 font-mono text-xs text-green-400">
                    ssh webadmin@192.168.1.10<br/>
                    <span className="text-gray-500"># Password: P@ssw0rd123</span>
                  </div>
                  <p className="text-gray-300 text-xs mt-1">
                    <strong className="text-yellow-300">Why this works:</strong> Weak password found in router&apos;s network-keys.txt
                  </p>
                </div>

                <div>
                  <div className="text-cyan-300 font-semibold text-xs mb-1">Step 2: Find Sensitive Data</div>
                  <div className="bg-black/50 rounded p-2 font-mono text-xs text-green-400">
                    ls -la<br/>
                    cat ~/documents/credentials.txt<br/>
                    cat ~/documents/notes.txt
                  </div>
                  <p className="text-gray-300 text-xs mt-1">
                    <strong className="text-yellow-300">credentials.txt:</strong> MySQL root password<br/>
                    <strong className="text-yellow-300">notes.txt:</strong> Tells you where the FLAG is hidden!
                  </p>
                </div>

                <div>
                  <div className="text-cyan-300 font-semibold text-xs mb-1">Step 3: Escalate to Root</div>
                  <div className="bg-black/50 rounded p-2 font-mono text-xs text-green-400">sudo su</div>
                  <p className="text-gray-300 text-xs mt-1">
                    <strong className="text-yellow-300">Result:</strong> 🎉 Web Server compromised (2/3)
                  </p>
                </div>

                <div>
                  <div className="text-cyan-300 font-semibold text-xs mb-1">Step 4: Capture the FLAG</div>
                  <div className="bg-black/50 rounded p-2 font-mono text-xs text-green-400">cat /var/www/html/admin/flag.txt</div>
                  <p className="text-gray-300 text-xs mt-1">
                    <strong className="text-yellow-300">Victory:</strong> 🏆 FLAG captured! +500 points
                  </p>
                </div>

                <div>
                  <div className="text-cyan-300 font-semibold text-xs mb-1">Step 5: Disconnect</div>
                  <div className="bg-black/50 rounded p-2 font-mono text-xs text-green-400">exit</div>
                  <p className="text-gray-300 text-xs mt-1">
                    <strong className="text-yellow-300">Why exit?</strong><br/>
                    • Web server fully compromised (2/3 complete)<br/>
                    • FLAG captured - mission on this host complete<br/>
                    • Must return to Kali to attack final target<br/>
                    <strong className="text-yellow-300">Progress:</strong> 2/3 hosts compromised, 1 remaining!
                  </p>
                </div>
              </div>
            </div>

            {/* Phase 4: Compromise Workstation */}
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
              <h4 className="text-red-400 font-semibold mb-2 text-sm">Phase 4: Compromise Workstation (3/3)</h4>
              <p className="text-gray-300 text-xs mb-3">Final target - complete network compromise!</p>
              
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-cyan-300 font-semibold text-xs mb-1">Step 1: SSH to Workstation</div>
                  <div className="bg-black/50 rounded p-2 font-mono text-xs text-green-400">
                    ssh employee@192.168.1.15<br/>
                    <span className="text-gray-500"># Password: Welcome123!</span>
                  </div>
                  <p className="text-gray-300 text-xs mt-1">
                    <strong className="text-yellow-300">Why this works:</strong> Password from router&apos;s network-keys.txt
                  </p>
                </div>

                <div>
                  <div className="text-cyan-300 font-semibold text-xs mb-1">Step 2: Find Password File</div>
                  <div className="bg-black/50 rounded p-2 font-mono text-xs text-green-400">
                    ls -la<br/>
                    cat ~/Desktop/passwords.txt
                  </div>
                  <p className="text-gray-300 text-xs mt-1">
                    <strong className="text-yellow-300">Jackpot:</strong> Employee&apos;s password list with ALL credentials!<br/>
                    <strong className="text-yellow-300">Real world:</strong> People often store passwords in plain text files
                  </p>
                </div>

                <div>
                  <div className="text-cyan-300 font-semibold text-xs mb-1">Step 3: Escalate to Root</div>
                  <div className="bg-black/50 rounded p-2 font-mono text-xs text-green-400">sudo su</div>
                  <p className="text-gray-300 text-xs mt-1">
                    <strong className="text-yellow-300">Result:</strong> 🎉 Workstation compromised (3/3)<br/>
                    <strong className="text-fuchsia-500">MISSION COMPLETE!</strong><br/>
                    <strong className="text-yellow-300">Note:</strong> Victory screen appears automatically - no need to exit!
                  </p>
                </div>

                {/* Reality Check */}
                <div className="bg-orange-900/30 border-2 border-orange-500 rounded p-2 mt-3">
                  <div className="text-orange-400 font-semibold text-xs mb-2">⚠️ REALITY CHECK: How Real Pentests Differ</div>
                  <div className="text-gray-300 text-xs space-y-2">
                    <div>
                      <strong className="text-yellow-300">In this simulation:</strong>
                      <div className="ml-3 text-xs">
                        • You know the exact IP addresses<br/>
                        • Passwords work instantly when typed<br/>
                        • sudo su always succeeds<br/>
                        • No account lockouts or alerts<br/>
                        • Network is small (3 hosts)
                      </div>
                    </div>
                    
                    <div>
                      <strong className="text-yellow-300">In real life:</strong>
                      <div className="ml-3 text-xs">
                        • <strong>Network discovery:</strong> Could have 100s-1000s of hosts<br/>
                        • <strong>Password attacks:</strong> May take hours/days with tools like hydra, hashcat<br/>
                        • <strong>Privilege escalation:</strong> Usually requires finding vulnerabilities (CVEs, misconfigurations, SUID binaries)<br/>
                        • <strong>Detection:</strong> IDS/IPS, EDR, SIEM logs track your actions<br/>
                        • <strong>Account lockouts:</strong> Too many wrong passwords = locked out<br/>
                        • <strong>Time pressure:</strong> Blue team actively hunting you<br/>
                        • <strong>Lateral movement:</strong> May need to pivot through multiple hosts<br/>
                        • <strong>Persistence:</strong> Need backdoors to maintain access
                      </div>
                    </div>

                    <div>
                      <strong className="text-yellow-300">What IS realistic here:</strong>
                      <div className="ml-3 text-xs">
                        ✓ <strong>Default credentials:</strong> Very common (admin/admin on routers)<br/>
                        ✓ <strong>Password reuse:</strong> Same password across multiple systems<br/>
                        ✓ <strong>Plain text passwords:</strong> Users DO store passwords.txt on Desktop<br/>
                        ✓ <strong>Methodology:</strong> Recon → Exploit → Privilege Escalation → Pivot<br/>
                        ✓ <strong>Weak passwords:</strong> Welcome123!, P@ssw0rd123 are real examples<br/>
                        ✓ <strong>Network documentation:</strong> Finding master password lists on routers
                      </div>
                    </div>

                    <div>
                      <strong className="text-cyan-300">Educational purpose:</strong>
                      <div className="ml-3 text-xs">
                        This simulation teaches the <em>workflow and methodology</em> of penetration testing.<br/>
                        Real attacks require more advanced techniques (exploit development, hash cracking,<br/>
                        vulnerability research), but the core principles are the same.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-cyan-900/30 border border-cyan-600 rounded p-2 mt-3">
                  <div className="text-cyan-300 font-semibold text-xs mb-1">💡 Understanding &quot;exit&quot;</div>
                  <p className="text-gray-300 text-xs">
                    <strong className="text-yellow-300">What is SSH?</strong> Secure Shell - creates a remote connection to another computer<br/>
                    <strong className="text-yellow-300">Why exit between targets?</strong><br/>
                    • You&apos;re IN the router when connected via SSH<br/>
                    • To attack server, you need to be back on Kali<br/>
                    • exit = close SSH connection = return to Kali<br/>
                    • Think: &quot;hang up the phone&quot; to call someone else<br/>
                    <strong className="text-yellow-300">Your progress is saved!</strong> Compromised hosts stay compromised
                  </p>
                </div>
              </div>
            </div>

            {/* Victory */}
            <div className="bg-gradient-to-r from-fuchsia-900/30 to-cyan-900/30 border border-fuchsia-500 rounded-lg p-3">
              <h4 className="text-fuchsia-400 font-semibold mb-2 text-sm">🎉 NETWORK FULLY COMPROMISED! 🎉</h4>
              <div className="text-xs text-gray-300 space-y-1">
                <p>✓ All 3 hosts compromised</p>
                <p>✓ FLAG captured</p>
                <p>✓ Victory sound plays</p>
                <p>✓ Final score and time displayed</p>
                <p className="text-fuchsia-300 mt-2">You&apos;ve successfully completed a full network penetration test!</p>
              </div>
            </div>
          </div>
        );

      case 'commands':
        return (
          <div className="space-y-3">
            <h3 className="text-green-400 font-bold text-lg">Command Reference</h3>

            <div className="bg-gray-900 rounded-lg p-3">
              <h4 className="text-green-400 font-semibold mb-2 text-sm">Network Reconnaissance</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-yellow-300 font-mono">ping &lt;host&gt; [-c count]</div>
                  <div className="text-gray-200">Send ICMP echo requests to test if a host is reachable</div>
                </div>
                <div>
                  <div className="text-yellow-300 font-mono">nmap [host]</div>
                  <div className="text-gray-200">Scan network for active hosts and open ports</div>
                </div>
                <div>
                  <div className="text-yellow-300 font-mono">netstat</div>
                  <div className="text-gray-200">Display active network connections and listening ports</div>
                </div>
                <div>
                  <div className="text-yellow-300 font-mono">ifconfig</div>
                  <div className="text-gray-200">Show network interface configuration and IP addresses</div>
                </div>
                <div>
                  <div className="text-yellow-300 font-mono">arp -a</div>
                  <div className="text-gray-200">Display the ARP cache (IP to MAC address mappings)</div>
                </div>
                <div>
                  <div className="text-yellow-300 font-mono">route</div>
                  <div className="text-gray-200">Show the routing table for network traffic</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-3">
              <h4 className="text-green-400 font-semibold mb-2 text-sm">Remote Access</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-yellow-300 font-mono">ssh user@host</div>
                  <div className="text-gray-200">Connect to a remote host via Secure Shell</div>
                </div>
                <div>
                  <div className="text-yellow-300 font-mono">exit / logout</div>
                  <div className="text-gray-200">Disconnect from the current SSH session</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-3">
              <h4 className="text-green-400 font-semibold mb-2 text-sm">File System Navigation</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-yellow-300 font-mono">ls [-la] [path]</div>
                  <div className="text-gray-200">List directory contents (-l long format, -a show hidden files)</div>
                </div>
                <div>
                  <div className="text-yellow-300 font-mono">cd &lt;directory&gt;</div>
                  <div className="text-gray-200">Change current working directory (.. = parent, ~ = home)</div>
                </div>
                <div>
                  <div className="text-yellow-300 font-mono">pwd</div>
                  <div className="text-gray-200">Print the current working directory path</div>
                </div>
                <div>
                  <div className="text-yellow-300 font-mono">cat &lt;file&gt;</div>
                  <div className="text-gray-200">Display the contents of a file</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-3">
              <h4 className="text-green-400 font-semibold mb-2 text-sm">File Search & Analysis</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-yellow-300 font-mono">find &lt;path&gt; -name &lt;pattern&gt;</div>
                  <div className="text-gray-200">Search for files by name in directory tree</div>
                </div>
                <div>
                  <div className="text-yellow-300 font-mono">grep &lt;pattern&gt; &lt;file&gt;</div>
                  <div className="text-gray-200">Search for text patterns within files</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-3">
              <h4 className="text-green-400 font-semibold mb-2 text-sm">User & Privilege Management</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-yellow-300 font-mono">whoami</div>
                  <div className="text-gray-200">Display the current logged-in username</div>
                </div>
                <div>
                  <div className="text-yellow-300 font-mono">id</div>
                  <div className="text-gray-200">Show user ID, group ID, and group memberships</div>
                </div>
                <div>
                  <div className="text-yellow-300 font-mono">sudo su</div>
                  <div className="text-gray-200">Switch to root user (requires sudo privileges)</div>
                </div>
                <div>
                  <div className="text-yellow-300 font-mono">sudo &lt;command&gt;</div>
                  <div className="text-gray-200">Execute a command with root privileges</div>
                </div>
                <div>
                  <div className="text-yellow-300 font-mono">su [user]</div>
                  <div className="text-gray-200">Switch to another user account</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-3">
              <h4 className="text-green-400 font-semibold mb-2 text-sm">System Information</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-yellow-300 font-mono">hostname</div>
                  <div className="text-gray-200">Display the system&apos;s hostname</div>
                </div>
                <div>
                  <div className="text-yellow-300 font-mono">uname -a</div>
                  <div className="text-gray-200">Show detailed system information</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-3">
              <h4 className="text-green-400 font-semibold mb-2 text-sm">Firewall & Security</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-yellow-300 font-mono">sudo iptables -L</div>
                  <div className="text-gray-200">List all iptables firewall rules</div>
                </div>
                <div>
                  <div className="text-yellow-300 font-mono">sudo ufw status</div>
                  <div className="text-gray-200">Check UFW (Uncomplicated Firewall) status</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-3">
              <h4 className="text-green-400 font-semibold mb-2 text-sm">Password Cracking</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-yellow-300 font-mono">hydra &lt;host&gt;</div>
                  <div className="text-gray-200">Auto-crack SSH with common password wordlist</div>
                </div>
                <div>
                  <div className="text-yellow-300 font-mono">hydra -l &lt;user&gt; &lt;host&gt;</div>
                  <div className="text-gray-200">Specify username to crack</div>
                </div>
                <div className="text-xs text-gray-400 ml-2">
                  • Examples: hydra 192.168.1.1<br/>
                  • hydra -l webadmin 192.168.1.10<br/>
                  • Tries common passwords automatically<br/>
                  • Shows attempts in real-time
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-3">
              <h4 className="text-green-400 font-semibold mb-2 text-sm">Mission Commands</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-yellow-300 font-mono">status</div>
                  <div className="text-gray-200">Display current penetration test progress</div>
                </div>
                <div>
                  <div className="text-yellow-300 font-mono">score</div>
                  <div className="text-gray-200">Show your current point score</div>
                </div>
                <div>
                  <div className="text-yellow-300 font-mono">achievements</div>
                  <div className="text-gray-200">View unlocked achievements and progress</div>
                </div>
                <div>
                  <div className="text-yellow-300 font-mono">clear</div>
                  <div className="text-gray-200">Clear the terminal screen</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'objectives':
        return (
          <div className="space-y-3">
            <h3 className="text-green-400 font-bold text-lg">Objectives</h3>
            
            <div className="space-y-2">
              {[
                { key: 'discover_network', text: 'Discover all hosts', points: 50 },
                { key: 'connect_to_host', text: 'SSH into target', points: 100 },
                { key: 'find_passwords', text: 'Find passwords', points: 150 },
                { key: 'escalate_privileges', text: 'Get root access', points: 200 },
                { key: 'read_firewall_logs', text: 'Read firewall logs', points: 100 },
                { key: 'capture_flag', text: 'Capture FLAG', points: 500 },
                { key: 'compromise_all_hosts', text: 'Pwn all hosts', points: 500 }
              ].map(obj => (
                <div key={obj.key} className="bg-gray-900 rounded p-2 flex items-start gap-2 text-xs">
                  {objectives[obj.key] ? (
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className={objectives[obj.key] ? 'text-green-400' : 'text-gray-300'}>
                      {obj.text}
                    </div>
                    <div className="text-gray-500">+{obj.points} pts</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'firewall':
        return (
          <div className="space-y-4">
            <h3 className="text-green-400 font-bold text-lg">Firewalls</h3>

            <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-3">
              <h4 className="text-orange-400 font-semibold mb-2 text-sm">What is a Firewall?</h4>
              <p className="text-gray-300 text-xs leading-relaxed">
                Controls network traffic based on security rules. Can ALLOW or BLOCK specific ports.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-cyan-400 font-semibold text-sm">Port States:</h4>
              <div className="space-y-2 text-xs">
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-green-400 font-semibold">OPEN</div>
                  <div className="text-gray-400">Service running, firewall allows</div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-yellow-400 font-semibold">FILTERED</div>
                  <div className="text-gray-400">Firewall blocking external access</div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-red-400 font-semibold">CLOSED</div>
                  <div className="text-gray-400">No service running</div>
                </div>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
              <h4 className="text-blue-400 font-semibold mb-2 text-sm">Check Firewall:</h4>
              <div className="bg-black/50 rounded p-2 font-mono text-xs text-green-400">
                sudo iptables -L<br/>
                sudo ufw status<br/>
                cat /var/log/ufw.log
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="text-cyan-400 font-semibold text-sm">Network Rules:</h4>
              <div className="bg-gray-900 rounded p-2">
                <div className="text-yellow-300 mb-1">Router (192.168.1.1)</div>
                <div className="text-gray-400">• Telnet (23): Filtered</div>
                <div className="text-gray-400">• HTTPS (443): Blocked</div>
              </div>
              <div className="bg-gray-900 rounded p-2">
                <div className="text-yellow-300 mb-1">Server (192.168.1.10)</div>
                <div className="text-gray-400">• MySQL (3306): LAN only</div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Victory Modal
  if (showVictory) {
    const minutes = Math.floor(gameStats.timeElapsed / 60);
    const seconds = gameStats.timeElapsed % 60;
    const efficiency = calculateEfficiency();

    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-4 z-50 font-mono overflow-auto">
        <div className="w-full max-w-3xl bg-gray-900 rounded-lg shadow-[0_0_50px_rgba(239,68,68,0.5)] p-6 my-auto border-2 border-red-500/50">
          
          {/* Rotating Line Grid Sphere */}
          <div className="text-center mb-4">
            <div className="inline-block w-24 h-24 mb-3 relative">
              <svg viewBox="0 0 100 100" className="w-full h-full animate-spin" style={{animationDuration: '8s'}}>
                {/* Horizontal lines */}
                <ellipse cx="50" cy="50" rx="45" ry="10" fill="none" stroke="#ef4444" strokeWidth="0.5" opacity="0.8"/>
                <ellipse cx="50" cy="50" rx="45" ry="20" fill="none" stroke="#ef4444" strokeWidth="0.5" opacity="0.6"/>
                <ellipse cx="50" cy="50" rx="45" ry="30" fill="none" stroke="#ef4444" strokeWidth="0.5" opacity="0.4"/>
                <ellipse cx="50" cy="50" rx="45" ry="40" fill="none" stroke="#ef4444" strokeWidth="0.5" opacity="0.3"/>
                <ellipse cx="50" cy="50" rx="45" ry="45" fill="none" stroke="#ef4444" strokeWidth="0.5" opacity="0.2"/>
                
                {/* Vertical lines */}
                <ellipse cx="50" cy="50" rx="10" ry="45" fill="none" stroke="#ef4444" strokeWidth="0.5" opacity="0.8"/>
                <ellipse cx="50" cy="50" rx="20" ry="45" fill="none" stroke="#ef4444" strokeWidth="0.5" opacity="0.6"/>
                <ellipse cx="50" cy="50" rx="30" ry="45" fill="none" stroke="#ef4444" strokeWidth="0.5" opacity="0.4"/>
                <ellipse cx="50" cy="50" rx="40" ry="45" fill="none" stroke="#ef4444" strokeWidth="0.5" opacity="0.3"/>
                
                {/* Outer circle */}
                <circle cx="50" cy="50" r="45" fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.9"/>
                
                {/* Center glow */}
                <circle cx="50" cy="50" r="5" fill="#ef4444" opacity="0.6">
                  <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite"/>
                </circle>
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-2 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
              MISSION COMPLETE
            </h2>
            <p className="text-red-400 text-sm">Network Fully Compromised</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-900 rounded-lg p-3 border border-red-500/30">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-red-400" />
                <span className="text-gray-400 text-xs">Time Taken</span>
              </div>
              <p className="text-xl font-bold text-red-400">{minutes}m {seconds}s</p>
              <p className="text-xs text-gray-500 mt-1">{efficiency.timeEfficiency}</p>
            </div>

            <div className="bg-gray-900 rounded-lg p-3 border border-red-500/30">
              <div className="flex items-center gap-2 mb-1">
                <Terminal className="w-4 h-4 text-red-400" />
                <span className="text-gray-400 text-xs">Commands Used</span>
              </div>
              <p className="text-xl font-bold text-red-400">{gameStats.commandsUsed}</p>
              <p className="text-xs text-gray-500 mt-1">Efficiency: {efficiency.commandEfficiency}</p>
            </div>

            <div className="bg-gray-900 rounded-lg p-3 border border-red-500/30">
              <div className="flex items-center gap-2 mb-1">
                <Server className="w-4 h-4 text-red-400" />
                <span className="text-gray-400 text-xs">Hosts Pwned</span>
              </div>
              <p className="text-xl font-bold text-red-400">{compromisedHosts.length}/3</p>
              <p className="text-xs text-gray-500 mt-1">100% Complete</p>
            </div>

            <div className="bg-gray-900 rounded-lg p-3 border border-red-500/30">
              <div className="flex items-center gap-2 mb-1">
                <Server className="w-4 h-4 text-red-400" />
                <span className="text-gray-400 text-xs">Final Score</span>
              </div>
              <p className="text-xl font-bold text-red-400">{score}</p>
              <p className="text-xs text-gray-500 mt-1">Points Earned</p>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-red-500/30 my-4"></div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={shareResults}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 border border-red-500 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] text-sm"
            >
              <Share2 className="w-4 h-4" />
              Share Results
            </button>
            <button
              onClick={resetGame}
              className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-red-500 rounded-lg font-bold transition-all flex items-center justify-center gap-2 text-red-400 hover:text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Play Again
            </button>
          </div>

          {/* Next Level Teaser */}
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
            <p className="text-gray-400 text-xs mb-1">Ready for the next challenge?</p>
            <p className="text-red-400 font-bold text-sm">Level 2: Web Application Exploitation</p>
            <p className="text-gray-500 text-xs mt-1">Coming Soon...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-[1800px] mx-auto flex gap-4" style={{height: 'calc(100vh - 2rem)'}}>
        
        {/* LEFT WINDOW - TERMINAL (Always Visible) */}
        <div className="flex-1 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 flex flex-col">
          {/* Terminal Header */}
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

          {/* Terminal Screen */}
          <div
            ref={terminalRef}
            className="flex-1 bg-black p-6 overflow-y-auto font-mono text-sm leading-relaxed cursor-text"
            onClick={() => inputRef.current?.focus()}
          >
            {history.map((entry, i) => (
              <div key={i} className={`${getTypeColor(entry.type)} whitespace-pre-wrap`}>
                {entry.text}
              </div>
            ))}

            {/* Input Line */}
            <div className="flex items-center text-green-400 mt-1">
              <span className="select-none">{getPrompt()}</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleInput}
                className="flex-1 bg-transparent outline-none text-green-400 caret-green-400"
                autoFocus
                spellCheck={false}
              />
              <span className="animate-pulse ml-1">▊</span>
            </div>
          </div>

          {/* Status Bar */}
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
        </div>

        {/* RIGHT WINDOW - DOCUMENTATION (Always Visible) */}
        <div className="w-96 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 flex flex-col">
          {/* Doc Header */}
          <div className="bg-gray-950 px-4 py-3 border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Book className="w-4 h-4 text-green-400" />
              <span className="text-green-400 font-mono text-sm font-semibold">Documentation</span>
            </div>
          </div>

          {/* Doc Tabs */}
          <div className="bg-gray-900 border-b border-gray-700 p-2 flex flex-wrap gap-2 flex-shrink-0">
            {[
              { key: 'welcome', label: 'Welcome', icon: Home },
              { key: 'tutorial', label: 'Tutorial', icon: Book },
              { key: 'commands', label: 'Commands', icon: Code },
              { key: 'objectives', label: 'Objectives', icon: Target },
              { key: 'firewall', label: 'Firewall', icon: Shield }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-colors ${
                    activeTab === tab.key
                      ? 'bg-green-900/50 text-green-400 border border-green-700'
                      : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Doc Content */}
          <div className="flex-1 overflow-y-auto p-4 text-sm">
            {renderDocContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HackingTerminal;
