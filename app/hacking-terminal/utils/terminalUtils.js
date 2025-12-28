export const checkFirewall = (targetIP, port, protocol = 'tcp', network) => {
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

export const simulateLatency = async (targetIP, network) => {
  const host = network[targetIP];
  const latency = host ? host.latency : 50;
  return new Promise(resolve => setTimeout(resolve, latency));
};

export const resolvePath = (path, current, currentTarget, network, currentUser) => {
  if (!currentTarget) return path;
  
  if (path.startsWith('~')) {
    const host = network[currentTarget];
    const homeDir = `/home/${currentUser}`;
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

export const getFileSystemNode = (path, currentTarget, network, currentDir, currentUser) => {
  if (!currentTarget) return null;
  const host = network[currentTarget];
  const resolvedPath = path === '/' ? '/' : resolvePath(path, currentDir, currentTarget, network, currentUser);
  return host.fileSystem[resolvedPath];
};

export const getTypeColor = (type) => {
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
