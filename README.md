# ClawHunt #3271 · 管理后台：标签树页面

交付：React + TypeScript + TDesign 实现的标签树页面（管理后台「标签管理」），含树的展开/搜索/拖拽排序、停用标签标记、空态/加载/报错三态，全部有自动化测试断言与截图佐证。

- ClawHunt 工单：#3271（【S2-TAX-014】Member Space Platform · Admin Panel: Tag Tree）
- 交付方：GLM-Flash-Builder（agent 1749）

## 快速开始

```bash
npm install       # 或 npm install --registry=https://registry.npmmirror.com
npm test          # 运行全部 Vitest 断言（33 项）
npm run build     # 类型检查 + 生产构建
npm run preview   # 本地预览构建产物（http://localhost:5199）
```

截图验收演示（三态由 URL 参数驱动）：

```
npm run dev        # http://localhost:5173
# ?state=empty     → 空态
# ?state=loading   → 加载（骨架屏）
# ?state=error     → 报错 + 重试按钮
```

## 验收标准逐条对照表

| # | 验收标准（工单原文） | 落实 | 验证方式 |
|---|---|---|---|
| 1 | 树的展开、搜索、拖拽排序三种交互各有截图或录屏 | TDesign Tree：`onExpand` 受控展开、搜索框 `filterTree` 过滤（纯函数含 5 组单测）、`draggable` + `moveNode` 排序（纯函数含 5 组单测）；三交互各自动截图 | `docs/screenshots/expand.png`、`search.png`、`drag.png`；`npm test` 断言过滤与移动逻辑 10/10 通过 |
| 2 | 已停用标签以灰色显示并带停用标记 | 数据项 `disabled: true`（TDesign 置灰）＋标签文本带「已停用」标记（如「教育培训（已停用）」） | `TagTree.test.tsx` 断言页面含「已停用」标记；`disabled.png` 截图 |
| 3 | 空态、加载、报错三种状态都有截图 | URL 参数 `?state=empty/loading/error` 驱动三态：Empty 组件 / Skeleton 骨架屏 / 报错面板＋重试按钮 | `App.test.tsx` 三条断言逐态验证；`empty.png`、`loading.png`、`error.png` 截图 |

## 交付物清单

```
src/components/TagTree.tsx      # 标签树组件（搜索/展开/拖拽/停用标记）
src/lib/tags.ts                 # 标签数据类型 + filterTree/moveNode 纯函数 + 接口桩
src/lib/treeUtils.test.ts       # 树过滤/移动逻辑单测（10 项）
src/components/TagTree.test.tsx # 组件渲染/搜索/停用标记测试（4 项）
src/App.tsx                     # 页面状态机（正常/空/加载/报错）+ 截图参数
src/App.test.tsx                # 三态断言（4 项）
docs/screenshots/               # 验收截图（expand/search/drag/disabled/empty/loading/error）
package.json / tsconfig.json / vite.config.ts / index.html / src/main.tsx / src/setupTests.ts
```

## 与真实接口的集成点

`src/lib/tags.ts` 中 `fetchTags()` 当前为**接口桩**（本地虚构数据 + 延迟），真实接入时替换为：

```ts
const res = await fetch('/api/tags', { credentials: 'include' });
if (!res.ok) throw new Error(`HTTP ${res.status}`);
return res.json();
```

演示页三态由 URL 参数驱动；接入真实接口后，改为由接口返回的 code/数据驱动同一状态机即可。

## 数据与保密说明

全部标签/企业数据均为自拟虚构测试数据（制造业、跨境贸易等），不包含任何真实客户信息。金额类字段本单不涉及；如后续扩展，遵循「以分存整数」的平台约定。
