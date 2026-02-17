# Git 提交指南

## 初始化并推送到 GitHub

### 1. 在 GitHub 创建仓库
- 访问 https://github.com/new
- 仓库名称: `sharebill`
- 选择 Public 或 Private
- 不要初始化 README（已存在）

### 2. 本地初始化并推送

```bash
# 进入项目目录
cd /path/to/sharebill

# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: ShareBill project setup

- NestJS backend with auth module
- Flutter mobile app with login screen
- Docker deployment configuration
- GitHub Actions CI/CD
- Database schema with Prisma"

# 添加远程仓库（替换 YOUR_USERNAME）
git remote add origin https://github.com/YOUR_USERNAME/sharebill.git

# 推送
git push -u origin main
```

### 3. 验证 GitHub Actions

推送后，GitHub Actions 会自动运行：
- 访问 `https://github.com/YOUR_USERNAME/sharebill/actions`
- 查看构建状态

## 发布新版本

### 方式 1：命令行（推荐）

```bash
# 确保代码已提交
git add .
git commit -m "Your commit message"
git push

# 打标签（触发 Release 构建）
git tag -a v0.1.0 -m "Version 0.1.0 - MVP Release"

# 推送标签
git push origin v0.1.0
```

推送标签后，GitHub Actions 会自动：
1. 构建 Release APK
2. 创建 GitHub Release
3. 上传 APK 到 Release 页面

### 方式 2：GitHub Web 界面

1. 访问仓库页面
2. 点击右侧 "Releases"
3. 点击 "Create a new release"
4. 输入标签名（如 `v0.1.0`）
5. 填写发布说明
6. 点击 "Publish release"
7. GitHub Actions 会自动构建并上传 APK

## 分支策略

```
main        - 稳定版本，用于发布
develop     - 开发分支，日常开发
feature/*   - 功能分支
hotfix/*    - 紧急修复
```

### 日常开发流程

```bash
# 从 main 创建功能分支
git checkout -b feature/expense-module

# 开发...
git add .
git commit -m "Add expense CRUD operations"

# 推送到远程
git push -u origin feature/expense-module

# 创建 Pull Request 合并到 develop
# 在 GitHub 上操作

# 定期同步 develop
git checkout develop
git pull origin develop
git checkout feature/expense-module
git rebase develop
```

## 查看构建产物

### GitHub Actions 构建的 APK

1. 访问 `https://github.com/YOUR_USERNAME/sharebill/actions`
2. 点击最新的工作流运行
3. 在 "Artifacts" 部分下载 APK

### GitHub Release 的 APK

1. 访问 `https://github.com/YOUR_USERNAME/sharebill/releases`
2. 找到最新版本
3. 下载 `sharebill-v*.apk`

## 故障排除

### Actions 构建失败

1. 查看日志：Actions 页面 → 失败的工作流 → 查看日志
2. 常见问题：
   - Flutter 版本不兼容
   - 依赖下载失败
   - 代码分析错误

### 本地构建成功但 Actions 失败

可能是环境问题，检查：
- `.github/workflows/*.yml` 中的 Flutter 版本
- 环境变量配置
- 文件路径是否正确

## 提交规范

### Commit Message 格式

```
<type>: <subject>

<body>

<footer>
```

### Type 说明

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

### 示例

```
feat: add time-based expense splitting

- Implement daily/weekly/monthly splitting logic
- Add split configuration to expense model
- Update API endpoints

Closes #123
```
