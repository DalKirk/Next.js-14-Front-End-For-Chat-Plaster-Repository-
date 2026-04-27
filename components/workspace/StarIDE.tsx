'use client';

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import dynamic from 'next/dynamic';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import type { Monaco } from '@monaco-editor/react';
import { loader } from '@monaco-editor/react';
import { createSandbox, getSandboxStatus, runCode, runCommand, writeFile, exposePort, getViewportUrl, gitOp } from '@/services/ideApi';
import type { GitAction, GitFile, GitCommit } from '@/services/ideApi';
import { PyodideRunner } from './PyodideRunner';

// Load Monaco from the self-hosted copy in public/monaco/vs (no external CDN)
loader.config({ paths: { vs: '/monaco/vs' } });

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

// ─── palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:       '#000000',
  surface:  '#0a0a0f',
  raised:   '#0f111a',
  border:   '#1a1a2e',
  hover:    '#ffffff08',
  active:   '#ffffff12',
  text:     '#8f93a2',
  muted:    '#525975',
  dim:      '#3b3f51',
  accent:   '#80cbc4',
  accentBg: '#80cbc415',
  green:    '#c3e88d',
  red:      '#ff5370',
  orange:   '#ffcb6b',
};
const MONO = `'JetBrains Mono','Fira Code',Consolas,monospace`;
const UI   = `'IBM Plex Sans',system-ui,sans-serif`;

// ─── language / colour helpers ────────────────────────────────────────────────
const EXT_LANG: Record<string, string> = {
  py: 'python', ts: 'typescript', tsx: 'typescriptreact', js: 'javascript',
  jsx: 'javascript', html: 'html', css: 'css', json: 'json', md: 'markdown',
  rs: 'rust', go: 'go', cpp: 'cpp', cs: 'csharp', java: 'java',
  sql: 'sql', sh: 'shell', yaml: 'yaml', yml: 'yaml',
};
const EXT_COLOR: Record<string, string> = {
  py: '#3572A5', ts: '#3178c6', tsx: '#3178c6', js: '#f1e05a', jsx: '#f1e05a',
  html: '#e34c26', css: '#563d7c', json: '#f1e05a', md: '#083fa1',
  rs: '#dea584', go: '#00ADD8', cpp: '#f34b7d', cs: '#178600', java: '#b07219',
};
const getExt  = (n: string) => n.split('.').pop() ?? '';
const getLang = (n: string) => EXT_LANG[getExt(n)] ?? 'plaintext';
const getCol  = (n: string) => EXT_COLOR[getExt(n)] ?? C.muted;

// ─── file tree ────────────────────────────────────────────────────────────────
type TreeNode = { _f?: boolean; [k: string]: TreeNode | boolean | undefined };

function buildTree(files: Record<string, string>): TreeNode {
  const root: TreeNode = {};
  for (const path of Object.keys(files)) {
    const parts = path.split('/');
    let cur = root;
    parts.forEach((p, i) => {
      if (i === parts.length - 1) {
        (cur as Record<string, TreeNode>)[p] = { _f: true };
      } else {
        if (!cur[p]) cur[p] = {} as TreeNode;
        cur = cur[p] as TreeNode;
      }
    });
  }
  return root;
}

// ─── svg icons ────────────────────────────────────────────────────────────────
const ic = {
  file:    'M6 2h8l4 4v14a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zm8 0v4h4',
  folderC: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
  folderO: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM3 11h18',
  search:  'M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z',
  settings:'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
  play:    'M5 3l14 9-14 9V3z',
  stop:    'M6 6h12v12H6z',
  term:    'M4 17l6-6-6-6M12 19h8',
  x:       'M18 6L6 18M6 6l12 12',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
  chevR:   'M9 18l6-6-6-6',
  chevD:   'M6 9l6 6 6-6',
  save:    'M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8',
  newFile: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM12 18v-6M9 15h6',
  newDir:  'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2zM12 11v6M9 14h6',
  trash:   'M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2',
  newProj: 'M3 3h7v4H3zM14 3h7v4h-7zM3 11h7v4H3zM14 11h7v4h-7zM8 19h8M12 16v6',
  copy:    'M20 9H11a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1',
  help:    'M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01',
};

function Ic({ d, size = 16, color = C.muted }: { d: string; size?: number; color?: string }) {
  const paths = d.split(/(?=M)/).filter(Boolean);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, display: 'block' }}>
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

