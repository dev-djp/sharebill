#!/bin/bash
# 构建 ShareBill Android APK 脚本

set -e

echo "🚀 ShareBill APK 构建脚本"
echo "=========================="

# 检查 Flutter 环境
if ! command -v flutter &> /dev/null; then
    echo "❌ 错误: 未找到 Flutter，请先安装 Flutter SDK"
    exit 1
fi

echo "✅ Flutter 版本:"
flutter --version

# 进入项目目录
cd "$(dirname "$0")/../apps/sharebill_app"

echo ""
echo "📦 步骤 1/5: 获取依赖..."
flutter pub get

echo ""
echo "🔧 步骤 2/5: 检查代码..."
flutter analyze --no-pub

echo ""
echo "🧪 步骤 3/5: 运行测试..."
flutter test --no-pub || true

echo ""
echo "📱 步骤 4/5: 构建 APK..."
flutter build apk --release

echo ""
echo "📋 步骤 5/5: 构建信息..."
APK_PATH="build/app/outputs/flutter-apk/app-release.apk"
if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(ls -lh "$APK_PATH" | awk '{print $5}')
    echo "✅ APK 构建成功!"
    echo "📦 文件大小: $APK_SIZE"
    echo "📂 文件路径: $APK_PATH"
    echo ""
    echo "📝 安装命令:"
    echo "  adb install $APK_PATH"
    echo ""
    echo "💡 提示: 确保手机开启 USB 调试，或使用adb无线调试"
else
    echo "❌ APK 构建失败"
    exit 1
fi
