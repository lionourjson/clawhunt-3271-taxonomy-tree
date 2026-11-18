/**
 * 验收截图：npm run build 之后运行 npm run shots。
 * 启动 vite preview，用 playwright-core 驱动本机 Chrome/Edge（无头）真实操作页面并截图，
 * 输出到 docs/screenshots/v2/，最后打印每张图的 md5，确认没有重复。
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'screenshots', 'v2');
const PORT = 5199;
const BASE = `http://127.0.0.1:${PORT}`;

function findBrowser() {
  const list = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  const hit = list.find((p) => existsSync(p));
  if (!hit) throw new Error('找不到 Chrome/Edge，请设置环境变量 CHROME_PATH');
  return hit;
}

async function waitFor(url, ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* 继续等 */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`预览服务没起来：${url}`);
}

const node = (id) => `[data-testid="tree-node-${id}"]`;

async function open(page, query = '') {
  await page.goto(`${BASE}/admin/taxonomy${query}`);
  await page.waitForSelector('nav[aria-label="字典列表"] button');
}

async function treeReady(page) {
  await page.waitForSelector(node('ind-mfg'));
}

const shots = [
  ['01-expand-before.png', '展开前：默认折叠', async (p) => { await open(p); await treeReady(p); }],
  ['02-expand-after.png', '展开后：点开「制造业」「现代服务业」', async (p) => {
    await open(p); await treeReady(p);
    await p.click('[data-testid="toggle-ind-mfg"]');
    await p.click('[data-testid="toggle-ind-svc"]');
    await p.waitForSelector(node('ind-svc-hr'));
  }],
  ['03-search-highlight.png', '搜索「业」：命中处黄色高亮，祖先自动展开', async (p) => {
    await open(p); await treeReady(p);
    await p.fill('input[placeholder="搜索标签"]', '业');
    await p.waitForSelector('mark.kw-hit');
  }],
  ['04-drag-before.png', '同级拖拽前：制造业下顺序为 智能装备、汽车零部件、新材料', async (p) => {
    await open(p); await treeReady(p);
    await p.click('[data-testid="toggle-ind-mfg"]');
    await p.waitForSelector(node('ind-mfg-mat'));
  }],
  ['05-drag-after-saved.png', '同级拖拽后：把「新材料」拖到「智能装备」上，调用保存接口，提示排序已保存', async (p) => {
    await open(p); await treeReady(p);
    await p.click('[data-testid="toggle-ind-mfg"]');
    await p.locator(node('ind-mfg-mat')).dragTo(p.locator(node('ind-mfg-eq')));
    await p.waitForSelector('text=排序已保存');
  }],
  ['06-drag-cross-level-rejected.png', '跨层级拖拽被拒绝：把「跨境贸易」拖到「智能装备」上', async (p) => {
    await open(p); await treeReady(p);
    await p.click('[data-testid="toggle-ind-mfg"]');
    await p.locator(node('ind-trade')).dragTo(p.locator(node('ind-mfg-eq')));
    await p.waitForSelector('text=只能在同一层级内拖拽排序');
  }],
  ['07-context-menu.png', '右键菜单：编辑、新增子标签、停用、合并', async (p) => {
    await open(p); await treeReady(p);
    await p.click(`${node('ind-trade')} .tag-label`, { button: 'right' });
    await p.waitForSelector('[role="menu"]');
  }],
  ['08-disable-via-menu.png', '右键「停用」后：跨境贸易变灰并标已停用', async (p) => {
    await open(p); await treeReady(p);
    await p.click(`${node('ind-trade')} .tag-label`, { button: 'right' });
    await p.click('[role="menuitem"]:has-text("停用")');
    await p.waitForSelector('text=已停用「跨境贸易」');
  }],
  ['09-add-child-dialog.png', '右键「新增子标签」对话框', async (p) => {
    await open(p); await treeReady(p);
    await p.click(`${node('ind-trade')} .tag-label`, { button: 'right' });
    await p.click('[role="menuitem"]:has-text("新增子标签")');
    await p.fill('input[placeholder="标签名称（1–20 个字）"]', '东南亚');
  }],
  ['10-merge-dialog.png', '右键「合并」对话框：选择目标「数字经济」', async (p) => {
    await open(p); await treeReady(p);
    await p.click(`${node('ind-trade')} .tag-label`, { button: 'right' });
    await p.click('[role="menuitem"]:has-text("合并")');
    await p.waitForSelector('text=会被删除');
    await p.click('input[placeholder="选择目标标签"]');
    await p.click('.t-select-option:has-text("数字经济")');
    await p.mouse.click(640, 220);
  }],
  ['10b-merge-done.png', '合并完成：跨境贸易消失，数字经济引用数 15+12=27', async (p) => {
    await open(p); await treeReady(p);
    await p.click(`${node('ind-trade')} .tag-label`, { button: 'right' });
    await p.click('[role="menuitem"]:has-text("合并")');
    await p.click('input[placeholder="选择目标标签"]');
    await p.click('.t-select-option:has-text("数字经济")');
    await p.click('.t-dialog__confirm');
    await p.waitForSelector('text=已将「跨境贸易」合并到「数字经济」');
  }],
  ['11-dictionary-switch.png', '切换左侧字典到「服务类目」：右侧加载对应标签树（含停用的印刷制作）', async (p) => {
    await open(p); await treeReady(p);
    await p.click('[data-testid="dict-dict-service"]');
    await p.waitForSelector(node('svc-dev'));
    await p.click('[data-testid="toggle-svc-design"]');
    await p.waitForSelector(node('svc-design-ui'));
  }],
  ['12-empty.png', '空态', async (p) => { await open(p, '?state=empty'); await p.waitForSelector('[data-testid="panel-empty"]'); }],
  ['13-loading.png', '加载中（骨架屏）', async (p) => { await open(p, '?state=loading'); await p.waitForSelector('[data-testid="panel-loading"]'); await p.waitForTimeout(500); }],
  ['14-error.png', '报错（含重试按钮）', async (p) => { await open(p, '?state=error'); await p.waitForSelector('[data-testid="panel-error"]'); }],
];

mkdirSync(OUT, { recursive: true });
const server = spawn(process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
  cwd: ROOT,
  stdio: 'ignore',
});
try {
  await waitFor(`${BASE}/admin/taxonomy`);
  const browser = await chromium.launch({ executablePath: findBrowser(), headless: true });
  for (const [file, title, act] of shots) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 }, locale: 'zh-CN' });
    const page = await ctx.newPage();
    await act(page);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(OUT, file) });
    console.log(`✓ ${file}  ${title}`);
    await ctx.close();
  }
  await browser.close();
} finally {
  server.kill();
}

const files = readdirSync(OUT).filter((f) => f.endsWith('.png')).sort();
const seen = new Map();
for (const f of files) {
  const md5 = createHash('md5').update(readFileSync(path.join(OUT, f))).digest('hex');
  console.log(`${md5}  ${f}`);
  if (seen.has(md5)) throw new Error(`截图重复：${f} 与 ${seen.get(md5)}`);
  seen.set(md5, f);
}
console.log(`共 ${files.length} 张，全部不重复`);
