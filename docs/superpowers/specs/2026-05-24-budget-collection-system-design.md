# 数据收集系统扩展设计文档

**日期**: 2026-05-24
**项目**: 数据收集系统 - SpreadJS 预算填报模块
**状态**: 草稿

---

## 1. 概述

### 1.1 项目背景
在现有 SpreadJS 数据收集系统基础上，扩展预算填报审批功能，支持多角色协同操作。

### 1.2 目标
- 支持三个预算表格的填报、审批流程
- Excel 模板导入功能
- 财务角色可修改公式并审批
- 可配置的审批流程

---

## 2. 用户与角色

### 2.1 用户清单

| 用户名 | 密码 | 角色 | 部门 | 权限范围 |
|--------|------|------|------|----------|
| admin | admin123 | 管理员 | 管理部 | 全部功能 |
| user1 | user123 | 部门员工 | 业务投放预算-节能环保部（西北区域） | 填报表格 |
| user2 | user123 | 部门员工 | 财务部 | 填报表格 |
| dep1 | user123 | 部门负责人 | 业务投放预算-节能环保部（西北区域） | 审批本部门表格 |
| dep2 | user123 | 部门负责人 | 财务部 | 审批本部门表格 |
| caiwu1 | user123 | 财务 | 财务部 | 审批所有表格、修改公式、模板管理、权限分配 |

### 2.2 角色权限矩阵

| 功能 | 管理员 | 部门员工 | 部门负责人 | 财务 |
|------|--------|----------|------------|------|
| 模板管理（CRUD） | ✓ | - | - | ✓ |
| Excel导入模板 | ✓ | - | - | ✓ |
| 填报表格 | - | ✓（本部门） | - | - |
| 审批表格 | - | - | ✓（本部门） | ✓（全部） |
| 修改公式 | - | - | - | ✓ |
| 权限分配 | - | - | - | ✓ |
| 查看所有表格 | - | - | ✓（本部门） | ✓ |

### 2.3 部门数据隔离
- 业务投放预算-节能环保部（西北区域）：dep1 审批
- 财务部：user2 填报，dep2 审批

---

## 3. 预算表格模板

### 3.1 三个预算表格

#### 3.1.1 业务投放预算-节能环保部(西北区域)
| 字段 | 类型 | 说明 |
|------|------|------|
| 部门 | text | 固定：节能环保部(西北区域) |
| 预算项目 | text | 必填 |
| 预算金额 | number | 必填 |
| 已用金额 | number | 可选 |
| 可用余额 | formula | =预算金额-已用金额 |
| 预算说明 | text | 可选 |

#### 3.1.2 融资预算
| 字段 | 类型 | 说明 |
|------|------|------|
| 融资项目 | text | 必填 |
| 计划金额 | number | 必填 |
| 已融资金额 | number | 可选 |
| 差额 | formula | =计划金额-已融资金额 |
| 融资方式 | text | 必填 |
| 预计完成日期 | date | 可选 |

#### 3.1.3 资产分类及拨备预算
| 字段 | 类型 | 说明 |
|------|------|------|
| 资产类别 | text | 必填 |
| 资产名称 | text | 必填 |
| 原值 | number | 必填 |
| 累计折旧 | number | 可选 |
| 净值 | formula | =原值-累计折旧 |
| 拨备比例 | number | 可选 |
| 拨备金额 | formula | =净值*拨备比例 |
| 备注 | text | 可选 |

### 3.2 模板数据结构
```javascript
{
  id: number,
  name: string,           // "业务投放预算-节能环保部(西北区域)"
  category: string,       // "预算"
  description: string,
  createdAt: string,
  createdBy: string,
  ssjson: object,         // SpreadJS 序列化数据
  dataFields: [
    {
      name: string,
      bindingPath: string,
      type: "text" | "number" | "date" | "formula",
      required: boolean,
      formula: string      // type=formula 时使用
    }
  ],
  permissions: {
    rows: {},             // 行权限配置
    columns: {},          // 列权限配置
    cells: {}             // 单元格权限配置
  },
  importedFromExcel: boolean  // 是否从 Excel 导入
}
```

---

## 4. Excel 模板导入

### 4.1 导入流程
1. 用户点击"导入Excel"按钮
2. 选择本地 .xlsx 文件
3. 系统解析 Excel 文件结构
4. 提取表头作为字段名
5. 生成 SSJSON 并保存为模板
6. 用户可进一步配置字段绑定

### 4.2 技术实现
- 使用 `@grapecity-software/spread-sheets-io` 解析 Excel
- 自动识别表头行和数据区域
- 保留原有公式和格式

---

## 5. 审批流程

### 5.1 默认流程配置
```
填报 → 部门负责人审批 → 财务审批
```

### 5.2 流程可配置性
- 每个模板可关联不同的流程配置
- 流程步骤支持：
  - 步骤名称
  - 处理人类型（角色/用户/部门）
  - 处理人（根据类型选择）
  - 顺序

### 5.3 流程数据结构
```javascript
{
  id: number,
  name: string,
  templateId: number,    // 关联模板
  description: string,
  status: "active" | "inactive",
  steps: [
    {
      id: number,
      name: string,       // "填报"、"部门审批"、"财务审批"
      assigneeType: "role" | "user" | "department" | "initiator",
      assignees: string | string[],  // 角色ID/用户ID/部门ID
      order: number
    }
  ]
}
```

### 5.4 任务状态流转
```
pending → in_progress → completed / rejected
         ↑__________________|
```

### 5.5 审批记录
```javascript
{
  id: number,
  taskId: number,
  stepId: number,
  stepName: string,
  approverId: number,
  approverName: string,
  status: "pending" | "approved" | "rejected",
  comment: string,
  ssjsonDelta: object,   // 财务修改的公式变更
  createdAt: string,
  updatedAt: string
}
```

