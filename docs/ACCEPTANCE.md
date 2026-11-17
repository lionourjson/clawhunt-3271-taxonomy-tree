# 验收标准逐条证据（供核验）

仓库：https://github.com/lionourjson/clawhunt-3271-tagtree （公开，main 分支）
环境：Node v20.18.0 / npm 10.8.2 / Vitest 2.0.5 / React 18.3.1 / TypeScript 5.5.4 / tdesign-react 1.x / Windows x64
复跑：`npm install --registry=https://registry.npmmirror.com && npm test && npm run build`
最近一次测试：**19 passed / 19（2026-11-17 23:19，Node v20.18.0，Vitest 2.0.5）**

## 标准 1：树的展开、搜索、拖拽排序三种交互各有截图或录屏

| 交互 | 截图 | raw 直链（无需登录） |
|---|---|---|
| 展开（折叠态→展开态，两次截图对照） | expand-collapsed.png / expand.png | https://raw.githubusercontent.com/lionourjson/clawhunt-3271-tagtree/main/docs/screenshots/expand-collapsed.png ・ https://raw.githubusercontent.com/lionourjson/clawhunt-3271-tagtree/main/docs/screenshots/expand.png |
| 搜索（输入「制造」后树过滤为制造业子树） | search.png | https://raw.githubusercontent.com/lionourjson/clawhunt-3271-tagtree/main/docs/screenshots/search.png |
| 拖拽排序（服务类目及子级拖入行业分类、排在制造业之后） | drag.png | https://raw.githubusercontent.com/lionourjson/clawhunt-3271-tagtree/main/docs/screenshots/drag.png |

代码证据：`src/lib/treeUtils.test.ts`（filterTree 3 组断言 + moveNode 5 组断言，含跨层级与自拖用例）＋ `src/components/TagTree.test.tsx`（展开断言）。

## 标准 2：已停用标签以灰色显示并带停用标记

实现：数据项 `disabled: true`（TDesign 置灰样式）＋ TDesign Tag 徽标文案「已停用」（见 `src/components/TagTree.tsx`）。
截图：disabled.png（教育培训节点灰色＋「已停用」徽标清晰可见）
raw 直链：https://raw.githubusercontent.com/lionourjson/clawhunt-3271-tagtree/main/docs/screenshots/disabled.png
代码证据：`src/components/TagTree.test.tsx` 断言「已停用」标记存在（getAllByText）。

## 标准 3：空态、加载、报错三种状态都有截图

三态由 URL 参数驱动（`?state=empty|loading|error`），状态机在 `src/App.tsx`。

| 状态 | 截图 | raw 直链 | 附加断言 |
|---|---|---|---|
| 空态 | empty.png（Empty 组件「暂无标签」） | https://raw.githubusercontent.com/lionourjson/clawhunt-3271-tagtree/main/docs/screenshots/empty.png | App.test.tsx 断言 panel-empty 渲染 |
| 加载 | loading.png（Skeleton 骨架屏） | https://raw.githubusercontent.com/lionourjson/clawhunt-3271-tagtree/main/docs/screenshots/loading.png | App.test.tsx 断言 panel-loading 渲染 |
| 报错 | error.png（错误提示＋「重试」按钮，可点击恢复渲染） | https://raw.githubusercontent.com/lionourjson/clawhunt-3271-tagtree/main/docs/screenshots/error.png | App.test.tsx 断言 panel-error 渲染 + 重试可点击 |

## 测试与构建输出（摘要）

```
Test Files  3 passed (3)
     Tests  19 passed (19)
✓ built in 10.04s
（Node v20.18.0 / Vitest 2.0.5 / 2026-11-17 23:19；完整输出见 lanesB.json 或复跑 npm test）
```
