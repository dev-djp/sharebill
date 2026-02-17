# ShareBill

智能分摊记账助手 - 支持时间分摊、次数分摊、家庭分摊

## 📱 下载 APK

**最新版本**: [Releases](../../releases)

开发阶段登录：
- 手机号：任意 11 位（如 `13800138000`）
- 验证码：后 6 位（如 `138000`）

## 🚀 快速开始

### 开发环境
```bash
# 后端
cd apps/api
npm install
npm run start:dev

# 移动端
cd apps/sharebill_app
flutter pub get
flutter run
```

### 构建 APK
```bash
cd apps/sharebill_app
flutter build apk --release
```

## 📁 项目结构

```
sharebill/
├── apps/
│   ├── api/              # NestJS 后端
│   └── sharebill_app/    # Flutter 移动端
├── scripts/              # 运维脚本
└── docker-compose.yml    # Docker 部署
```

## 🔧 技术栈

- 后端: Node.js + NestJS + PostgreSQL
- 移动端: Flutter + Riverpod
- 部署: Docker + GitHub Actions

## 📄 文档

- [产品需求 (PRD)](./PRD.md)
- [技术规范](./TECH_SPEC.md)

## 📜 License

MIT
