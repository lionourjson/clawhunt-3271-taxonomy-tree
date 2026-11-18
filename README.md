# 会员空间平台 · 管理后台：标签树页面（/admin/taxonomy）

工单【S2-TAX-014】，阶段 ii 数据与权限底座，模块：字典与标签中心。技术栈按统一约定：React + TypeScript + TDesign；接口先用 MSW 模拟。

页面：左侧字典列表，右侧标签树。标签树支持展开、搜索高亮、显示状态标签和引用数、同级拖拽排序（拖完调用接口保存）、右键菜单（编辑、新增子标签、停用、合并），以及空态、加载、报错三种状态。

## 运行

需要 Node 18 以上（本仓库在 Node 20.18.0、npm 10.8.2、Windows 11 上验证）。

```bash
npm ci
npm test          # Vitest，3 个测试文件共 41 个用例
npm run build     # tsc 类型检查 + vite 生产构建
npm run preview   # 打开 http://127.0.0.1:5199/admin/taxonomy
npm run shots     # 重新生成验收截图（需先 build；用本机 Chrome/Edge，可用 CHROME_PATH 指定）
```

三种状态的演示地址（只影响标签树接口，由 MSW 按请求头返回）：

- `/admin/taxonomy?state=empty`：空态
- `/admin/taxonomy?state=loading`：加载中
- `/admin/taxonomy?state=error`：报错

左侧「活动主题」字典本身没有标签，点它也会看到空态。

## 验收标准对照

| 验收标准 | 实现 | 截图（docs/screenshots/v2/） | 测试 |
|---|---|---|---|
| 1. 树的展开、搜索、拖拽排序三种交互各有截图或录屏 | **展开**：点箭头展开/收起子标签。**搜索**：命中的关键字用黄色 `<mark>` 高亮，命中节点的祖先自动展开，没命中的分支隐藏，无结果时有提示。**拖拽**：只允许在同一个父节点下排序，跨层级拖拽会被拒绝并提示；同级拖完先更新界面，再调用 `PUT /api/taxonomy/dictionaries/{dictId}/order` 保存，成功提示「排序已保存」，失败回滚并提示原因。 | 展开：`01-expand-before.png`、`02-expand-after.png`<br>搜索高亮：`03-search-highlight.png`<br>拖拽：`04-drag-before.png`（拖前）、`05-drag-after-saved.png`（拖后 + 保存成功提示）、`06-drag-cross-level-rejected.png`（跨层级被拒） | `TaxonomyPage.test.tsx`：展开、搜索高亮、无结果提示、根层同级拖拽保存、子层同级拖拽保存、跨层级拒绝且不调用保存、保存失败回滚；`tags.test.ts`：`moveSibling` 5 个用例、`splitHighlight` 2 个用例 |
| 2. 已停用标签以灰色显示并带停用标记 | 每个节点显示状态标签（启用 / 已停用）和引用数（「引用 N」）。已停用节点整行文字置灰，并带「已停用」标签。右键菜单可以停用或重新启用。 | `02-expand-after.png`（教育培训）、`08-disable-via-menu.png`（右键停用跨境贸易后）、`11-dictionary-switch.png`（印刷制作） | `TaxonomyPage.test.tsx`：状态与引用数、停用后置灰、已停用节点菜单显示「启用」 |
| 3. 空态、加载、报错三种状态都有截图 | 空态：空提示 + 「新增第一个标签」。加载：骨架屏。报错：显示错误原因 + 「重试」按钮。 | `12-empty.png`、`13-loading.png`、`14-error.png` | `TaxonomyPage.test.tsx`：空态、真实空字典、加载、报错与重试 |

工单范围里的其他要素：

| 范围要求 | 实现 | 截图 | 测试 |
|---|---|---|---|
| 左侧字典列表 | 列出全部字典和各自的标签数，点击切换，右侧加载对应字典的标签树 | `11-dictionary-switch.png` | 字典列表、切换字典 |
| 右键菜单：编辑、新增子标签、停用、合并 | 右键节点弹出四项菜单（点外面或按 Esc 关闭）。编辑和新增子标签弹对话框输入名称（1–20 字，同级不能重名）；合并会说明后果，选好目标后把源标签的引用数和子标签转给目标，源标签删除，不能合并到自己的下级 | `07-context-menu.png`、`09-add-child-dialog.png`、`10-merge-dialog.png`、`10b-merge-done.png` | 菜单四项、停用、新增子标签、编辑、合并对话框；接口测试覆盖合并、重名、改名 |
| 页面路由 /admin/taxonomy | react-router，其他路径跳转到 /admin/taxonomy 并保留查询参数 | 每张截图页头 | 路由测试 |

## 测试覆盖（41 个用例）

- `src/lib/tags.test.ts`（13）：过滤、高亮切段、同级排序（根层上移、根层下移、子层、跨层级拒绝、无效拖拽）、合并、新增、停用。
- `src/mocks/handlers.test.ts`（7）：接口契约。字典列表、排序保存后可读回、排序数据和同级不一致时拒绝、重名 409、停用和改名、合并、强制空和报错。
- `src/pages/TaxonomyPage.test.tsx`（21）：路由、字典列表与切换、展开、搜索高亮、状态与引用数、同级拖拽保存、跨层级拒绝、保存失败回滚、右键菜单各项、三种状态。

## 与其他工单的集成点

页面只依赖下面 6 个接口（`src/api/taxonomy.ts`），现在由 `src/mocks/handlers.ts` 用 MSW 模拟。真实后端照同样的路径和返回结构实现后，设置环境变量 `VITE_USE_MOCK=false`（关闭 MSW），需要时用 `VITE_API_BASE` 指定接口前缀即可，页面代码不用改。

| 方法 | 路径 | 请求体 | 返回 |
|---|---|---|---|
| GET | `/api/taxonomy/dictionaries` | — | `{ data: Dictionary[] }` |
| GET | `/api/taxonomy/dictionaries/{dictId}/tags` | — | `{ data: TagNode[] }` |
| PUT | `/api/taxonomy/dictionaries/{dictId}/order` | `{ parentId: string \| null, orderedIds: string[] }` | `{ data: TagNode[] }`；`orderedIds` 必须正好是该父节点下全部子标签，否则 422 |
| POST | `/api/taxonomy/dictionaries/{dictId}/tags` | `{ parentId: string \| null, label: string }` | `{ data: TagNode[] }`；同级重名 409 |
| PATCH | `/api/taxonomy/dictionaries/{dictId}/tags/{tagId}` | `{ label?: string, status?: 'enabled' \| 'disabled' }` | `{ data: TagNode[] }` |
| POST | `/api/taxonomy/dictionaries/{dictId}/merge` | `{ sourceId: string, targetId: string }` | `{ data: TagNode[] }`；合并到自己的下级 422 |

数据结构见 `src/lib/tags.ts`：`TagNode { id, label, status: 'enabled' | 'disabled', refCount, children? }`，`Dictionary { id, name, code, tagCount }`。后端表结构按平台统一约定（UUID、org_id、site_id、软删除等）由后端工单负责，本页面不涉及金额字段。依赖的 S2-WB 工作台框架尚未提供，本页面独立运行，接入时把 `TaxonomyPage` 挂到框架的路由下即可。

## 数据与保密

全部字典和标签都是虚构的测试数据，不含真实企业、客户或个人信息，也不含客户名称。没有引入会把数据发到境外的第三方 SDK。