---

## 6. 公式管理

### 6.1 权限说明
- 普通填报用户：不能修改公式，只能填写数据
- 财务用户：可以修改公式

### 6.2 公式修改流程
1. 财务在审批页面查看任务
2. 点击"修改公式"进入编辑模式
3. 修改单元格公式
4. 保存后，公式变更记录到 `ssjsonDelta`
5. 重新计算结果

### 6.3 数据结构
```javascript
{
  // Task 中的公式变更记录
  ssjsonDelta: {
    modifiedCells: [
      { row: 5, col: 3, oldFormula: "=A1+B1", newFormula: "=A1+B1+C1" }
    ],
    modifiedAt: "2026-05-24T10:00:00Z"
  }
}
```

---

## 7. 权限分配

### 7.1 权限类型
- **填报权限**：谁能填写某个任务
- **查看权限**：谁能查看某个任务
- **审批权限**：谁能审批某个任务

### 7.2 权限配置入口
- 财务角色可在任务列表或详情页面分配权限
- 支持按用户、按角色分配

### 7.3 权限配置存储
```javascript
{
  taskId: number,
  permissions: {
    fill: { users: [], roles: [] },
    view: { users: [], roles: [] },
    approve: { users: [], roles: [] }
  }
}
```

---

## 8. 页面结构

### 8.1 路由设计

| 路径 | 组件 | 权限 | 说明 |
|------|------|------|------|
| /login | Login.vue | 公开 | 登录 |
| /dashboard | Home.vue | 登录用户 | 首页仪表板 |
| /templates | TemplateList.vue | 管理员/财务 | 模板列表 |
| /templates/create | Designer.vue | 管理员/财务 | 创建模板 |
| /templates/edit/:id | Designer.vue | 管理员/财务 | 编辑模板 |
| /templates/import | Import.vue | 管理员/财务 | Excel导入 |
| /tasks | TaskList.vue | 登录用户 | 任务列表 |
| /tasks/start | Start.vue | 部门员工 | 发起任务 |
| /tasks/fill/:id | Fill.vue | 填报人 | 填报表格 |
| /tasks/view/:id | View.vue | 填报人/审批人 | 查看任务 |
| /tasks/approve/:id | Approve.vue | 审批人 | 审批任务 |
| /admin | AdminPanel.vue | 管理员 | 管理面板 |
| /admin/workflows | Workflows.vue | 管理员/财务 | 流程管理 |

### 8.2 页面功能说明

#### 8.2.1 模板列表 (/templates)
- 显示所有模板卡片
- 支持 Excel 导入按钮
- 管理员/财务：显示创建、编辑、删除按钮
- 其他角色：只读

#### 8.2.2 模板设计器 (/templates/create, /templates/edit/:id)
- SpreadJS Designer 集成
- 右侧字段配置面板
- 保存时序列化为 SSJSON

#### 8.2.3 Excel 导入 (/templates/import)
- 文件选择器
- 导入预览
- 字段映射配置
- 确认导入

#### 8.2.4 任务列表 (/tasks)
- 筛选：全部/待填报/待审批/已完成
- 部门负责人：只显示本部门任务
- 财务：显示所有任务
- 快速操作：填报/查看/审批

#### 8.2.5 审批页面 (/tasks/approve/:id)
- 显示填报数据（只读）
- 财务可修改公式（编辑模式切换）
- 审批意见输入
- 通过/驳回按钮

---

## 9. 技术实现

### 9.1 前端技术栈
- Vue 3 + Composition API
- Vue Router 4
- Pinia 2
- SpreadJS v19
- IndexedDB 持久化

### 9.2 关键文件结构
```
src/
├── views/
│   ├── templates/
│   │   ├── List.vue        # 模板列表
│   │   ├── Designer.vue    # 设计器
│   │   └── Import.vue      # Excel导入
│   ├── tasks/
│   │   ├── List.vue        # 任务列表
│   │   ├── Start.vue       # 发起任务
│   │   ├── Fill.vue        # 填报表格
│   │   ├── View.vue        # 查看任务
│   │   └── Approve.vue     # 审批任务
│   └── admin/
│       ├── Panel.vue       # 管理面板
│       └── Workflows.vue   # 流程管理
├── stores/
│   ├── auth.js             # 认证 + 用户
│   ├── data.js             # 业务数据
│   └── approvals.js        # 审批记录 (新增)
├── router/
│   └── index.js            # 路由配置
├── utils/
│   ├── indexedDB.js        # IndexedDB 封装
│   └── excelImport.js      # Excel 导入工具
└── components/
    └── PermissionManager.vue
```

### 9.3 IndexedDB 存储区
```
SpreadJS_DataCollect
├── templates   (模板，含SSJSON)
├── workflows   (流程配置)
├── tasks       (任务，含填报数据)
└── approvals   (审批记录)
```

---

## 10. 实施计划

### Phase 1: 用户与权限基础
1. 更新用户数据（添加 dep1, dep2, caiwu1）
2. 更新角色定义
3. 完善路由守卫权限控制

### Phase 2: 模板管理
1. 创建三个预算表格模板
2. 实现 Excel 导入功能
3. 模板列表权限控制

### Phase 3: 审批流程
1. 审批记录存储（approvals）
2. 审批页面开发
3. 流程状态流转

### Phase 4: 公式管理
1. 财务修改公式功能
2. 公式变更记录

### Phase 5: 权限分配
1. 权限配置UI
2. 权限验证逻辑

---

## 11. 待定事项

- [ ] 公式隐藏功能（用户表示后续定制开发 SpreadJS）
- [ ] Excel 导入的具体字段映射规则
- [ ] 部门负责人跨部门查看权限（如需要）
