'use client';

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import dynamic from 'next/dynamic';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import type { Monaco } from '@monaco-editor/react';
import { loader } from '@monaco-editor/react';
import { createSandbox, runCode, runCommand, writeFile } from '@/services/ideApi';

// Pin Monaco to the exact installed version to avoid CDN version mismatches
loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs' } });

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

// ─── public handle ──────────────────────────────────────────────────────────
export interface StarIDEHandle {
  loadCode: (code: string, lang: string) => void;
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
  ]);
  const [running, setRunning] = useState(false);
  const [termInput, setTermInput] = useState('');
  const [newItemState, setNewItemState] = useState<{ type: 'file' | 'folder'; parent: string } | null>(null);
  const [newItemName,  setNewItemName]  = useState('');

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
    try { await writeFile(`/home/user/${path}`, content); } catch { /* ignore */ }
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
  };

  const isSandboxTimeout = (e: unknown) =>
    String(e).toLowerCase().includes('sandbox') && String(e).toLowerCase().includes('not found');

  const ensureSandbox = async () => {
    await createSandbox();
  };

  const runFile = async () => {
    if (running) return;
    setRunning(true);
    setTermOpen(true);
    const currentFiles = { ...files };
    if (editorRef.current) currentFiles[active] = editorRef.current.getValue();
    const ext     = active.split('.').pop() ?? '';
    const lang    = ext === 'js' || ext === 'ts' ? 'javascript' : 'python';
    const display = active.includes('test') ? `pytest ${active} -v` : `${lang === 'javascript' ? 'node' : 'python'} ${active}`;
    setTLines(p => [...p, { t: 'cmd', text: `$ ${display}` }]);

    const execute = async () => {
      setTLines(p => [...p, { t: 'sys', text: `Syncing ${Object.keys(currentFiles).length} file(s)…` }]);
      await Promise.all(
        Object.entries(currentFiles).map(([path, content]) =>
          writeFile(`/home/user/${path}`, content).catch(() => {})
        )
      );
      return lang === 'javascript'
        ? runCommand(`cd /home/user && node ${active}`)
        : runCommand(`cd /home/user && python ${active}`);
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
      setTLines(p => [...p, { t: result.exit_code === 0 ? 'ok' : 'err', text: `${result.exit_code === 0 ? '✓' : '✗'}  exit ${result.exit_code}  (${ms}ms)` }]);
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

  const handleCopy = () => {
    const v = editorRef.current?.getValue() ?? files[active] ?? '';
    navigator.clipboard.writeText(v).catch(() => {});
  };

  const tCol = (t: string) =>
    ({ cmd: C.accent, ok: C.green, err: C.red, sys: C.dim, out: C.muted }[t] ?? C.muted);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: '100%', height: '100%',
      background: C.bg, color: C.text,
      fontFamily: UI, overflow: 'hidden',
    }}>

      {/* ══ Tab bar + actions ═══════════════════════════════════════════════ */}
      <div style={{
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px', flexShrink: 0 }}>
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
                save
              </button>
            )}
            <button
              onClick={handleCopy}
              title="Copy file"
              style={{
                background: 'transparent', border: `1px solid ${C.border}`,
                borderRadius: 4, color: C.muted, cursor: 'pointer',
                fontSize: 11, padding: '2px 9px', fontFamily: MONO,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = C.accent; e.currentTarget.style.borderColor = C.accent + '55'; }}
              onMouseLeave={e => { e.currentTarget.style.color = C.muted;  e.currentTarget.style.borderColor = C.border; }}
            >
              copy
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
              new project
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
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Activity bar — fixed 44px */}
        <div style={{
          width: 44, background: C.surface, borderRight: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '6px 0', gap: 2, flexShrink: 0,
        }}>
          {(['files', 'search'] as const).map(id => (
            <button
              key={id}
              onClick={() => setSideView(v => v === id ? '' : id)}
              title={id === 'files' ? 'Explorer' : 'Search'}
              style={{
                width: 32, height: 32, display: 'flex', alignItems: 'center',
                justifyContent: 'center', border: 'none', borderRadius: 4,
                cursor: 'pointer', transition: 'background .1s',
                background: sideView === id ? C.active : 'transparent',
                borderLeft: sideView === id ? `2px solid ${C.accent}` : '2px solid transparent',
              }}
            >
              <Ic d={id === 'files' ? ic.file : ic.search} size={17}
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
        <PanelGroup orientation="horizontal" style={{ flex: 1, overflow: 'hidden' }}>

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
                    {sideView === 'files' ? 'Explorer' : 'Search'}
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
              </Panel>
              <HHandle />
            </>
          )}

          <Panel id="main" style={{ display: 'flex', overflow: 'hidden' }}>
            <PanelGroup orientation="vertical" style={{ flex: 1, overflow: 'hidden' }}>

              {/* Monaco editor */}
              <Panel id="editor" style={{ overflow: 'hidden', position: 'relative' }}>
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

              {/* Terminal */}
              {termOpen && (
                <>
                  <VHandle />
                  <Panel
                    id="terminal"
                    defaultSize="28%"
                    minSize="10%"
                    style={{ background: C.surface, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                  >
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '4px 10px', borderBottom: `1px solid ${C.border}`, flexShrink: 0,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: C.dim, letterSpacing: 0.6, textTransform: 'uppercase' }}>Terminal</span>
                        <span style={{ fontSize: 10, color: C.dim, background: C.hover, padding: '1px 6px', borderRadius: 3, fontFamily: MONO }}>zsh</span>
                      </div>
                      <div style={{ display: 'flex', gap: 2 }}>
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
                    </div>

                    <div
                      ref={termRef}
                      style={{ flex: 1, overflowY: 'auto', padding: '6px 12px', fontFamily: MONO, fontSize: 12, lineHeight: '18px' }}
                    >
                      {tLines.map((l, i) => (
                        <div key={i} style={{ color: tCol(l.t), fontWeight: l.t === 'cmd' ? 600 : 400 }}>{l.text}</div>
                      ))}
                    </div>

                    {/* Terminal input */}
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      borderTop: `1px solid ${C.border}`,
                      padding: '4px 10px', gap: 6, flexShrink: 0,
                    }}>
                      <span style={{ color: C.accent, fontFamily: MONO, fontSize: 12, userSelect: 'none' }}>$</span>
                      <input
                        value={termInput}
                        onChange={e => setTermInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleTermCommand(termInput); }}
                        placeholder="run a command…"
                        style={{
                          flex: 1, background: 'transparent', border: 'none',
                          color: C.text, fontFamily: MONO, fontSize: 12,
                          outline: 'none', caretColor: C.accent,
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
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 22, padding: '0 12px',
        background: C.surface, borderTop: `1px solid ${C.border}`,
        flexShrink: 0, fontSize: 11, color: C.dim, userSelect: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: C.green }} />
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
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
        *::-webkit-scrollbar { display: none; }
        * { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>
    </div>
  );
});

export default StarIDE;
