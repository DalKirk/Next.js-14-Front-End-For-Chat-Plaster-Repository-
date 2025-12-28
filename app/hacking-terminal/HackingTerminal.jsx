import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Wifi, Server, Monitor, Lock, Unlock, Award, Flag, CheckCircle, XCircle, Target, Book, Home, Code, Shield } from 'lucide-react';

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
    speed_run: false
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
  const [startTime] = useState(Date.now());
  
  const terminalRef = useRef(null);
  const inputRef = useRef(null);

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
        '/var/www/html/admin/flag.txt': { type: 'file', content: '╔══════════════════════════════════════════════════╗\n║          🏆 CONGRATULATIONS! 🏆                  ║\n║  FLAG{pwn3d_th3_s3rv3r_l1k3_a_pr0_2024}         ║\n╚══════════════════════════════════════════════════╝' },
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
      addOutput('', 'output');
      addOutput('╔══════════════════════════════════════════════════╗', 'achievement');
      addOutput('║           🏆 ACHIEVEMENT UNLOCKED! 🏆            ║', 'achievement');
      addOutput('╠══════════════════════════════════════════════════╣', 'achievement');
      addOutput(`║  ${message.padEnd(48)} ║`, 'achievement');
      addOutput(`║  Points: +${points.toString().padEnd(42)} ║`, 'achievement');
      addOutput('╚══════════════════════════════════════════════════╝', 'achievement');
      addOutput('', 'output');
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
      
      addOutput('', 'output');
      addOutput('╔══════════════════════════════════════════════════╗', 'success');
      addOutput('║              🎯 HOST COMPROMISED! 🎯             ║', 'success');
      addOutput('╠══════════════════════════════════════════════════╣', 'success');
      addOutput(`║  Target: ${host.name.padEnd(41)} ║`, 'success');
      addOutput(`║  IP: ${targetIP.padEnd(45)} ║`, 'success');
      addOutput(`║  Points Earned: +${host.value.toString().padEnd(34)} ║`, 'success');
      addOutput('╚══════════════════════════════════════════════════╝', 'success');
      addOutput('', 'output');

      if (compromisedHosts.length + 1 === Object.keys(network).length) {
        setTimeout(() => showVictoryScreen(), 1000);
      }
    }
  };

  const showVictoryScreen = () => {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    
    addOutput('', 'output');
    addOutput('╔══════════════════════════════════════════════════════════╗', 'victory');
    addOutput('║          🎉🎉🎉 NETWORK FULLY COMPROMISED! 🎉🎉🎉          ║', 'victory');
    addOutput('╠══════════════════════════════════════════════════════════╣', 'victory');
    addOutput('║                   MISSION COMPLETE                       ║', 'victory');
    addOutput('╠══════════════════════════════════════════════════════════╣', 'victory');
    addOutput(`║  Total Score: ${score.toString().padEnd(44)} ║`, 'victory');
    addOutput(`║  Time: ${minutes}m ${seconds}s${' '.repeat(48 - (minutes.toString().length + seconds.toString().length))} ║`, 'victory');
    addOutput('╚══════════════════════════════════════════════════════════╝', 'victory');
    addOutput('', 'output');

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
    addOutput('╔═══════════════════════════════════════════════════════════╗', 'ascii');
    addOutput('║  Penetration Testing Framework v4.0.0                    ║', 'ascii');
    addOutput('║  Full Network Simulation with Tutorial System            ║', 'ascii');
    addOutput('╚═══════════════════════════════════════════════════════════╝', 'ascii');
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
      addOutput('╔══════════════════════════════════════════════════════════╗', 'header');
      addOutput('║                      ACHIEVEMENTS                        ║', 'header');
      addOutput('╚══════════════════════════════════════════════════════════╝', 'header');
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
      addOutput('╔══════════════════════════════════════════════════════════╗', 'header');
      addOutput('║                 PENETRATION TEST STATUS                  ║', 'header');
      addOutput('╚══════════════════════════════════════════════════════════╝', 'header');
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
        addOutput('', 'output');
        addOutput(node.content, 'victory');
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

    hydra: async () => {
      addOutput(`Hydra v9.5 starting...`, 'system');
      await new Promise(resolve => setTimeout(resolve, 1500));
      addOutput('[ATTEMPT] Trying common passwords...', 'output');
      await new Promise(resolve => setTimeout(resolve, 1000));
      addOutput('[SUCCESS] Credentials found: admin/admin', 'success');
    }
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
      victory: 'text-cyan-300'
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
            <h3 className="text-green-400 font-bold text-lg">Complete Tutorial</h3>

            <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
              <h4 className="text-green-400 font-semibold mb-2 text-sm">Phase 1: Reconnaissance</h4>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-cyan-300 font-semibold text-xs mb-1">Step 1: Ping</div>
                  <div className="bg-black/50 rounded p-2 font-mono text-xs text-green-400">
                    ping 192.168.1.1<br/>
                    ping 192.168.1.10 -c 3
                  </div>
                  <p className="text-gray-400 text-xs mt-1">Check if hosts are alive</p>
                </div>

                <div>
                  <div className="text-cyan-300 font-semibold text-xs mb-1">Step 2: Scan</div>
                  <div className="bg-black/50 rounded p-2 font-mono text-xs text-green-400">
                    nmap<br/>
                    nmap 192.168.1.10
                  </div>
                  <div className="text-xs mt-1 space-y-1">
                    <div className="text-green-400">• OPEN - Service running</div>
                    <div className="text-yellow-400">• FILTERED - Firewall blocking</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
              <h4 className="text-blue-400 font-semibold mb-2 text-sm">Phase 2: Exploitation</h4>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-cyan-300 font-semibold text-xs mb-1">Step 3: SSH Access</div>
                  <div className="bg-black/50 rounded p-2 font-mono text-xs text-green-400">
                    ssh admin@192.168.1.1<br/>
                    ssh webadmin@192.168.1.10<br/>
                    ssh employee@192.168.1.15
                  </div>
                  <p className="text-yellow-300 text-xs mt-1">Common passwords to try: admin, password, toor, P@ssw0rd123, Welcome123!</p>
                </div>

                <div>
                  <div className="text-cyan-300 font-semibold text-xs mb-1">Step 4: Explore Files</div>
                  <div className="bg-black/50 rounded p-2 font-mono text-xs text-green-400">
                    <span className="text-gray-500"># On router:</span><br/>
                    cat /etc/config<br/>
                    <span className="text-gray-500"># On web server:</span><br/>
                    cat ~/documents/credentials.txt<br/>
                    <span className="text-gray-500"># On workstation:</span><br/>
                    cat ~/Desktop/passwords.txt
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3">
              <h4 className="text-purple-400 font-semibold mb-2 text-sm">Phase 3: Privilege Escalation</h4>
              <div className="text-sm">
                <div className="text-cyan-300 font-semibold text-xs mb-1">Step 5: Become Root</div>
                <div className="bg-black/50 rounded p-2 font-mono text-xs text-green-400 mb-1">
                  whoami<br/>
                  sudo su<br/>
                  <span className="text-gray-500"># Now access protected files:</span><br/>
                  cat /root/network-keys.txt<br/>
                  cat /root/secret.txt
                </div>
                <p className="text-gray-400 text-xs">Root = complete system control</p>
              </div>
            </div>

            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
              <h4 className="text-red-400 font-semibold mb-2 text-sm">Phase 4: Capture the Flag</h4>
              <div className="text-xs text-gray-300 space-y-1">
                <p>1. <span className="text-yellow-300 font-mono">ssh webadmin@192.168.1.10</span> (password: P@ssw0rd123)</p>
                <p>2. <span className="text-yellow-300 font-mono">cat ~/documents/notes.txt</span> (get hint)</p>
                <p>3. <span className="text-yellow-300 font-mono">sudo su</span> (become root)</p>
                <p>4. <span className="text-yellow-300 font-mono">cat /var/www/html/admin/flag.txt</span> 🏆</p>
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
                  <div className="text-yellow-300 font-mono">hydra -l &lt;user&gt; -P &lt;wordlist&gt; &lt;host&gt; ssh</div>
                  <div className="text-gray-200">Attempt to brute force SSH login credentials</div>
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
