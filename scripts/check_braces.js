const fs = require('fs');
const s = fs.readFileSync('components/SpriteEditor.jsx','utf8');
let stack=[]; let inSingle=false; let inDouble=false; let inTemplate=false; let inComment=false;
for(let i=0;i<s.length;i++){
  const c = s[i]; const prev = s[i-1];
  if(inComment){ if(prev==='*' && c==='/'){ inComment=false; } continue; }
  if(!inSingle && !inDouble && !inTemplate && c==='/' && s[i+1]==='*'){ inComment=true; continue; }
  if(!inSingle && !inDouble && !inTemplate && c==='/' && s[i+1]==='/'){ i = s.indexOf('\n',i); if(i===-1) break; continue; }
  if(!inSingle && !inDouble && !inTemplate && c==='`') { inTemplate=true; continue; }
  if(inTemplate){ if(c==='`' && prev !== '\\') inTemplate=false; continue; }
  if(!inSingle && !inDouble && c==="'") { inSingle=true; continue; }
  if(inSingle){ if(c==="'" && prev !== '\\') inSingle=false; continue; }
  if(!inSingle && !inDouble && c==='"') { inDouble=true; continue; }
  if(inDouble){ if(c==='"' && prev !== '\\') inDouble=false; continue; }
  if(c==='(' || c==='{' || c==='[') { stack.push({c,idx:i}); }
  else if(c===')' || c==='}' || c===']') {
    const top = stack.pop();
    if(!top){ const pos = s.substring(0,i).split('\n').length; console.log('Unmatched closing', c, 'at line', pos); process.exit(1); }
    const pairs = {')':'(', '}':'{', ']':'['};
    if(pairs[c] !== top.c){ const line = s.substring(0,i).split('\n').length; console.log('Mismatched', top.c, 'closed by', c, 'at line', line); process.exit(1); }
  }
}
if(stack.length>0){ const last = stack[stack.length-1]; const line = s.substring(0,last.idx).split('\n').length; console.log('Unclosed', last.c, 'starting at line', line); } else { console.log('Braces/Brackets balanced.'); }