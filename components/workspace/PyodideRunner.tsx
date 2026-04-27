'use client';

import React, { useEffect, useRef, useCallback } from 'react';

/* ─────────────────────────────────────────────────────────────────────────────
   Build the iframe HTML as a joined string array — no template literals —
   so Turbopack has nothing unusual to parse, and </script> can never be
   misinterpreted as closing the wrong script block.
   ───────────────────────────────────────────────────────────────────────── */
function buildFrameHtml(): string {
  /* JavaScript lines for the sandboxed iframe.
     Double-quoted strings: \\n → \n (backslash+n), \\b → \b (word-boundary),
     \" → " (literal double-quote).                                           */
  const scriptLines: string[] = [
    "const statusEl  = document.getElementById('status');",
    "const outputEl  = document.getElementById('output');",
    "const htmlOutEl = document.getElementById('html-output');",
    "const errorEl   = document.getElementById('error');",
    "",
    "let pyodide = null;",
    "let isReady = false;",
    "",
    /* ── Timer tracking so stale intervals/timeouts from one run are cancelled */
    "var _iids = [];",
    "var _tids = [];",
    "var _origSI = window.setInterval;",
    "var _origST = window.setTimeout;",
    "var _origCI = window.clearInterval;",
    "var _origCT = window.clearTimeout;",
    "function _wrapCb(fn) {",
    "  return function() {",
    "    try { fn(); }",
    "    catch(e) {",
    "      var msg = String(e);",
    "      if (errorEl) errorEl.textContent += msg + '\\n';",
    "      parent.postMessage({ type: 'pyodide-stderr', line: msg }, '*');",
    "    }",
    "  };",
    "}",
    "window.setInterval = function(fn, ms) { var id = _origSI(_wrapCb(fn), ms); _iids.push(id); return id; };",
    "window.setTimeout  = function(fn, ms) { var id = _origST(_wrapCb(fn), ms); _tids.push(id); return id; };",
    "window.clearInterval = function(id) { _iids = _iids.filter(function(x){return x!==id;}); _origCI(id); };",
    "window.clearTimeout  = function(id) { _tids = _tids.filter(function(x){return x!==id;}); _origCT(id); };",
    "function _cancelTimers() {",
    "  _iids.forEach(function(id){ _origCI(id); }); _iids = [];",
    "  _tids.forEach(function(id){ _origCT(id); }); _tids = [];",
    "}",
    "",
    "function appendOut(text) { outputEl.textContent += text + '\\n'; }",
    "function appendErr(text) { errorEl.textContent  += text + '\\n'; }",
    "",
    "function notify(msg) { parent.postMessage({ type: 'pyodide-status', msg }, '*'); }",
    "",
    "function showHtml(html) {",
    "  htmlOutEl.innerHTML = '';",
    "  var inner = document.createElement('iframe');",
    "  inner.setAttribute('sandbox', 'allow-scripts');",
    "  inner.srcdoc = html;",
    "  htmlOutEl.appendChild(inner);",
    "}",
    "",
    /* Remove any elements the previous run appended directly to <body> */
    "var _KNOWN_IDS = new Set(['status','output','html-output','error']);",
    "function _clearBodyExtras() {",
    "  Array.from(document.body.children).forEach(function(el) {",
    "    if (!_KNOWN_IDS.has(el.id)) el.remove();",
    "  });",
    "}",
    "",
    "async function runCode(code) {",
    "  _cancelTimers();",
    "  _clearBodyExtras();",
    "  outputEl.textContent  = '';",
    "  htmlOutEl.innerHTML   = '';",
    "  errorEl.textContent   = '';",
    "  statusEl.textContent  = '';",
    "  try {",
    "    await pyodide.loadPackagesFromImports(code, {",
    "      messageCallback: function(msg) { statusEl.textContent = msg; notify(msg); },",
    "      errorCallback:   function(err) { appendErr(err); parent.postMessage({ type: 'pyodide-stderr', line: err }, '*'); },",
    "    });",
    "",
    "    if (/\\bimport matplotlib\\b|\\bfrom matplotlib\\b/.test(code)) {",
    "      try {",
    "        notify('Activating matplotlib canvas backend\u2026');",
    "        await pyodide.runPythonAsync(",
    "          \"import matplotlib; matplotlib.use('module://matplotlib_pyodide.html5_canvas_backend')\"",
    "        );",
    "      } catch (_) {}",
    "    }",
    "",
    "    if (/\\bimport plotly\\b|\\bfrom plotly\\b/.test(code)) {",
    "      try {",
    "        notify('Configuring Plotly renderer\u2026');",
    "        pyodide.globals.set('_star_showHtml', showHtml);",
    "        await pyodide.runPythonAsync(",
    "          'import plotly.io as _pio\\n' +",
    "          'def _star_show(fig=None, *args, **kwargs):\\n' +",
    "          '    import js\\n' +",
    "          '    _html = fig.to_html(include_plotlyjs=\"cdn\", full_html=True)\\n' +",
    "          '    js.globalThis._star_showHtml(_html)\\n' +",
    "          'try:\\n' +",
    "          '    _pio.show = _star_show\\n' +",
    "          '    from plotly.basedatatypes import BaseFigure as _BF\\n' +",
    "          '    _BF.show = lambda self, *a, **k: _star_show(self)\\n' +",
    "          'except Exception:\\n' +",
    "          '    pass\\n'",
    "        );",
    "      } catch (_) {}",
    "    }",
    "",
    "    if (/\\bimport bokeh\\b|\\bfrom bokeh\\b/.test(code)) {",
    "      try {",
    "        notify('Configuring Bokeh renderer\u2026');",
    "        pyodide.globals.set('_star_showHtml', showHtml);",
    "        await pyodide.runPythonAsync(",
    "          'try:\\n' +",
    "          '    import bokeh.io as _bio\\n' +",
    "          '    from bokeh.embed import file_html as _fhtml\\n' +",
    "          '    from bokeh.resources import CDN as _CDN\\n' +",
    "          '    def _star_bk_show(obj, *args, **kwargs):\\n' +",
    "          '        import js\\n' +",
    "          '        _html = _fhtml(obj, _CDN)\\n' +",
    "          '        js.globalThis._star_showHtml(_html)\\n' +",
    "          '    _bio.show = _star_bk_show\\n' +",
    "          '    _bio.output_notebook = lambda *a, **k: None\\n' +",
    "          'except Exception:\\n' +",
    "          '    pass\\n'",
    "        );",
    "      } catch (_) {}",
    "    }",
    "",
    "    statusEl.textContent = '';",
    "    notify('Running\u2026');",
    "    await pyodide.runPythonAsync(code);",
    "    parent.postMessage({ type: 'pyodide-done', exit: 0 }, '*');",
    "  } catch (e) {",
    "    statusEl.textContent = '';",
    "    var msg = String(e);",
    "    appendErr(msg);",
    "    parent.postMessage({ type: 'pyodide-stderr', line: msg }, '*');",
    "    parent.postMessage({ type: 'pyodide-done', exit: 1 }, '*');",
    "  }",
    "}",
    "",
    "window.addEventListener('message', async function(ev) {",
    "  if (ev.data && ev.data.type === 'pyodide-run' && isReady) {",
    "    await runCode(ev.data.code);",
    "  }",
    "});",
    "",
    "(async function init() {",
    "  try {",
    "    pyodide = await loadPyodide();",
    "    pyodide.setStdout({ batched: appendOut });",
    "    pyodide.setStderr({ batched: appendErr });",
    "    await pyodide.loadPackage('micropip');",
    "    isReady = true;",
    "    statusEl.textContent = '';",
    "    parent.postMessage({ type: 'pyodide-ready' }, '*');",
    "  } catch (e) {",
    "    statusEl.textContent = '';",
    "    appendErr('Failed to load Python runtime: ' + String(e));",
    "  }",
    "})();",
  ];

  const htmlLines: string[] = [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '  <meta charset="utf-8">',
    /* Split </script> across concatenation so no JS parser mistakes it */
    '  <script src="https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js"><' + '/script>',
    '  <style>',
    '    * { box-sizing: border-box; margin: 0; padding: 0; }',
    '    html, body { height: 100%; overflow-y: auto; }',
    '    body {',
    '      background: #000;',
    '      color: #8f93a2;',
    "      font-family: 'JetBrains Mono', Consolas, monospace;",
    '      font-size: 12px;',
    '      line-height: 18px;',
    '    }',
    '    #status      { padding: 6px 12px; color: #3b3f51; font-style: italic; }',
    '    #output      { padding: 6px 12px; white-space: pre-wrap; word-break: break-word; }',
    '    #error       { padding: 6px 12px; color: #ff5370; white-space: pre-wrap; word-break: break-word; }',
    '    #html-output { width: 100%; }',
    '    #html-output iframe { width: calc(100% - 16px); min-height: 420px; border: none; background: #fff; border-radius: 4px; margin: 8px; display: block; }',
    '    canvas { max-width: calc(100% - 16px); display: block; margin: 8px; border-radius: 4px; }',
    '  </style>',
    '</head>',
    '<body>',
    '  <div id="status">Loading Python runtime (Wasm)\u2026</div>',
    '  <div id="output"></div>',
    '  <div id="html-output"></div>',
    '  <div id="error"></div>',
    '  <script>',
    scriptLines.join('\n'),
    '  <' + '/script>',
    '</body>',
    '</html>',
  ];

  return htmlLines.join('\n');
}

