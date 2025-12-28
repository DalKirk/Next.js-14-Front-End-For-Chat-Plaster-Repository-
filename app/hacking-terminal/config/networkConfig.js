export const network = {
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
