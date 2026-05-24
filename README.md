# 数据收集系统 - SpreadJS 项目文档

## 项目概述

基于 Vue 3 + SpreadJS 构建的企业级数据收集与填报系统。

**技术栈**: Vue 3 + Vite + Vue Router + Pinia + SpreadJS v19 + IndexedDB
**目标**: 实现Excel模板导入、人员填报、公式自动计算、多步骤审批流程

---

## 快速开始

### 环境要求
- Node.js 18+
- npm

### 安装运行
```bash
# 克隆项目
git clone <仓库地址>
cd vue3-js

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问: http://localhost:5173

---

## 用户账号

| 角色 | 用户名 | 密码 | 说明 |
|------|--------|------|------|
| 管理员 | admin | admin123 | 可管理模板、流程，查看所有任务 |
| 填报角色 | user1 | user123 | 业务预算）|
| 填报角色 | user2 | user123 | 财务部 |
| 审批角色 | dep1 | user123 | 业务预算-部门负责人 |
| 审批角色 | dep2 | user123 | 财务部部门负责人 |
| 财务角色 | caiwu1 | user123 | 财务部，可审批预算 |

---

## 功能模块

### 1. 模板管理
**路径**: `/templates`

- 使用 SpreadJS Designer 设计 Excel 模板
- 支持数据绑定字段配置（名称、绑定路径、类型、是否必填）
- 导入 Excel 文件作为模板
- 模板保存后自动同步更新已关联的任务

### 2. 流程管理
**路径**: `/admin/workflows`

- 创建审批流程，关联模板
- 配置多步骤（填写 → 部门审批 → 财务审批）
- 支持按角色/部门/指定用户分配处理人
- 创建流程后自动下发第一步任务

### 3. 任务填报
**路径**: `/tasks`

| 用户角色 | 可见任务 |
|----------|----------|
| 管理员/财务 | 所有任务 |
| 部门负责人 | 本部门审批任务（currentStep > 1）|
| 填报角色 | 自己被分配的任务 |

- 填报用户填写 SpreadJS 表格
- 提交后自动流转到下一步
- 数据通过 IndexedDB 持久化存储

### 4. 审批流程
**路径**: `/tasks/approve/:id`

- 部门审批（dep1/dep2）
- 财务审批（caiwu1）
- 支持通过/驳回操作
- 审批后自动流转到下一步

---

## 数据结构

### 模板 (Template)
```javascript
{
  id: Number,
  name: String,           // 模板名称
  description: String,
  category: String,
  department: String,
  createdAt: String,
  createdBy: String,
  ssjson: Object,        // SpreadJS 表格数据
  dataFields: Array,     // 字段配置
  permissions: Object     // 权限配置
}
```

### 流程 (Workflow)
```javascript
{
  id: Number,
  name: String,          // 流程名称
  templateId: Number,     // 关联模板
  description: String,
  status: String,        // active/inactive
  steps: Array[
    {
      id: Number,
      name: String,      // 步骤名称
      assigneeType: String,  // role/department/users
      assignees: String,  // 角色ID或部门名称
      assigneeIds: Array, // 指定用户ID列表
      order: Number
    }
  ]
}
```

### 任务 (Task)
```javascript
{
  id: Number,
  workflowId: Number,
  workflowName: String,
  templateId: Number,
  templateName: String,
  title: String,
  status: String,         // pending/completed/rejected
  currentStep: Number,    // 当前步骤ID
  currentStepName: String,
  assigneeId: Number,
  assigneeName: String,
  department: String,
  createdBy: String,
  createdAt: String,
  dueDate: String,
  data: Object,          // 填报数据
  ssjson: Object,        // 完整表格数据
  history: Array          // 流程历史记录
}
```

---

## 项目结构

```
vue3-js/
├── src/
│   ├── views/
│   │   ├── Login.vue              # 登录页
│   │   ├── Home.vue               # 首页
│   │   ├── templates/
│   │   │   ├── List.vue          # 模板列表
│   │   │   └── Designer.vue      # 模板设计器
│   │   ├── tasks/
│   │   │   ├── List.vue         # 任务列表
│   │   │   ├── Fill.vue         # 填报页面
│   │   │   ├── View.vue         # 查看页面
│   │   │   └── Approve.vue       # 审批页面
│   │   └── admin/
│   │       ├── Panel.vue         # 管理面板
│   │       └── Workflows.vue     # 流程管理
│   ├── stores/
│   │   ├── auth.js               # 认证状态
│   │   └── data.js              # 业务数据
│   ├── utils/
│   │   └── indexedDB.js         # IndexedDB 封装
│   ├── router/
│   │   └── index.js             # 路由配置
│   └── App.vue
├── package.json
├── vite.config.js
└── .gitignore
```

---

## 路由

| 路径 | 组件 | 权限 |
|------|------|------|
| `/login` | Login.vue | 公开 |
| `/dashboard` | Home.vue | 登录用户 |
| `/templates` | TemplateList.vue | admin, finance |
| `/templates/create` | Designer.vue | admin, finance |
| `/templates/edit/:id` | Designer.vue | admin, finance |
| `/tasks` | TaskList.vue | 登录用户 |
| `/tasks/fill/:id` | Fill.vue | 填报角色 |
| `/tasks/approve/:id` | Approve.vue | manager, finance |
| `/tasks/view/:id` | View.vue | 登录用户 |
| `/admin` | AdminPanel.vue | admin |
| `/admin/workflows` | WorkflowManage.vue | admin |

---

## 技术要点

### SpreadJS Designer（模板设计）
```javascript
import * as GCD from "@grapecity-software/spread-sheets-designer"
const designer = new GCD.Spread.Sheets.Designer.Designer(container)
const spread = designer.getWorkbook()
const ssjson = spread.toJSON()
```

### SpreadJS（填报/查看）
```javascript
import * as GC from "@grapecity-software/spread-sheets"
const spread = new GC.Spread.Sheets.Workbook(container)
const sheet = spread.getActiveSheet()
sheet.options.isProtected = true
```

### IndexedDB 数据存储
```javascript
import { dbOperation, STORES, initDB } from '@/utils/indexedDB'
await initDB()
const id = await dbOperation.add(STORES.TASKS, taskData)
const tasks = await dbOperation.getAll(STORES.TASKS)
```

---

## 相关文档

- [SpreadJS 中文文档](https://demo.grapecity.com.cn/spreadjs/help/)
- [Vue 3 官方文档](https://cn.vuejs.org/)
- [IndexedDB API](https://developer.mozilla.org/zh-CN/docs/Web/API/IndexedDB_API)
