// Minimal stdio MCP client for the google-flow-mcp server, so this session can call it
// without restarting the client. Usage:
//   node scripts/flow-mcp.mjs list
//   node scripts/flow-mcp.mjs call flow_connect '{}'
//   node scripts/flow-mcp.mjs call flow_generate_image '{"prompt":"...","ratio":"1:1","auto_confirm":true}'
//   node scripts/flow-mcp.mjs batch jobs.json      (array of {tool, args}; runs sequentially on one connection)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SERVER_DIR = process.env.FLOW_MCP_DIR || 'C:/Users/Kenneth Rodas/Documents/GitHub/google-flow-mcp';
const [mode, a1, a2] = process.argv.slice(2);

const proc = spawn('node', ['src/index.js'], { cwd: SERVER_DIR, stdio: ['pipe', 'pipe', 'pipe'] });
proc.stderr.on('data', (d) => process.stderr.write(d));
let buf = '';
const pending = new Map();
let id = 0;
proc.stdout.on('data', (d) => {
  buf += d.toString();
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
    if (!line) continue;
    let msg; try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id !== undefined && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  }
});
function send(method, params, timeoutMs = 20 * 60 * 1000) {
  const myId = ++id;
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { pending.delete(myId); reject(new Error(`timeout on ${method}`)); }, timeoutMs);
    pending.set(myId, (m) => { clearTimeout(t); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); });
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: myId, method, params }) + '\n');
  });
}
function notify(method, params) { proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n'); }

function printResult(res) {
  const parts = (res && res.content) || [];
  for (const p of parts) {
    if (p.type === 'text') { console.log(p.text); }
    else console.log(`[${p.type}]`);
  }
  if (!parts.length) console.log(JSON.stringify(res, null, 2));
}

try {
  await send('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'eatdanville-cli', version: '1.0' } });
  notify('notifications/initialized', {});
  if (mode === 'list') {
    const r = await send('tools/list', {});
    for (const t of r.tools) console.log(`- ${t.name}: ${(t.description || '').slice(0, 140).replace(/\n/g, ' ')}`);
  } else if (mode === 'call') {
    const r = await send('tools/call', { name: a1, arguments: a2 ? JSON.parse(a2) : {} });
    printResult(r);
  } else if (mode === 'batch') {
    const jobs = JSON.parse(fs.readFileSync(path.resolve(a1), 'utf8'));
    for (const job of jobs) {
      console.log(`\n### ${job.tool} ${JSON.stringify(job.args || {}).slice(0, 160)}`);
      try { printResult(await send('tools/call', { name: job.tool, arguments: job.args || {} })); }
      catch (e) { console.log(`ERROR: ${e.message}`); if (job.stopOnError) break; }
    }
  } else {
    console.log('usage: list | call <tool> <json> | batch <file>');
  }
} catch (e) {
  console.error('FAILED:', e.message);
  process.exitCode = 1;
} finally {
  proc.kill();
}