// ─── tree node ────────────────────────────────────────────────────────────────
function TreeItem({
  name, node, depth, active, onPick, exp, toggle, pfx, onDelete,
}: {
  name: string; node: TreeNode; depth: number; active: string;
  onPick: (p: string) => void; exp: Record<string, boolean>;
  toggle: (k: string) => void; pfx: string;
  onDelete?: (path: string) => void;
}) {
  const path   = pfx ? `${pfx}/${name}` : name;
  const isFile = !!(node as Record<string, unknown>)._f;
  const isOpen = exp[path] !== false;
  const isA    = isFile && active === path;
  const [rowHover, setRowHover] = useState(false);

  if (isFile) {
    return (
      <div
        onClick={() => onPick(path)}
        onMouseEnter={() => setRowHover(true)}
        onMouseLeave={() => setRowHover(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: `3px 8px 3px ${10 + depth * 14}px`,
          cursor: 'pointer', fontSize: 12.5, userSelect: 'none',
          color: isA ? C.text : C.muted, fontFamily: UI,
          background: isA ? C.active : rowHover ? C.hover : 'transparent',
          borderLeft: isA ? `2px solid ${C.accent}` : '2px solid transparent',
          transition: 'background .07s',
        }}
      >
        <Ic d={ic.file} size={13} color={getCol(name)} />
        <span style={{ flex: 1 }}>{name}</span>
        {onDelete && (
          <span
            onClick={e => { e.stopPropagation(); onDelete(path); }}
            title="Delete file"
            style={{
              padding: '1px 3px', borderRadius: 2, display: 'flex',
              opacity: rowHover ? 0.6 : 0, transition: 'opacity .1s', cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; (e.currentTarget as HTMLElement).style.background = C.red + '22'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = rowHover ? '0.6' : '0'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <Ic d={ic.trash} size={11} color={C.red} />
          </span>
        )}
      </div>
    );
  }

  const children = Object.entries(node).filter(([k]) => k !== '_f');
  return (
    <>
      <div
        onClick={() => toggle(path)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: `3px 8px 3px ${6 + depth * 14}px`,
          cursor: 'pointer', fontSize: 12.5, color: C.text,
          fontFamily: UI, fontWeight: 500, userSelect: 'none',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <Ic d={isOpen ? ic.chevD : ic.chevR} size={11} color={C.dim} />
        <Ic d={isOpen ? ic.folderO : ic.folderC} size={13} color={C.orange} />
        <span>{name}</span>
      </div>
      {isOpen && children
        .sort(([, a], [, b]) =>
          ((a as TreeNode)._f === (b as TreeNode)._f ? 0 : (a as TreeNode)._f ? 1 : -1))
        .map(([k, v]) => (
          <TreeItem key={k} name={k} node={v as TreeNode} depth={depth + 1}
            active={active} onPick={onPick} exp={exp} toggle={toggle} pfx={path} onDelete={onDelete} />
        ))}
    </>
  );
}

// ─── search panel ─────────────────────────────────────────────────────────────
function SearchPanel({ files, onOpen }: { files: Record<string, string>; onOpen: (p: string) => void }) {
  const [q, setQ] = useState('');
  const hits: { path: string; line: number; text: string }[] = [];
  if (q.trim().length > 1) {
    Object.entries(files).forEach(([path, content]) => {
      content.split('\n').forEach((ln, i) => {
        if (ln.toLowerCase().includes(q.toLowerCase()))
          hits.push({ path, line: i + 1, text: ln.trim() });
      });
    });
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '8px 10px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: C.raised, border: `1px solid ${C.border}`,
          borderRadius: 4, padding: '5px 10px',
        }}>
          <Ic d={ic.search} size={13} color={C.dim} />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search files…" autoFocus
            style={{ flex: 1, background: 'transparent', border: 'none', color: C.text, fontSize: 12, fontFamily: UI, outline: 'none' }} />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px' }}>
        {hits.length === 0 && q.length > 1 && (
          <div style={{ padding: '20px 10px', fontSize: 12, color: C.dim, textAlign: 'center' }}>No results</div>
        )}
        {hits.slice(0, 60).map((r, i) => (
          <div key={i} onClick={() => onOpen(r.path)}
            style={{ padding: '5px 8px', cursor: 'pointer', borderRadius: 3 }}
            onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div style={{ color: C.muted, fontFamily: MONO, fontSize: 10.5 }}>{r.path}:{r.line}</div>
            <div style={{ color: C.text, fontFamily: MONO, fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── just-black theme ─────────────────────────────────────────────────────────
function defineJustBlack(monaco: Monaco) {
  monaco.editor.defineTheme('just-black', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '',                      foreground: '8f93a2' },
      { token: 'comment',               foreground: '666666' },
      { token: 'comment.doc',           foreground: '7F0000' },
      { token: 'string',                foreground: 'FF7EFF' },
      { token: 'string.escape',         foreground: 'FF44FF' },
      { token: 'string.template',       foreground: 'FF7EFF' },
      { token: 'number',                foreground: 'FFFF00' },
      { token: 'keyword',               foreground: 'FF3B3B' },
      { token: 'keyword.operator',      foreground: 'FFFF7E' },
      { token: 'identifier',            foreground: '7EFFFF' },
      { token: 'type',                  foreground: 'FF8800' },
      { token: 'type.identifier',       foreground: '00FFFF' },
      { token: 'operator',              foreground: 'FFFF7E' },
      { token: 'delimiter',             foreground: '89DDFF' },
      { token: 'delimiter.bracket',     foreground: '89DDFF' },
      { token: 'delimiter.curly',       foreground: '89DDFF' },
      { token: 'delimiter.square',      foreground: 'FFFFFF' },
      { token: 'delimiter.parenthesis', foreground: 'CCCCCC' },
      { token: 'regexp',                foreground: '89DDFF' },
      { token: 'tag',                   foreground: 'F07178' },
      { token: 'attribute.name',        foreground: 'BB77FF', fontStyle: 'italic' },
      { token: 'attribute.value',       foreground: 'FF7EFF' },
      { token: 'selector',              foreground: 'FF3B3B' },
      { token: 'property',              foreground: 'B2CCD6' },
      { token: 'property.css',          foreground: 'B2CCD6' },
      { token: 'key',                   foreground: 'BB77FF' },
      { token: 'key.json',              foreground: 'BB77FF' },
      { token: 'annotation',            foreground: '82AAFF', fontStyle: 'italic' },
      { token: 'heading.md',            foreground: 'C3E88D' },
      { token: 'link',                  foreground: '89DDFF', fontStyle: 'underline' },
      { token: 'invalid',               foreground: 'FF5370' },
    ],
    colors: {
      'editor.background':                   '#000000',
      'editor.foreground':                   '#8f93a2',
      'editorLineNumber.foreground':         '#3b3f51',
      'editorLineNumber.activeForeground':   '#525975',
      'editor.lineHighlightBackground':      '#00000050',
      'editor.selectionBackground':          '#717cb450',
      'editor.inactiveSelectionBackground':  '#717cb430',
      'editorCursor.foreground':             '#ffcc00',
      'editorBracketMatch.background':       '#0f111a',
      'editorBracketMatch.border':           '#ffcc0050',
      'editorWidget.background':             '#0f111a',
      'editorSuggestWidget.background':      '#000000',
      'editorSuggestWidget.border':          '#000000',
      'editorSuggestWidget.foreground':      '#8f93a2',
      'editorSuggestWidget.highlightForeground': '#80cbc4',
      'editorSuggestWidget.selectedBackground': '#ffffff15',
      'editorHoverWidget.background':        '#0f111a',
      'editorHoverWidget.border':            '#ffffff10',
      'editorGutter.background':             '#000000',
      'scrollbarSlider.background':          '#7e7e7e7e',
      'scrollbarSlider.hoverBackground':     '#ffffff46',
      'scrollbarSlider.activeBackground':    '#ffffff7e',
      'scrollbar.shadow':                    '#0f111a00',
    },
  });
}

// ─── resize handles ───────────────────────────────────────────────────────────
function HHandle() {
  return (
    <PanelResizeHandle style={{ width: 4, background: 'transparent', cursor: 'col-resize', position: 'relative', flexShrink: 0, outline: 'none' }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 1, width: 1, background: C.border }} />
    </PanelResizeHandle>
  );
}
function VHandle() {
  return (
    <PanelResizeHandle style={{ height: 4, background: 'transparent', cursor: 'row-resize', position: 'relative', flexShrink: 0, outline: 'none' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1, height: 1, background: C.border }} />
    </PanelResizeHandle>
  );
}

// ─── git panel ────────────────────────────────────────────────────────────────
const PROJECT = '/home/user';

function GitPanel({ onLog, onEnsureSandbox, files }: { onLog: (t: string, text: string) => void; onEnsureSandbox: () => Promise<void>; files: Record<string, string> }) {
  const [status,      setStatus]      = useState<GitFile[]>([]);
  const [commits,     setCommits]     = useState<GitCommit[]>([]);
  const [branch,      setBranch]      = useState('main');
  const [branches,    setBranches]    = useState<string[]>([]);
  const [msg,         setMsg]         = useState('');
  const [remote,      setRemote]      = useState('');
  const [section,     setSection]     = useState<'changes'|'commits'|'remote'>('changes');
  const [loading,     setLoading]     = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [gitName,     setGitName]     = useState(
    typeof window !== 'undefined' ? (localStorage.getItem('starIDE_git_name') ?? '') : ''
  );
  const [gitEmail,    setGitEmail]    = useState(
    typeof window !== 'undefined' ? (localStorage.getItem('starIDE_git_email') ?? '') : ''
  );
  const opRunning = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLInputElement) {
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const run = (action: GitAction, extras: Record<string, unknown> = {}) =>
    gitOp(action, { path: PROJECT, ...extras });

  // Wrapper that auto-recovers from sandbox timeouts
  const safeCmd = async (command: string): Promise<import('@/services/ideApi').ExecuteResult> => {
    try {
      return await runCommand(command);
    } catch (e) {
      const msg = String(e).toLowerCase();
      if (msg.includes('sandbox') && msg.includes('not found')) {
        onLog('sys', 'Sandbox timed out — restarting…');
        await onEnsureSandbox();
        return await runCommand(command);
      }
      throw e;
    }
  };

  const refresh = async () => {
    setLoading(true);
    try {
      // Use --porcelain for machine-readable file status
      const [porcelain, branchCmd, allBranches] = await Promise.all([
        safeCmd('git -C /home/user status --porcelain'),
        safeCmd('git -C /home/user rev-parse --abbrev-ref HEAD 2>/dev/null || echo main'),
        safeCmd('git -C /home/user branch 2>/dev/null || echo main'),
      ]);

      // porcelain lines: "XY path"
      const changed = (porcelain.stdout ?? '')
        .split('\n')
        .filter(l => l.length >= 3)
        .map(l => ({ status: l.slice(0, 2).trim(), path: l.slice(3).trim() }))
        .filter(f => f.path);

      setStatus(changed);

      const currentBranch = (branchCmd.stdout ?? '').trim();
      if (currentBranch && currentBranch !== 'HEAD') setBranch(currentBranch);

      const list = (allBranches.stdout ?? '')
        .split('\n').map(l => l.replace('*', '').trim()).filter(Boolean);
      if (list.length > 0) setBranches(list);

      // Mark initialized if git is present (even if working tree is clean)
      if (porcelain.exit_code === 0 || porcelain.exit_code === 1) {
        setInitialized(true);
      }

      // Fetch log separately so a failure (empty repo) doesn't block status
      try {
        const logResult = await gitOp('log', { limit: 20, path: PROJECT });

        const logOutput = logResult.stdout || '';

        if (logOutput.trim()) {
          const parsed: import('@/services/ideApi').GitCommit[] = logOutput
            .split(/\r?\n/)
            .filter((line: string) => line.includes('|||'))
            .map((line: string) => {
              const parts   = line.split('|||');
              const hash    = (parts[0] ?? '').trim();
              const message = (parts[1] ?? '').trim();
              const author  = (parts[2] ?? '').trim();
              const date    = (parts[3] ?? '').trim();
              return { hash: hash.slice(0, 7), message, author, date };
            })
            .filter((c: import('@/services/ideApi').GitCommit) => c.hash.length === 7);

          setCommits(parsed);
        }
      } catch { /* empty repo — no commits yet */ }
      // If no output, leave initialized state as-is
    } catch {
      // Don't change initialized state on error — just stop loading
    } finally {
      setLoading(false);
    }
  };

  const init = async () => {
    if (opRunning.current) return;
    opRunning.current = true;
    setLoading(true);
    try {
      await gitOp('init', { path: PROJECT });

      // Set user git identity
      await runCommand([
        `git -C /home/user config user.name "${gitName.trim()}"`,
        `git -C /home/user config user.email "${gitEmail.trim()}"`,
        'git -C /home/user config pull.rebase false',
        'git -C /home/user branch -M main 2>/dev/null || true',
      ].join(' && '));

      // Save identity to localStorage
      localStorage.setItem('starIDE_git_name',  gitName.trim());
      localStorage.setItem('starIDE_git_email', gitEmail.trim());

      // Write .gitignore
      await writeFile('/home/user/.gitignore', [
        '.bash_logout', '.bashrc', '.profile',
        '.bash_history', '.sudo_as_admin_successful',
        '.cache/', '.config/', '__pycache__/',
        '*.pyc', '*.log', '.env', 'node_modules/',
        'venv/', '.venv/', '*.egg-info/',
        'nohup.out', 'server.log', 'star_project/',
      ].join('\n'));

      await runCommand('git -C /home/user add .gitignore');
      onLog('ok', '\u2713 Git repository initialized');
      await refresh();
    } catch (e) { onLog('err', `Git init failed: ${e}`); }
    finally { opRunning.current = false; setLoading(false); }
  };

  const stageAndCommit = async () => {
    if (opRunning.current) return;
    opRunning.current = true;
    setLoading(true);
    try {
      // Sync all editor files to sandbox before staging
      onLog('sys', 'Syncing files…');
      await Promise.all(
        Object.entries(files).map(([path, content]) =>
          writeFile(`/home/user/${path}`, content).catch(() => {})
        )
      );

      // Stage
      const stageResult = await runCommand('git -C /home/user add .');
      if (stageResult.exit_code !== 0) {
        onLog('err', 'Stage failed: ' + stageResult.stderr);
        return;
      }
      onLog('ok', '\u2713 Staged all changes');

      // Verify something is staged via porcelain (index column ≠ space/untracked)
      const statusCheck = await runCommand('git -C /home/user status --porcelain');
      const staged = (statusCheck.stdout ?? '')
        .split('\n')
        .some(l => l.length >= 2 && l[0] !== ' ' && l[0] !== '?');
      if (!staged) {
        onLog('sys', 'Nothing to commit \u2014 no changes staged');
        return;
      }

      // Now commit
      const commitResult = await gitOp('commit', {
        message: msg.trim(),
        path: '/home/user',
      });
      console.log('commit result:', JSON.stringify(commitResult));

      if (commitResult.exit_code === 0 || commitResult.success) {
        onLog('ok', `\u2713 Committed: ${msg.trim()}`);
        setMsg('');
        await refresh();
      } else {
        onLog('err', commitResult.stderr || 'Commit failed');
      }
    } catch (e) {
      onLog('err', e instanceof Error ? e.message : 'Failed');
    } finally {
      opRunning.current = false;
      setLoading(false);
    }
  };

  const push = async () => {
    if (opRunning.current) return;
    opRunning.current = true;
    setLoading(true);
    try {
      const r = await runCommand(
        `git -C /home/user push origin ${branch} --force`
      );
      if (r.exit_code === 0) {
        onLog('ok', `\u2713 Pushed to origin/${branch}`);
      } else {
        onLog('err', r.stderr || r.stdout || 'Push failed');
      }
    } catch (e) { onLog('err', e instanceof Error ? e.message : 'Push failed'); }
    finally { opRunning.current = false; setLoading(false); }
  };

  const pull = async () => {
    if (opRunning.current) return;
    opRunning.current = true;
    setLoading(true);
    try {
      const r = await safeCmd(`cd ${PROJECT} && git pull origin ${branch}`);
      if (r.exit_code === 0) {
        onLog('ok', `\u2713 Pulled from origin/${branch}`);
        await refresh();
      } else {
        onLog('err', r.stderr || r.stdout || 'Pull failed');
      }
    } catch (e) { onLog('err', e instanceof Error ? e.message : 'Pull failed'); }
    finally { opRunning.current = false; setLoading(false); }
  };

  const addRemote = async () => {
    if (!remote.trim()) return;
    setLoading(true);
    try {
      // Remove existing origin first to avoid "already exists" error
      await safeCmd(`cd ${PROJECT} && git remote remove origin 2>/dev/null || true`);
      const r = await safeCmd(`cd ${PROJECT} && git remote add origin ${remote.trim()}`);
      if (r.exit_code === 0) {
        localStorage.setItem('starIDE_remote', remote.trim());
        onLog('ok', `\u2713 Remote saved`);
        setRemote('');
      } else {
        onLog('err', r.stderr || 'Failed to add remote');
      }
    } catch (e) { onLog('err', e instanceof Error ? e.message : 'Remote failed'); }
    finally { setLoading(false); }
  };

  const checkout = async (b: string) => {
    setLoading(true);
    try {
      await run('checkout', { branch: b });
      onLog('ok', `\u2713 Switched to ${b}`);
      setBranch(b);
      await refresh();
    } catch (e) { onLog('err', `Checkout failed: ${e}`); }
    finally { setLoading(false); }
  };

  const newBranch = async () => {
    const name = prompt('Branch name:');
    if (!name?.trim()) return;
    setLoading(true);
    try {
      await run('branch', { name: name.trim(), create: true });
      onLog('ok', `\u2713 Created branch: ${name}`);
      await refresh();
    } catch (e) { onLog('err', `Branch failed: ${e}`); }
    finally { setLoading(false); }
  };

  const statusColor = (s: string) =>
    ({ M: C.orange, A: C.green, D: C.red, '?': C.muted, R: C.accent }[s] ?? C.muted);
  const statusLabel = (s: string) =>
    ({ M: 'modified', A: 'added', D: 'deleted', '?': 'untracked', R: 'renamed' }[s] ?? s);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const checkRepo = async () => {
      setLoading(true);
      try {
        await onEnsureSandbox();

        const r = await runCommand(
          'git -C /home/user rev-parse --is-inside-work-tree 2>/dev/null || echo "false"'
        );

        if (r.stdout?.trim() === 'true') {
          await refresh();
        } else {
          // No repo — show init screen, don't call git ops
          setInitialized(false);
          setLoading(false);
        }
      } catch {
        setInitialized(false);
        setLoading(false);
      }
    };
    checkRepo();
  }, []);

  const btn = (label: string, onClick: () => void, color = C.accent) => (
    <button onClick={onClick} disabled={loading}
      style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, color: C.muted, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 11, padding: '3px 10px', fontFamily: MONO, display: 'flex', alignItems: 'center', gap: 4, opacity: loading ? 0.5 : 1, pointerEvents: loading ? 'none' : 'auto' }}
      onMouseEnter={e => { if (!loading) { e.currentTarget.style.color = color; e.currentTarget.style.borderColor = color + '55'; } }}
      onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border; }}
    >{label}</button>
  );

  if (!initialized) {
    const reconnect = async () => {
      setLoading(true);
      try {
        await onEnsureSandbox();
        await safeCmd(`mkdir -p ${PROJECT}`);
        const r = await safeCmd(
          `cd ${PROJECT} && git rev-parse --is-inside-work-tree 2>/dev/null`
        );
        if (r.stdout?.trim() === 'true' && r.exit_code === 0) {
          await refresh();
        }
      } catch { /* stay on init screen */ }
      finally { setLoading(false); }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, padding: 20 }}>
        <Ic d={ic.newProj} size={36} color={C.dim} />
        <span style={{ fontSize: 13, color: C.text }}>No git repository</span>
        <span style={{ fontSize: 11, color: C.dim, textAlign: 'center', lineHeight: 1.6 }}>Initialize a repository to start tracking changes</span>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input value={gitName} onChange={e => { setGitName(e.target.value); localStorage.setItem('starIDE_git_name', e.target.value); }}
            placeholder="Your name (e.g. John Doe)"
            style={{ background: C.raised, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontFamily: MONO, fontSize: 12, padding: '5px 10px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
            onFocus={e => e.currentTarget.style.borderColor = C.accent + '55'}
            onBlur={e => e.currentTarget.style.borderColor = C.border} />
          <input value={gitEmail} onChange={e => { setGitEmail(e.target.value); localStorage.setItem('starIDE_git_email', e.target.value); }}
            placeholder="Your email (e.g. john@example.com)"
            style={{ background: C.raised, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontFamily: MONO, fontSize: 12, padding: '5px 10px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
            onFocus={e => e.currentTarget.style.borderColor = C.accent + '55'}
            onBlur={e => e.currentTarget.style.borderColor = C.border} />
        </div>
        <button onClick={init} disabled={loading || !gitName.trim() || !gitEmail.trim()}
          style={{ background: gitName.trim() && gitEmail.trim() ? C.accentBg : 'transparent', border: `1px solid ${gitName.trim() && gitEmail.trim() ? C.accent + '55' : C.border}`, borderRadius: 4, color: gitName.trim() && gitEmail.trim() ? C.accent : C.dim, cursor: gitName.trim() && gitEmail.trim() ? 'pointer' : 'not-allowed', fontSize: 12, padding: '6px 20px', fontFamily: UI, fontWeight: 600, width: '100%' }}>
          {loading ? 'Initializing\u2026' : 'Initialize Repository'}
        </button>
        <button onClick={reconnect} disabled={loading}
          style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, color: C.muted, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 11, padding: '4px 16px', fontFamily: MONO, opacity: loading ? 0.5 : 1 }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.color = C.accent; e.currentTarget.style.borderColor = C.accent + '55'; } }}
          onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border; }}>
          {loading ? 'Reconnecting\u2026' : 'Reconnect sandbox'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Branch bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderBottom: `1px solid ${C.border}`, flexShrink: 0, flexWrap: 'wrap' }}>
        <Ic d={ic.chevR} size={11} color={C.dim} />
        <select value={branch} onChange={e => checkout(e.target.value)}
          style={{ background: C.raised, border: `1px solid ${C.border}`, borderRadius: 4, color: C.accent, fontFamily: MONO, fontSize: 11, padding: '2px 6px', outline: 'none', cursor: 'pointer' }}>
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        {btn('+ branch', newBranch, C.green)}
        <div style={{ flex: 1 }} />
        {btn('\u2191 push', push, C.green)}
        {btn('\u2193 pull', pull, C.accent)}
        <button onClick={refresh} disabled={loading}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', opacity: loading ? 0.5 : 1 }}>
          <Ic d={ic.refresh} size={12} color={C.dim} />
        </button>
      </div>

      {/* Identity bar */}
      <div style={{ padding: '4px 10px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <Ic d={ic.file} size={11} color={C.dim} />
        <span style={{ fontSize: 10.5, color: C.dim, fontFamily: MONO, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {localStorage.getItem('starIDE_git_name') ?? 'Unknown'}{' \u00b7 '}{localStorage.getItem('starIDE_git_email') ?? 'no email'}
        </span>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        {(['changes', 'commits', 'remote'] as const).map(s => (
          <button key={s} onClick={() => {
            console.log('Tab clicked:', s);
            if (s === 'commits') {
              console.log('Current commits state:', commits);
              refresh();
            }
            setSection(s);
          }}
            style={{ flex: 1, padding: '5px 0', fontSize: 10.5, fontFamily: UI, fontWeight: 600, cursor: 'pointer', border: 'none', background: section === s ? C.bg : 'transparent', color: section === s ? C.text : C.dim, borderTop: section === s ? `2px solid ${C.accent}` : '2px solid transparent', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {s}
            {s === 'changes' && status.length > 0 && (
              <span style={{ marginLeft: 5, fontSize: 9, background: C.accent, color: '#000', borderRadius: 8, padding: '0 5px', fontWeight: 700 }}>{status.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Changes */}
      {section === 'changes' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 10px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <textarea value={msg} onChange={e => setMsg(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) e.stopPropagation();
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) stageAndCommit();
              }}
              onClick={e => e.stopPropagation()}
              onFocus={e => { const len = e.target.value.length; e.target.setSelectionRange(len, len); }}
              placeholder="Commit message (Ctrl+Enter to commit)" rows={2}
              style={{ width: '100%', background: C.raised, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontFamily: MONO, fontSize: 11.5, padding: '6px 8px', outline: 'none', resize: 'none', marginBottom: 6, boxSizing: 'border-box', pointerEvents: 'auto', position: 'relative', zIndex: 10 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={stageAndCommit} disabled={loading || !msg.trim()}
                style={{ flex: 1, background: msg.trim() ? C.green + '18' : 'transparent', border: `1px solid ${msg.trim() ? C.green + '40' : C.border}`, borderRadius: 4, color: msg.trim() ? C.green : C.dim, cursor: msg.trim() ? 'pointer' : 'not-allowed', fontSize: 11, fontFamily: UI, fontWeight: 600, padding: '4px 0' }}>
                {loading ? 'Committing\u2026' : '\u2713 Stage & Commit'}
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {status.length === 0
              ? <div style={{ padding: '20px 10px', fontSize: 12, color: C.dim, textAlign: 'center' }}>No changes</div>
              : status.map((f, i) => (
                <div key={i}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', borderBottom: `1px solid ${C.border}22` }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: statusColor(f.status), fontFamily: MONO, minWidth: 14, textTransform: 'uppercase' }}>{f.status}</span>
                  <span style={{ fontSize: 12, color: C.text, fontFamily: MONO, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.path}</span>
                  <span style={{ fontSize: 10, color: C.dim }}>{statusLabel(f.status)}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Commits */}
      {section === 'commits' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {commits.length === 0
            ? <div style={{ padding: '20px 10px', fontSize: 12, color: C.dim, textAlign: 'center' }}>No commits yet</div>
            : commits.map((c, i) => (
              <div key={i}
                style={{ padding: '8px 10px', borderBottom: `1px solid ${C.border}22` }}
                onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontSize: 10, fontFamily: MONO, color: C.accent, background: C.accentBg, padding: '1px 6px', borderRadius: 3 }}>{c.hash}</span>
                  <span style={{ fontSize: 11, color: C.dim, fontFamily: MONO }}>{c.date}</span>
                </div>
                <div style={{ fontSize: 12, color: C.text, fontFamily: UI, marginBottom: 2 }}>{c.message}</div>
                <div style={{ fontSize: 10, color: C.dim, fontFamily: MONO }}>{c.author}</div>
              </div>
            ))}
        </div>
      )}

      {/* Remote */}
      {section === 'remote' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.7 }}>
            Add a GitHub remote to push and pull your code. Use an HTTPS URL with a personal access token for auth.
          </div>
          <div style={{ fontSize: 10.5, color: C.dim, fontFamily: MONO, background: C.raised, padding: '6px 10px', borderRadius: 4, border: `1px solid ${C.border}`, lineHeight: 1.8 }}>
            Format:<br />https://TOKEN@github.com/user/repo.git
          </div>
          <input value={remote} onChange={e => setRemote(e.target.value)}
            placeholder="https://github.com/user/repo.git"
            style={{ background: C.raised, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontFamily: MONO, fontSize: 11, padding: '6px 10px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
            onFocus={e => (e.currentTarget.style.borderColor = C.accent + '55')}
            onBlur={e => (e.currentTarget.style.borderColor = C.border)} />
          <button onClick={addRemote} disabled={loading || !remote.trim()}
            style={{ background: remote.trim() ? C.accentBg : 'transparent', border: `1px solid ${remote.trim() ? C.accent + '55' : C.border}`, borderRadius: 4, color: remote.trim() ? C.accent : C.dim, cursor: remote.trim() ? 'pointer' : 'not-allowed', fontSize: 12, fontFamily: UI, fontWeight: 600, padding: '6px 0' }}>
            {loading ? 'Adding\u2026' : 'Add Remote'}
          </button>
          <div style={{ fontSize: 11, color: C.dim, borderTop: `1px solid ${C.border}`, paddingTop: 10, lineHeight: 1.7 }}>
            After adding remote:<br />
            <span style={{ color: C.accent, fontFamily: MONO }}>\u2191 push</span> to send your commits to GitHub
          </div>
        </div>
      )}
    </div>
  );
}

// ─── public handle ──────────────────────────────────────────────────────────
export interface StarIDEHandle {
  loadCode: (code: string, lang: string) => void;
}

// ─── help panel ───────────────────────────────────────────────────────────────
function HelpPanel() {
  const [section, setSection] = useState<'start' | 'editor' | 'git' | 'viewport' | 'shortcuts'>('start');
  const [storageUsed, setStorageUsed] = useState('0 KB');
  const [storagePercent, setStoragePercent] = useState(0);

  useEffect(() => {
    try {
      const files  = localStorage.getItem('starIDE_files')  ?? '';
      const tabs   = localStorage.getItem('starIDE_tabs')   ?? '';
      const remote = localStorage.getItem('starIDE_remote') ?? '';
      const total  = files.length + tabs.length + remote.length;
      const kb     = (total / 1024).toFixed(1);
      setStorageUsed(`${kb} KB / 5,120 KB`);
      setStoragePercent(Math.min((total / 1024 / 5120) * 100, 100));
    } catch { /* ignore */ }
  }, []);

  const sections = [
    { id: 'start',     label: 'Getting Started' },
    { id: 'editor',    label: 'Editor'          },
    { id: 'git',       label: 'Git & GitHub'    },
    { id: 'viewport',  label: 'Viewport'        },
    { id: 'shortcuts', label: 'Shortcuts'       },
  ] as const;

  const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, fontFamily: UI }}>{title}</div>
      {children}
    </div>
  );

  const Item = ({ label, desc }: { label: string; desc: string }) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, color: C.text, fontFamily: MONO, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11, color: C.dim, fontFamily: UI, lineHeight: 1.6 }}>{desc}</div>
    </div>
  );

  const Code = ({ children }: { children: string }) => (
    <div style={{ background: C.raised, border: `1px solid ${C.border}`, borderRadius: 4, padding: '6px 10px', fontFamily: MONO, fontSize: 11, color: C.accent, marginBottom: 8, lineHeight: 1.7 }}>
      {children}
    </div>
  );

  const Key = ({ k }: { k: string }) => (
    <span style={{ background: C.raised, border: `1px solid ${C.border}`, borderRadius: 3, padding: '1px 6px', fontFamily: MONO, fontSize: 10, color: C.text, whiteSpace: 'nowrap' as const }}>
      {k}
    </span>
  );

  const ShortcutRow = ({ keys, desc }: { keys: string[]; desc: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${C.border}22` }}>
      <div style={{ fontSize: 11, color: C.dim, fontFamily: UI }}>{desc}</div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {keys.map((k, i) => (
          <React.Fragment key={i}>
            <Key k={k} />
            {i < keys.length - 1 && <span style={{ color: C.dim, fontSize: 10 }}>+</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Section tabs */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${C.border}`, overflowX: 'auto' as const }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            padding: '6px 10px', fontSize: 10.5, fontFamily: UI, fontWeight: 600,
            cursor: 'pointer', border: 'none',
            background: section === s.id ? C.bg : 'transparent',
            color: section === s.id ? C.text : C.dim,
            borderTop: section === s.id ? `2px solid ${C.accent}` : '2px solid transparent',
            textTransform: 'uppercase' as const, letterSpacing: '0.05em', whiteSpace: 'nowrap' as const,
          }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' as const, padding: '14px 12px' }}>

        {section === 'start' && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4, fontFamily: UI }}>Welcome to StarIDE</div>
            <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.7, marginBottom: 16, fontFamily: UI }}>
              A cloud IDE powered by E2B sandboxes. Write, run, and deploy code directly in your browser.
            </div>
            <Block title="Quick Start">
              <Item label="1. Create a file" desc="Click the + icon in the Explorer panel or right-click the file tree." />
              <Item label="2. Write your code" desc="The editor supports Python, JavaScript, TypeScript, and more with syntax highlighting." />
              <Item label="3. Run it" desc="Click the green Run button or press Ctrl+Enter. Output appears in the terminal below." />
              <Item label="4. Save your work" desc="Use Ctrl+S to save. Files sync to the E2B sandbox automatically on run." />
            </Block>
            <Block title="Runtimes">
              <Item label="E2B Sandbox" desc="Python and Node.js run in a secure cloud sandbox. Full filesystem access, package install, terminal commands." />
              <Item label="Pyodide (Browser)" desc="Matplotlib, NumPy, and SciPy run directly in your browser via WebAssembly. No server needed." />
              <Item label="Viewport" desc="Flask, FastAPI, and Streamlit apps get a live preview panel automatically when a server is detected." />
            </Block>
            <Block title="Need Help?">
              <Item label="Use the tabs above" desc="Each tab covers a specific feature — Editor, Git, Viewport, and Shortcuts." />
            </Block>
            <Block title="Storage">
              <Item label="Browser storage" desc="Your files are saved in your browser automatically. They survive page refreshes but not clearing browser data." />
              <div style={{ background: C.raised, border: `1px solid ${C.border}`, borderRadius: 4, padding: '8px 10px', marginTop: 6 }}>
                <div style={{ fontSize: 10, color: C.dim, textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Storage used</div>
                <div style={{ fontSize: 12, color: C.accent, fontFamily: MONO }}>{storageUsed}</div>
                <div style={{ height: 3, background: C.border, borderRadius: 2, marginTop: 6 }}>
                  <div style={{ height: '100%', width: `${storagePercent}%`, background: C.accent, borderRadius: 2, transition: 'width 0.3s' }} />
                </div>
              </div>
              <Item label="Push to GitHub" desc="For permanent storage use the Git panel to push to GitHub. Browser storage is limited to 5MB." />
            </Block>
          </div>
        )}

        {section === 'editor' && (
          <div>
            <Block title="Writing Code">
              <Item label="Supported languages" desc="Python, JavaScript, TypeScript, HTML, CSS, JSON, Markdown, Rust, Go, C++, Java, SQL, Shell, YAML." />
              <Item label="Syntax highlighting" desc="Automatic based on file extension. Create files with the correct extension (.py, .ts, .js, etc.)" />
              <Item label="IntelliSense" desc="Monaco editor provides autocomplete, hover docs, and error detection for supported languages." />
            </Block>
            <Block title="Files">
              <Item label="New file" desc="Click the document+ icon in the Explorer header. Type a name and press Enter." />
              <Item label="New folder" desc="Click the folder+ icon. Use / in filenames to create nested paths e.g. src/components/Button.py" />
              <Item label="Delete file" desc="Hover over a file in the Explorer and click the trash icon that appears." />
              <Item label="Search files" desc="Click the search icon in the activity bar to search across all open files." />
            </Block>
            <Block title="Running Code">
              <Item label="Run button" desc="Runs the currently active file. Python files run with python, JS files run with node." />
              <Item label="Terminal" desc="Type any shell command in the terminal input at the bottom. Full bash access to the sandbox." />
              <Item label="Package install" desc="Packages are installed automatically when detected in imports. Or run pip install in the terminal." />
            </Block>
          </div>
        )}

        {section === 'git' && (
          <div>
            <Block title="Setting Up Git">
              <Item label="Initialize a repository" desc="Open the Git panel from the activity bar. Click Initialize Repository. A .gitignore is created automatically." />
              <Item label="Connect to GitHub" desc="Go to the Remote tab in the Git panel. Add your GitHub URL with a personal access token." />
            </Block>
            <Block title="GitHub Token">
              <Item label="Create a token" desc="GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic) → Generate new token. Select the repo scope." />
              <Item label="Remote URL format" desc="Use your token directly in the URL:" />
              <Code>{'https://TOKEN@github.com/USERNAME/REPO.git'}</Code>
              <div style={{ fontSize: 10.5, color: C.red, fontFamily: UI, lineHeight: 1.6, marginBottom: 8 }}>
                ⚠ Never share your token publicly. It gives full access to your GitHub repos.
              </div>
            </Block>
            <Block title="Daily Workflow">
              <Item label="1. Stage changes" desc="Click Stage all in the Changes tab to stage all modified files." />
              <Item label="2. Commit" desc="Type a commit message and click Commit or press Ctrl+Enter." />
              <Item label="3. Push" desc="Click ↑ push in the Git panel header to push to GitHub." />
              <Item label="4. Pull" desc="Click ↓ pull to fetch the latest changes from GitHub." />
            </Block>
            <Block title="Important Notes">
              <Item label="Sandbox resets" desc="The E2B sandbox resets after 1 hour of inactivity. Always push your work to GitHub before closing the IDE." />
              <Item label="After a reset" desc="Re-initialize git and add your remote again. Your files on GitHub are always safe." />
            </Block>
          </div>
        )}

        {section === 'viewport' && (
          <div>
            <Block title="What is the Viewport?">
              <Item label="Live preview" desc="When your code starts a web server, StarIDE automatically detects it and shows a live preview in the Viewport tab." />
              <Item label="Supported frameworks" desc="Flask, FastAPI, Streamlit, Dash, Tornado, Bottle, aiohttp, and any other Python HTTP server." />
            </Block>
            <Block title="How it works">
              <Item label="Automatic detection" desc="StarIDE scans your imports for server libraries. If detected, it runs your file as a background process." />
              <Item label="Port detection" desc="The default port is 8080. Specify a different port with port=XXXX in your code." />
              <Item label="Viewport tab" desc="A green dot appears on the Viewport tab when your server is live. Click it to see the preview." />
            </Block>
            <Block title="Example — Flask server">
              <Code>{'from flask import Flask\napp = Flask(__name__)\n\n@app.route("/")\ndef index():\n    return "<h1>Hello</h1>"\n\napp.run(host="0.0.0.0", port=8080)'}</Code>
            </Block>
            <Block title="3D and WebGL">
              <Item label="Three.js" desc="Serve a Three.js page from Flask for full 3D rendering in the viewport. Your browser GPU handles the rendering — no server GPU needed." />
              <Item label="Matplotlib" desc="Static plots render automatically via Pyodide. No server needed for charts and graphs." />
            </Block>
            <Block title="Tips">
              <Item label="Refresh button" desc="Use the refresh icon in the Viewport tab header to reload the preview after changes." />
              <Item label="Open in new tab" desc="Click the open icon next to the URL to open your app in a full browser tab." />
              <Item label="Stop server" desc="Type stop in the terminal to kill the running server." />
            </Block>
          </div>
        )}

        {section === 'shortcuts' && (
          <div>
            <Block title="Editor">
              <ShortcutRow keys={['Ctrl', 'S']}          desc="Save file" />
              <ShortcutRow keys={['Ctrl', 'Z']}          desc="Undo" />
              <ShortcutRow keys={['Ctrl', 'Shift', 'Z']} desc="Redo" />
              <ShortcutRow keys={['Ctrl', '/']}          desc="Toggle comment" />
              <ShortcutRow keys={['Ctrl', 'D']}          desc="Select next occurrence" />
              <ShortcutRow keys={['Alt', '↑']}           desc="Move line up" />
              <ShortcutRow keys={['Alt', '↓']}           desc="Move line down" />
              <ShortcutRow keys={['Ctrl', 'F']}          desc="Find in file" />
              <ShortcutRow keys={['Ctrl', 'H']}          desc="Find and replace" />
              <ShortcutRow keys={['Ctrl', 'G']}          desc="Go to line" />
              <ShortcutRow keys={['Tab']}                desc="Indent / accept suggestion" />
              <ShortcutRow keys={['Shift', 'Tab']}       desc="Outdent" />
            </Block>
            <Block title="IDE">
              <ShortcutRow keys={['Ctrl', 'S']}          desc="Save current file" />
              <ShortcutRow keys={['Ctrl', 'Enter']}      desc="Commit (in git message box)" />
            </Block>
            <Block title="Terminal">
              <ShortcutRow keys={['Enter']}              desc="Run command" />
              <ShortcutRow keys={['↑']}                  desc="Previous command (type logs)" />
            </Block>
            <Block title="Git Panel">
              <ShortcutRow keys={['Ctrl', 'Enter']}      desc="Commit with current message" />
            </Block>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
const StarIDE = forwardRef<StarIDEHandle>(function StarIDE(_, ref) {
  const [files,    setFiles]    = useState<Record<string, string>>({});
  const [active,   setActive]   = useState('');
  const [tabs,     setTabs]     = useState<string[]>([]);
  const [mod,      setMod]      = useState(new Set<string>());
  const [exp,      setExp]      = useState<Record<string, boolean>>({});
  const [sideView, setSideView] = useState('files');   // '' = collapsed
  const [termOpen, setTermOpen] = useState(true);
  const [tLines,   setTLines]   = useState<{ t: string; text: string }[]>([
    { t: 'sys', text: 'E2B Sandbox ready — Python 3.12 · Node 20' },
    { t: 'sys', text: 'Pre-loading Python/Wasm runtime in background\u2026' },
  ]);
  const [running, setRunning] = useState(false);
  const [termInput, setTermInput] = useState('');
  const [newItemState, setNewItemState] = useState<{ type: 'file' | 'folder'; parent: string } | null>(null);
  const [newItemName,  setNewItemName]  = useState('');
  const [bottomTab,     setBottomTab]     = useState<'terminal' | 'output'>('terminal');
  const [pyodideCode,   setPyodideCode]   = useState('');
  const [pyodideRunKey, setPyodideRunKey] = useState(0);
  const [viewportUrl,   setViewportUrl]   = useState<string>('');
  const [viewportReady, setViewportReady] = useState(false);
  const [viewportTab,   setViewportTab]   = useState<'terminal' | 'viewport' | 'python'>('terminal');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const termRef   = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;   // always points to latest active path
  const tree      = buildTree(files);

  useEffect(() => {
    termRef.current?.scrollTo(0, termRef.current.scrollHeight);
  }, [tLines]);

  // Ctrl+S / Cmd+S save (works when editor is not focused)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveFile(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mobile layout: collapse sidebar and terminal on small screens on first mount
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    if (mq.matches) { setSideView(''); setTermOpen(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Imperative handle: let parent load code from Star agent ──────────────
  useImperativeHandle(ref, () => ({
    loadCode: (code: string, lang: string) => {
      const ext = Object.entries(EXT_LANG).find(([, v]) => v === lang)?.[0] ?? 'py';
      const filename = `star_output.${ext}`;
      setFiles(prev => ({ ...prev, [filename]: code }));
      setActive(filename);
      setTabs(prev => prev.includes(filename) ? prev : [...prev, filename]);
      setTermOpen(true);
      setTLines(prev => [...prev, { t: 'sys', text: `\u2190 Star loaded ${filename}` }]);
    },
  }));

  const openFile = (p: string) => {
    setActive(p);
    if (!tabs.includes(p)) setTabs(t => [...t, p]);
  };

  const closeTab = (p: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = tabs.filter(t => t !== p);
    setTabs(next);
    if (active === p) setActive(next[next.length - 1] ?? '');
  };

  const saveFile = async () => {
    const content = editorRef.current?.getValue() ?? '';
    const path = activeRef.current;
    if (!path) return;
    setFiles(p => ({ ...p, [path]: content }));
    setMod(p => { const n = new Set(p); n.delete(path); return n; });
    try { await writeFile(`${PROJECT}/${path}`, content); } catch { /* ignore */ }
  };

  const deleteFile = (path: string) => {
    if (!window.confirm(`Delete "${path}"?`)) return;
    setFiles(p => { const n = { ...p }; delete n[path]; return n; });
    setTabs(prev => {
      const next = prev.filter(t => t !== path);
      if (activeRef.current === path) setActive(next[next.length - 1] ?? '');
      return next;
    });
    setMod(p => { const n = new Set(p); n.delete(path); return n; });
  };

  const createNewItem = (name: string) => {
    if (!newItemState || !name.trim()) { setNewItemState(null); setNewItemName(''); return; }
    const raw    = name.trim().replace(/^\/+/, '');
    const prefix = newItemState.parent ? `${newItemState.parent}/` : '';
    if (newItemState.type === 'file') {
      const path = `${prefix}${raw}`;
      setFiles(p => ({ ...p, [path]: '' }));
      openFile(path);
    } else {
      const path = `${prefix}${raw}/.gitkeep`;
      setFiles(p => ({ ...p, [path]: '' }));
      setExp(p => ({ ...p, [`${prefix}${raw}`]: true }));
    }
    setNewItemState(null);
    setNewItemName('');
  };

  const newProject = () => {
    if (Object.keys(files).length > 0 && !window.confirm('Start a new project? Unsaved changes will be lost.')) return;
    setFiles({});
    setTabs([]);
    setActive('');
    setMod(new Set());
    setExp({});
    setTLines([{ t: 'sys', text: 'New project — E2B Sandbox ready.' }]);
    setViewportUrl('');
    setViewportReady(false);
    setViewportTab('terminal');
    localStorage.removeItem('starIDE_files');
    localStorage.removeItem('starIDE_tabs');
    localStorage.removeItem('starIDE_active');
    localStorage.removeItem('starIDE_remote');
  };

  const isSandboxTimeout = (e: unknown) =>
    String(e).toLowerCase().includes('sandbox') && String(e).toLowerCase().includes('not found');

  const ensureSandbox = async (): Promise<void> => {
    try {
      const status = await getSandboxStatus();
      if (status.active) return;
    } catch { /* not alive */ }

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        setTLines(p => [...p, {
          t: 'sys',
          text: attempt === 1 ? 'Sandbox reconnecting\u2026' : `Sandbox reconnecting (attempt ${attempt}/3)\u2026`,
        }]);
        await createSandbox();
        await new Promise(r => setTimeout(r, 5000));

        try {
          const gitIdentName  = localStorage.getItem('starIDE_git_name')  ?? 'StarIDE User';
          const gitIdentEmail = localStorage.getItem('starIDE_git_email') ?? 'user@staride.dev';
          await runCommand([
            'git -C /home/user init 2>/dev/null || true',
            `git -C /home/user config user.name "${gitIdentName}"`,
            `git -C /home/user config user.email "${gitIdentEmail}"`,
            'git -C /home/user config pull.rebase false',
            'git -C /home/user branch -M main 2>/dev/null || true',
          ].join(' && '));
          await runCommand(
            `printf '.bash_logout\\n.bashrc\\n.profile\\n.bash_history\\n.sudo_as_admin_successful\\n.cache/\\n__pycache__/\\n*.pyc\\n*.log\\n.env\\nnohup.out\\n' > /home/user/.gitignore`
          );
        } catch { /* non-fatal */ }

        try {
          const savedRemote = localStorage.getItem('starIDE_remote');
          if (savedRemote) {
            await runCommand(
              `git -C /home/user remote set-url origin ${savedRemote} 2>/dev/null || git -C /home/user remote add origin ${savedRemote}`
            );
          }
        } catch { /* non-fatal */ }

        try {
          const savedFiles = localStorage.getItem('starIDE_files');
          if (savedFiles) {
            const parsed = JSON.parse(savedFiles) as Record<string, string>;
            await Promise.all(
              Object.entries(parsed).map(([path, content]) =>
                writeFile(`/home/user/${path}`, content).catch(() => {})
              )
            );
            setTLines(p => [...p, { t: 'ok', text: `\u2713 Sandbox ready \u2014 ${Object.keys(parsed).length} file(s) restored` }]);
          } else {
            setTLines(p => [...p, { t: 'ok', text: '\u2713 Sandbox ready' }]);
          }
        } catch {
          setTLines(p => [...p, { t: 'ok', text: '\u2713 Sandbox ready' }]);
        }

        return;
      } catch (e) {
        if (attempt === 3) {
          setTLines(p => [...p, { t: 'err', text: 'Could not reconnect sandbox. Please refresh the page.' }]);
          throw e;
        }
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  };

  // Save files/tabs/active to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(files).length === 0) return;
    try {
      localStorage.setItem('starIDE_files',  JSON.stringify(files));
      localStorage.setItem('starIDE_tabs',   JSON.stringify(tabs));
      localStorage.setItem('starIDE_active', active);
    } catch (e) {
      console.warn('localStorage full:', e);
    }
  }, [files, tabs, active]);

  // Restore files/tabs/active from localStorage on first load
  useEffect(() => {
    try {
      const savedFiles  = localStorage.getItem('starIDE_files');
      const savedTabs   = localStorage.getItem('starIDE_tabs');
      const savedActive = localStorage.getItem('starIDE_active');
      if (savedFiles) {
        const parsed = JSON.parse(savedFiles) as Record<string, string>;
        if (Object.keys(parsed).length > 0) {
          setFiles(parsed);
          setTLines(p => [...p, { t: 'sys', text: `Restored ${Object.keys(parsed).length} file(s) from last session` }]);
        }
      }
      if (savedTabs)   setTabs(JSON.parse(savedTabs) as string[]);
      if (savedActive) setActive(savedActive);
    } catch (e) {
      console.warn('Failed to restore session:', e);
    }
  }, []);

  // Ping every 4 minutes to keep the E2B sandbox alive
  useEffect(() => {
    let keepAliveInterval: ReturnType<typeof setInterval>;
    const startKeepAlive = () => {
      keepAliveInterval = setInterval(async () => {
        try {
          await runCommand('echo alive');
        } catch {
          try {
            await ensureSandbox();
          } catch { /* will retry next interval */ }
        }
      }, 4 * 60 * 1000);
    };
    startKeepAlive();
    return () => clearInterval(keepAliveInterval);
  }, []);

  const SERVER_LIBS = [
    'flask', 'fastapi', 'uvicorn', 'streamlit', 'dash',
    'tornado', 'aiohttp', 'http.server', 'socketio', 'bottle',
  ];

  const isServerCode = (src: string): boolean => {
    const stripped = src.split('\n').filter(l => !l.trimStart().startsWith('#')).join('\n');
    return SERVER_LIBS.some(lib =>
      stripped.includes(`import ${lib}`) ||
      stripped.includes(`from ${lib}`)   ||
      stripped.includes('app.run')       ||
      stripped.includes('uvicorn.run')
    );
  };

  const detectPort = (src: string): number => {
    const match = src.match(/port\s*=\s*(\d{4,5})/);
    return match ? parseInt(match[1]) : 8080;
  };

  const getRequiredPackages = (code: string): string[] => {
    const packageMap: Record<string, string> = {
      'flask':      'flask',
      'fastapi':    'fastapi uvicorn',
      'streamlit':  'streamlit',
      'dash':       'dash',
      'numpy':      'numpy',
      'pandas':     'pandas',
      'matplotlib': 'matplotlib',
      'scipy':      'scipy',
      'plotly':     'plotly',
      'PIL':        'pillow',
      'cv2':        'opencv-python',
      'sklearn':    'scikit-learn',
      'torch':      'torch',
      'requests':   'requests',
      'aiohttp':    'aiohttp',
      'tornado':    'tornado',
      'bottle':     'bottle',
    };
    const stripped = code.split('\n').filter(l => !l.trimStart().startsWith('#')).join('\n');
    const needed: string[] = [];
    for (const [importName, packageName] of Object.entries(packageMap)) {
      if (stripped.includes(`import ${importName}`) || stripped.includes(`from ${importName}`)) {
        needed.push(packageName);
      }
    }
    return needed;
  };

  const BROWSER_LIBS = ['matplotlib', 'seaborn', 'plotly', 'bokeh', 'numpy', 'scipy'];
  const requiresBrowserRuntime = (src: string) => {
    const stripped = src.split('\n').filter(l => !l.trimStart().startsWith('#')).join('\n');
    return BROWSER_LIBS.some(lib =>
      stripped.includes(`import ${lib}`) || stripped.includes(`from ${lib}`));
  };

  const runFile = async () => {
    if (running) return;

    setViewportUrl('');
    setViewportReady(false);
    setViewportTab('terminal');

    const currentCode = editorRef.current?.getValue() ?? files[active] ?? '';

    // Kill any running server immediately when user hits Run
    if (isServerCode(currentCode)) {
      try { await runCommand(`lsof -ti:8080 | xargs kill -9 2>/dev/null || true`); } catch { /* ignore */ }
    }

    /* ── Route visual/scientific code to the in-browser Wasm runtime ── */
    if (requiresBrowserRuntime(currentCode)) {
      setRunning(true);
      setTermOpen(true);
      setBottomTab('output');
      setViewportTab('python');
      setPyodideCode(currentCode);
      setPyodideRunKey(k => k + 1);
      setTLines(p => [...p, { t: 'sys', text: 'Routing to Python/Wasm runtime\u2026' }]);
      return;
    }

    setRunning(true);
    setTermOpen(true);
    const currentFiles = { ...files };
    if (editorRef.current) currentFiles[active] = editorRef.current.getValue();
    const ext  = active.split('.').pop() ?? '';
    const lang = ext === 'js' || ext === 'ts' ? 'javascript' : 'python';
    const isServer = isServerCode(currentCode);
    const display = isServer
      ? `python ${active}  (background)`
      : `${lang === 'javascript' ? 'node' : 'python'} ${active}`;
    setTLines(p => [...p, { t: 'cmd', text: `$ ${display}` }]);

    const writeFileWithRetry = async (
      path: string,
      content: string,
      retries = 3
    ): Promise<void> => {
      for (let i = 0; i < retries; i++) {
        try {
          await writeFile(path, content);
          return;
        } catch (e) {
          if (i === retries - 1) throw e;
          await new Promise(r => setTimeout(r, 2000));
          setTLines(p => [...p, { t: 'sys', text: `File sync retry ${i + 1}/${retries}…` }]);
        }
      }
    };

    const execute = async () => {
      // Kill any existing server before installing or syncing
      if (isServer) {
        await runCommand(`lsof -ti:8080 | xargs kill -9 2>/dev/null || true`);
        await new Promise(r => setTimeout(r, 500));
      }
      const packages = getRequiredPackages(currentCode);
      if (packages.length > 0) {
        setTLines(p => [...p, { t: 'sys', text: `Installing ${packages.join(', ')}…` }]);
        await runCommand(`pip install ${packages.join(' ')} -q`);
        setTLines(p => [...p, { t: 'ok', text: '✓ Packages ready' }]);
      }
      setTLines(p => [...p, { t: 'sys', text: `Syncing ${Object.keys(currentFiles).length} file(s)…` }]);
      for (const [path, content] of Object.entries(currentFiles)) {
        await writeFileWithRetry(`${PROJECT}/${path}`, content);
      }
      if (isServer) {
        // Run in background (port already cleared at top of execute)
        return runCommand(
          `cd ${PROJECT} && nohup python ${active} > /tmp/server.log 2>&1 & echo "PID:$!"`
        );
      }
      return lang === 'javascript'
        ? runCommand(`cd ${PROJECT} && node ${active}`)
        : runCommand(`cd ${PROJECT} && python ${active}`);
    };

    try {
      await ensureSandbox();
      let result: Awaited<ReturnType<typeof runCode>>;
      try {
        result = await execute();
      } catch (e) {
        if (isSandboxTimeout(e)) {
          setTLines(p => [...p, { t: 'sys', text: 'Sandbox timed out — restarting…' }]);
          await ensureSandbox();
          result = await execute();
        } else throw e;
      }
      if (result.stdout) result.stdout.split('\n').forEach(text => setTLines(p => [...p, { t: 'out', text }]));
      if (result.stderr) result.stderr.split('\n').forEach(text => setTLines(p => [...p, { t: 'err', text }]));
      if (result.error) setTLines(p => [...p, { t: 'err', text: result.error! }]);
      const ms = result.duration_ms ?? result.execution_time_ms ?? 0;
      if (!isServer) {
        setTLines(p => [...p, { t: result.exit_code === 0 ? 'ok' : 'err', text: `${result.exit_code === 0 ? '✓' : '✗'}  exit ${result.exit_code}  (${ms}ms)` }]);
      }

      if (isServer) {
        const port = detectPort(currentCode);
        setTLines(p => [...p, { t: 'sys', text: `Server starting on port ${port}…` }]);
        await new Promise(r => setTimeout(r, 2000));
        try { await exposePort(port); } catch { /* ignore */ }
        // Show initial server log
        try {
          const log = await runCommand('cat /tmp/server.log');
          if (log.stdout) log.stdout.split('\n').filter(l => l.trim()).forEach(text => setTLines(p => [...p, { t: 'out', text }]));
        } catch { /* ignore */ }
        // Poll for viewport ready
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          try {
            const info = await getViewportUrl(port);
            if (info.ready) {
              clearInterval(poll);
              setViewportUrl(info.url);
              setViewportReady(true);
              setViewportTab('viewport');
              setTLines(p => [...p, { t: 'ok', text: `✓ Viewport ready → ${info.url}` }]);
            }
          } catch { /* not up yet */ }
          if (attempts >= 15) {
            clearInterval(poll);
            try {
              const log = await runCommand('cat /tmp/server.log');
              if (log.stdout) log.stdout.split('\n').filter(l => l.trim()).forEach(text => setTLines(p => [...p, { t: 'err', text }]));
            } catch { /* ignore */ }
            setTLines(p => [...p, { t: 'err', text: 'Viewport timed out — check terminal for server errors' }]);
          }
        }, 1000);
      } else if (result.exit_code !== 0) {
        setViewportTab('terminal');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setTLines(p => [...p, { t: 'err', text: `Error: ${msg}` }]);
    } finally {
      setRunning(false);
    }
  };

  const handleTermCommand = async (cmd: string) => {
    if (!cmd.trim()) return;
    setTermInput('');
    setTLines(p => [...p, { t: 'cmd', text: `$ ${cmd}` }]);

    if (cmd.trim() === 'logs') {
      try {
        await ensureSandbox();
        const result = await runCommand('tail -50 /tmp/server.log');
        if (result.stdout) result.stdout.split('\n').filter(l => l.trim()).forEach(text => setTLines(p => [...p, { t: 'out', text }]));
        else setTLines(p => [...p, { t: 'sys', text: '(no server log yet)' }]);
      } catch (e: unknown) {
        setTLines(p => [...p, { t: 'err', text: e instanceof Error ? e.message : String(e) }]);
      }
      return;
    }

    if (cmd.trim() === 'stop') {
      try {
        await ensureSandbox();
        await runCommand('lsof -ti:8080 | xargs kill -9 2>/dev/null || true');
        setViewportReady(false);
        setViewportUrl('');
        setViewportTab('terminal');
        setTLines(p => [...p, { t: 'sys', text: 'Server stopped.' }]);
      } catch (e: unknown) {
        setTLines(p => [...p, { t: 'err', text: e instanceof Error ? e.message : String(e) }]);
      }
      return;
    }

    const doRun = () => runCommand(cmd);
    try {
      await ensureSandbox();
      let result: Awaited<ReturnType<typeof runCommand>>;
      try {
        result = await doRun();
      } catch (e) {
        if (isSandboxTimeout(e)) {
          setTLines(p => [...p, { t: 'sys', text: 'Sandbox timed out — restarting…' }]);
          await ensureSandbox();
          result = await doRun();
        } else throw e;
      }
      if (result.stdout) result.stdout.split('\n').forEach(text => setTLines(p => [...p, { t: 'out', text }]));
      if (result.stderr) result.stderr.split('\n').forEach(text => setTLines(p => [...p, { t: 'err', text }]));
      if (!result.stdout && !result.stderr) setTLines(p => [...p, { t: 'ok', text: `✓  exit ${result.exit_code}` }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setTLines(p => [...p, { t: 'err', text: `Error: ${msg}` }]);
    }
  };

  const handleTermCommandRef = useRef(handleTermCommand);
  useEffect(() => { handleTermCommandRef.current = handleTermCommand; }, [handleTermCommand]);

  const handleCopy = () => {
    const v = editorRef.current?.getValue() ?? files[active] ?? '';
    navigator.clipboard.writeText(v).catch(() => {});
  };

  const tCol = (t: string) =>
    ({ cmd: C.accent, ok: C.green, err: C.red, sys: C.dim, out: C.muted }[t] ?? C.muted);

  return (
    <div className="ws-ide-root" style={{
      display: 'flex', flexDirection: 'column',
      width: '100%', height: '100%',
      background: C.bg, color: C.text,
      fontFamily: UI, overflow: 'hidden',
    }}>

      {/* ══ Tab bar + actions ═══════════════════════════════════════════════ */}
      <div className="ws-ide-tabbar" style={{
        display: 'flex', alignItems: 'center', height: 36,
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        {/* Tabs */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', overflowX: 'auto', height: '100%' }}>
          {tabs.map(tab => {
            const nm  = tab.split('/').pop()!;
            const isA = tab === active;
            const isM = mod.has(tab);
            return (
              <div
                key={tab}
                onClick={() => setActive(tab)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '0 12px', fontSize: 12.5, cursor: 'pointer',
                  flexShrink: 0, userSelect: 'none', fontFamily: UI,
                  color: isA ? C.text : C.muted,
                  background: isA ? C.bg : 'transparent',
                  borderRight: `1px solid ${C.border}`,
                  borderTop: isA ? `2px solid ${C.accent}` : '2px solid transparent',
                  transition: 'background .07s',
                }}
                onMouseEnter={e => { if (!isA) e.currentTarget.style.background = C.hover; }}
                onMouseLeave={e => { e.currentTarget.style.background = isA ? C.bg : 'transparent'; }}
              >
                <Ic d={ic.file} size={12} color={getCol(nm)} />
                <span>{nm}</span>
                {isM && <div style={{ width: 6, height: 6, borderRadius: 3, background: C.accent, marginLeft: 1 }} />}
                <span
                  onClick={e => closeTab(tab, e)}
                  style={{ marginLeft: 3, padding: '1px 2px', borderRadius: 2, display: 'flex', opacity: isA ? 0.5 : 0, cursor: 'pointer', transition: 'opacity .1s' }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = C.active; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = isA ? '0.5' : '0'; e.currentTarget.style.background = 'transparent'; }}
                >
                  <Ic d={ic.x} size={10} color={C.muted} />
                </span>
              </div>
            );
          })}
        </div>

          {/* Action buttons */}
          <div className="ws-ide-actions" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px', flexShrink: 0 }}>
            {mod.has(active) && (
              <button
                onClick={saveFile}
                title="Save (Ctrl+S)"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: 'transparent', border: `1px solid ${C.border}`,
                  borderRadius: 4, color: C.muted, cursor: 'pointer',
                  fontSize: 11, padding: '2px 9px', fontFamily: MONO,
                }}
                onMouseEnter={e => { e.currentTarget.style.color = C.accent; e.currentTarget.style.borderColor = C.accent + '55'; }}
                onMouseLeave={e => { e.currentTarget.style.color = C.muted;  e.currentTarget.style.borderColor = C.border; }}
              >
                <Ic d={ic.save} size={11} color={C.muted} />
                <span className="ws-ide-lbl">save</span>
              </button>
            )}
            <button
              onClick={handleCopy}
              title="Copy file"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'transparent', border: `1px solid ${C.border}`,
                borderRadius: 4, color: C.muted, cursor: 'pointer',
                fontSize: 11, padding: '2px 9px', fontFamily: MONO,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = C.accent; e.currentTarget.style.borderColor = C.accent + '55'; }}
              onMouseLeave={e => { e.currentTarget.style.color = C.muted;  e.currentTarget.style.borderColor = C.border; }}
            >
              <Ic d={ic.copy} size={11} color={C.muted} />
              <span className="ws-ide-lbl">copy</span>
            </button>
            <button
              onClick={newProject}
              title="New Project"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'transparent', border: `1px solid ${C.border}`,
                borderRadius: 4, color: C.muted, cursor: 'pointer',
                fontSize: 11, padding: '2px 9px', fontFamily: MONO,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = C.orange; e.currentTarget.style.borderColor = C.orange + '55'; }}
              onMouseLeave={e => { e.currentTarget.style.color = C.muted;  e.currentTarget.style.borderColor = C.border; }}
            >
              <Ic d={ic.newDir} size={11} color={C.muted} />
              <span className="ws-ide-lbl">new project</span>
            </button>
            <button
              onClick={runFile}
              title="Run file"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: running ? C.red + '20' : C.green + '18',
                border: `1px solid ${running ? C.red + '40' : C.green + '35'}`,
                color: running ? C.red : C.green,
                padding: '2px 10px', borderRadius: 4, cursor: 'pointer',
                fontSize: 11, fontFamily: UI, fontWeight: 600,
              }}
            >
              <Ic d={running ? ic.stop : ic.play} size={10} color={running ? C.red : C.green} />
              {running ? 'Stop' : 'Run'}
            </button>
          </div>
      </div>

      {/* ══ Body ════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0, minWidth: 0 }}>

        {/* Activity bar — fixed 44px */}
        <div className="ws-ide-actbar" style={{
          width: 44, background: C.surface, borderRight: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '6px 0', gap: 2, flexShrink: 0,
        }}>
          {(['files', 'search', 'git', 'help'] as const).map(id => (
            <button
              key={id}
              onClick={() => setSideView(v => v === id ? '' : id)}
              title={id === 'files' ? 'Explorer' : id === 'search' ? 'Search' : id === 'git' ? 'Git' : 'Help'}
              style={{
                width: 32, height: 32, display: 'flex', alignItems: 'center',
                justifyContent: 'center', border: 'none', borderRadius: 4,
                cursor: 'pointer', transition: 'background .1s',
                background: sideView === id ? C.active : 'transparent',
                borderLeft: sideView === id ? `2px solid ${C.accent}` : '2px solid transparent',
              }}
            >
              <Ic d={id === 'files' ? ic.file : id === 'search' ? ic.search : id === 'git' ? ic.newProj : ic.help} size={17}
                color={sideView === id ? C.text : C.dim} />
            </button>
          ))}

          <div style={{ flex: 1 }} />

          <button
            onClick={() => setTermOpen(v => !v)}
            title="Toggle terminal"
            style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center',
              justifyContent: 'center', border: 'none', borderRadius: 4,
              cursor: 'pointer', transition: 'background .1s',
              background: termOpen ? C.accentBg : 'transparent',
            }}
          >
            <Ic d={ic.term} size={17} color={termOpen ? C.accent : C.dim} />
          </button>

          <button
            title="Settings"
            style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center',
              justifyContent: 'center', background: 'transparent', border: 'none',
              borderRadius: 4, cursor: 'pointer', marginTop: 2,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Ic d={ic.settings} size={17} color={C.dim} />
          </button>
        </div>

        {/* ── Resizable panel layout ── */}
        <PanelGroup orientation="horizontal" style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>

          {sideView !== '' && (
            <>
              <Panel
                id="side"
                defaultSize="22%"
                minSize="15%"
                maxSize="45%"
                style={{ background: C.surface, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 6px 4px 12px', flexShrink: 0,
                }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: C.dim, letterSpacing: 1.3, textTransform: 'uppercase' }}>
                    {sideView === 'files' ? 'Explorer' : sideView === 'search' ? 'Search' : sideView === 'git' ? 'Git' : 'Help'}
                  </span>
                  {sideView === 'files' && (
                    <div style={{ display: 'flex', gap: 1 }}>
                      <button
                        onClick={() => { setNewItemState({ type: 'file', parent: '' }); setNewItemName(''); }}
                        title="New File"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 3 }}
                        onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Ic d={ic.newFile} size={14} color={C.dim} />
                      </button>
                      <button
                        onClick={() => { setNewItemState({ type: 'folder', parent: '' }); setNewItemName(''); }}
                        title="New Folder"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 3 }}
                        onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Ic d={ic.newDir} size={14} color={C.dim} />
                      </button>
                    </div>
                  )}
                </div>

                {sideView === 'files' && (
                  <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
                    {newItemState && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px' }}>
                        <Ic d={newItemState.type === 'file' ? ic.newFile : ic.newDir} size={12}
                          color={newItemState.type === 'file' ? C.accent : C.orange} />
                        <input
                          autoFocus
                          value={newItemName}
                          onChange={e => setNewItemName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter')  createNewItem(newItemName);
                            if (e.key === 'Escape') { setNewItemState(null); setNewItemName(''); }
                          }}
                          onBlur={() => { setNewItemState(null); setNewItemName(''); }}
                          placeholder={newItemState.type === 'file' ? 'filename.py' : 'folder-name'}
                          style={{
                            flex: 1, background: C.raised, border: `1px solid ${C.accent}55`,
                            color: C.text, fontFamily: MONO, fontSize: 12, borderRadius: 3,
                            padding: '2px 6px', outline: 'none',
                          }}
                        />
                      </div>
                    )}
                    {Object.entries(tree)
                      .sort(([, a], [, b]) =>
                        ((a as TreeNode)._f === (b as TreeNode)._f ? 0 : (a as TreeNode)._f ? 1 : -1))
                      .map(([k, v]) => (
                        <TreeItem
                          key={k} name={k} node={v as TreeNode}
                          depth={0} active={active} onPick={openFile}
                          exp={exp}
                          toggle={k => setExp(p => ({ ...p, [k]: p[k] !== false ? false : true }))}
                          pfx=""
                          onDelete={deleteFile}
                        />
                      ))}
                  </div>
                )}

                {sideView === 'search' && (
                  <SearchPanel files={files} onOpen={openFile} />
                )}

                {sideView === 'git' && (
                  <GitPanel
                    onLog={(t, text) => setTLines(p => [...p, { t, text }])}
                    onEnsureSandbox={ensureSandbox}
                    files={files}
                  />
                )}

                {sideView === 'help' && (
                  <HelpPanel />
                )}
              </Panel>
              <HHandle />
            </>
          )}

          <Panel id="main" style={{ display: 'flex', overflow: 'hidden', minWidth: 0 }}>
            <PanelGroup orientation="vertical" style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>

              {/* Monaco editor */}
              <Panel id="editor" style={{ overflow: 'hidden', position: 'relative', minWidth: 0 }}>
                {!active ? (
                  <div style={{
                    height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: 12, color: C.dim, fontFamily: UI, userSelect: 'none',
                  }}>
                    <Ic d={ic.file} size={40} color={C.dim} />
                    <span style={{ fontSize: 13 }}>Open a file from the explorer</span>
                    <span style={{ fontSize: 11 }}>or create a new file to start editing</span>
                  </div>
                ) : (
                <MonacoEditor
                  height="100%"
                  language={getLang(active.split('/').pop() ?? '')}
                  value={files[active] ?? ''}
                  theme="just-black"
                  beforeMount={defineJustBlack}
                  loading={<div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.accent, fontFamily: UI, fontSize: 13 }}>Loading editor…</div>}
                  onMount={(editor, monaco) => {
                    editorRef.current = editor;
                    defineJustBlack(monaco);
                    monaco.editor.setTheme('just-black');
                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => { saveFile(); });
                  }}
                  onChange={v => {
                    setFiles(p => ({ ...p, [active]: v ?? '' }));
                    setMod(p => new Set(Array.from(p).concat(active)));
                  }}
                  options={{
                    fontSize: 13.5,
                    fontFamily: MONO,
                    fontLigatures: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    padding: { top: 10 },
                    tabSize: 4,
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    renderLineHighlight: 'gutter',
                    automaticLayout: true,
                  }}
                />
                )}
              </Panel>

              {/* Terminal + Viewport + Python Output */}
              {termOpen && (
                <>
                  <VHandle />
                  <Panel
                    id="terminal"
                    defaultSize="35%"
                    minSize="10%"
                    style={{ background: C.surface, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                  >
                    {/* ── Tab bar ── */}
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      borderBottom: `1px solid ${C.border}`, flexShrink: 0,
                    }}>
                      {(['terminal', 'viewport', 'output'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => { if (tab === 'terminal') setViewportTab('terminal'); else if (tab === 'viewport') setViewportTab('viewport'); else setViewportTab('python'); }}
                          style={{
                            padding: '5px 14px', fontSize: 10.5, fontFamily: MONO,
                            fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase',
                            cursor: 'pointer', border: 'none',
                            background: 'transparent',
                            color: tab === viewportTab ? C.text : C.dim,
                            borderBottom: tab === viewportTab ? `2px solid ${C.accent}` : '2px solid transparent',
                          }}
                        >
                          {tab === 'viewport' && viewportReady && (
                            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 3, background: C.green, marginRight: 5, verticalAlign: 'middle' }} />
                          )}
                          {tab === 'terminal' ? 'Terminal' : tab === 'viewport' ? 'Viewport' : 'Python Output'}
                        </button>
                      ))}

                      <div style={{ flex: 1 }} />

                      {/* Viewport URL + controls */}
                      {viewportTab === 'viewport' && viewportReady && (
                        <div style={{ display: 'flex', gap: 4, padding: '0 8px', alignItems: 'center' }}>
                          <span style={{
                            fontSize: 10, fontFamily: MONO, color: C.dim,
                            background: C.hover, padding: '2px 8px', borderRadius: 3,
                            maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{viewportUrl}</span>
                          <button
                            onClick={() => window.open(viewportUrl, '_blank')}
                            title="Open in new tab"
                            style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: C.muted, fontFamily: MONO }}
                            onMouseEnter={e => { e.currentTarget.style.color = C.accent; e.currentTarget.style.borderColor = C.accent + '55'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = C.muted;  e.currentTarget.style.borderColor = C.border; }}
                          >
                            <Ic d={ic.chevR} size={10} color={C.muted} /> open
                          </button>
                          <button
                            onClick={() => { const f = document.querySelector<HTMLIFrameElement>('#viewport-frame'); if (f) f.src = f.src; }}
                            title="Refresh viewport"
                            style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer', padding: '2px 6px', display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = C.accent + '55')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
                          >
                            <Ic d={ic.refresh} size={11} color={C.dim} />
                          </button>
                        </div>
                      )}

                      {/* Terminal controls */}
                      {viewportTab === 'terminal' && (
                        <div style={{ display: 'flex', gap: 2, padding: '0 4px' }}>
                          <button
                            onClick={() => setTLines([{ t: 'sys', text: 'Cleared.' }])}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 3 }}
                            onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <Ic d={ic.refresh} size={12} color={C.dim} />
                          </button>
                          <button
                            onClick={() => setTermOpen(false)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 3 }}
                            onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <Ic d={ic.x} size={12} color={C.dim} />
                          </button>
                        </div>
                      )}

                      {/* Close button for other tabs */}
                      {viewportTab !== 'terminal' && (
                        <button
                          onClick={() => setTermOpen(false)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 3, marginRight: 4 }}
                          onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <Ic d={ic.x} size={12} color={C.dim} />
                        </button>
                      )}
                    </div>

                    {/* ── Content area: all panes sit here, absolutely positioned ── */}
                    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>

                      {/* Terminal pane */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: viewportTab === 'terminal' ? 'flex' : 'none',
                        flexDirection: 'column', overflow: 'hidden',
                      }}>
                        <div
                          ref={termRef}
                          style={{ flex: 1, overflowY: 'auto', padding: '6px 12px', fontFamily: MONO, fontSize: 12, lineHeight: '18px', minHeight: 0 }}
                        >
                          {tLines.map((l, i) => (
                            <div key={i} style={{ color: tCol(l.t), fontWeight: l.t === 'cmd' ? 600 : 400 }}>{l.text}</div>
                          ))}
                        </div>
                      </div>

                      {/* Viewport pane */}
                      <div style={{ position: 'absolute', inset: 0, display: viewportTab === 'viewport' ? 'block' : 'none', overflow: 'hidden' }}>
                        {!viewportReady ? (
                          <div style={{
                            height: '100%', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: 12, color: C.dim, fontFamily: UI,
                          }}>
                            <Ic d={ic.term} size={32} color={C.dim} />
                            <span style={{ fontSize: 13 }}>No viewport running</span>
                            <span style={{ fontSize: 11, textAlign: 'center', maxWidth: 280, lineHeight: '1.6' }}>
                              Run a Python server (Flask, FastAPI, Streamlit, Dash) and the viewport will appear here automatically.
                            </span>
                          </div>
                        ) : (
                          <iframe
                            id="viewport-frame"
                            src={viewportUrl}
                            style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
                            allow="accelerometer; camera; fullscreen; gyroscope; microphone; webgl; xr-spatial-tracking"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                            title="Viewport"
                          />
                        )}
                      </div>

                      {/* Python Output pane */}
                      <div style={{ position: 'absolute', inset: 0, display: viewportTab === 'python' ? 'flex' : 'none', overflow: 'hidden' }}>
                        <PyodideRunner
                          code={pyodideCode}
                          runKey={pyodideRunKey}
                          onDone={exit => {
                            setTLines(p => [...p, {
                              t: exit === 0 ? 'ok' : 'err',
                              text: `${exit === 0 ? '✓' : '✗'}  Python  exit ${exit}`,
                            }]);
                            setRunning(false);
                          }}
                          onReady={() => setTLines(p => [...p, { t: 'sys', text: '✓ Python runtime ready (Wasm)' }])}
                          onStatus={msg => setTLines(p => [...p, { t: 'sys', text: `  ${msg}` }])}
                          onStderr={line => setTLines(p => [...p, { t: 'err', text: line }])}
                        />
                      </div>

                    </div>

                    {/* ── Terminal input — always anchored to bottom of panel ── */}
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      borderTop: `1px solid ${C.border}`,
                      background: C.surface,
                      padding: '4px 10px', gap: 6, flexShrink: 0,
                    }}>
                      <span style={{ color: C.accent, fontFamily: MONO, fontSize: 12, userSelect: 'none' }}>$</span>
                      <input
                        value={termInput}
                        onChange={e => setTermInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            const cmd = termInput.trim();
                            if (cmd) handleTermCommandRef.current(cmd);
                          }
                        }}
                        placeholder="run a command…"
                        className="ws-ide-terminput"
                        style={{
                          flex: 1, background: 'transparent', border: 'none',
                          color: C.text, fontFamily: MONO, fontSize: 12,
                          outline: 'none', caretColor: C.accent,
                          pointerEvents: 'auto',
                          zIndex: 10,
                          position: 'relative',
                        }}
                        spellCheck={false}
                      />
                    </div>
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>

      {/* ══ Status bar ══════════════════════════════════════════════════════ */}
      <div className="ws-ide-status" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 22, padding: '0 12px',
        background: C.surface, borderTop: `1px solid ${C.border}`,
        flexShrink: 0, fontSize: 11, color: C.dim, userSelect: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: C.green, animation: 'pulse 4s infinite' }} />
            E2B
          </span>
          <span>main</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>{getLang(active.split('/').pop() ?? '')}</span>
          <span>UTF-8</span>
        </div>
      </div>

      <style>{`
        *::-webkit-scrollbar { display: none; }
        * { scrollbar-width: none; -ms-overflow-style: none; }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }

        /* ── Mobile layout: 320px and up ────────────────────── */
        @media (max-width: 639px) {
          /* Hard-clamp the IDE to the viewport */
          .ws-ide-root {
            max-width: 100vw !important;
            overflow: hidden !important;
          }

          /* Every flex child must be allowed to shrink to 0 */
          .ws-ide-root > *,
          .ws-ide-root [data-panel-group],
          .ws-ide-root [data-panel],
          .ws-ide-root [data-panel-group] > * {
            min-width: 0 !important;
            max-width: 100% !important;
            overflow: hidden !important;
          }

          /* Monaco editor internal elements */
          .ws-ide-root .monaco-editor,
          .ws-ide-root .monaco-editor-background,
          .ws-ide-root .overflow-guard {
            min-width: 0 !important;
            width: 100% !important;
          }

          /* Prevent iOS auto-zoom on focused inputs */
          .ws-ide-root input { font-size: 16px !important; }

          /* Buttons become icon-only — hide text labels */
          .ws-ide-lbl { display: none !important; }

          /* Tighter padding on icon-only action buttons */
          .ws-ide-actions button { padding: 4px 7px !important; }

          /* Larger touch targets in activity bar */
          .ws-ide-actbar button {
            width: 36px !important;
            height: 36px !important;
          }

          /* Reclaim vertical space — status bar hidden on mobile */
          .ws-ide-status { display: none !important; }

          /* Let tab bar grow to fit buttons — no hard 36px clip */
          .ws-ide-tabbar {
            height: auto !important;
            min-height: 40px !important;
            padding-top: 2px !important;
            padding-bottom: 2px !important;
          }
        }
      `}</style>
    </div>
  );
});

export default StarIDE;