/* Computed once at module evaluation time (pure string ops, SSR-safe). */
const PYODIDE_FRAME_HTML = buildFrameHtml();

export interface PyodideRunnerProps {
  /** Python source code to execute. */
  code: string;
  /** Increment to trigger a new execution run. 0 = no auto-run on mount. */
  runKey: number;
  /** Called when execution completes; exit 0 = success. */
  onDone?: (exitCode: number) => void;
  /** Called once the Pyodide Wasm runtime has finished loading. */
  onReady?: () => void;
  /** Called with package-loading / runtime status strings. */
  onStatus?: (msg: string) => void;
  /** Called for each stderr line emitted during execution. */
  onStderr?: (line: string) => void;
}

/**
 * Sandboxed iframe hosting a persistent Pyodide (Python/Wasm) runtime.
 * The runtime initialises once; subsequent runs skip the cold-start.
 */
export function PyodideRunner({ code, runKey, onDone, onReady, onStatus, onStderr }: PyodideRunnerProps) {
  const iframeRef  = useRef<HTMLIFrameElement>(null);
  const isReadyRef = useRef(false);
  const queuedRef  = useRef<string | null>(null);

  const postRun = useCallback((src: string) => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'pyodide-run', code: src }, '*');
  }, []);

  /* Listen for messages from the iframe */
  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      if (ev.source !== iframeRef.current?.contentWindow) return;

      if (ev.data?.type === 'pyodide-status') {
        onStatus?.(ev.data.msg);
      }

      if (ev.data?.type === 'pyodide-stderr') {
        onStderr?.(ev.data.line);
      }

      if (ev.data?.type === 'pyodide-ready') {
        isReadyRef.current = true;
        onReady?.();
        if (queuedRef.current !== null) {
          postRun(queuedRef.current);
          queuedRef.current = null;
        }
      }

      if (ev.data?.type === 'pyodide-done') {
        onDone?.(ev.data.exit ?? 0);
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onDone, onReady, postRun]);

  /* Dispatch code whenever runKey increments */
  useEffect(() => {
    if (runKey === 0) return; // skip initial mount
    if (isReadyRef.current) {
      postRun(code);
    } else {
      queuedRef.current = code; // run once runtime is ready
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={PYODIDE_FRAME_HTML}
      style={{ width: '100%', height: '100%', border: 'none', background: '#000000' }}
      sandbox="allow-scripts"
      title="Python Visual Output"
    />
  );
}
