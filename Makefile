# 语记账 (Accout) — 一键构建脚本
# iOS 应用只能在 macOS 上编译，本 Makefile 需在 Mac 上运行
#
#   make setup    安装依赖（xcodegen，需 Homebrew）
#   make          生成工程并编译（模拟器 Debug 包）
#   make run      编译 + 启动模拟器 + 安装 + 运行，一键看效果
#   make device   编译真机包（需 TEAM_ID=你的开发者团队 ID）
#   make clean    清理构建产物和生成的工程

APP         := Accout
BUNDLE_ID   := com.accout.app
# 默认自动探测第一个可用的 iPhone 模拟器，可用 make run SIMULATOR="iPhone 17 Pro" 覆盖
# 注：正则里的左括号必须经由变量注入，否则 make 解析 $(shell) 时括号计数会错
LPAREN      := (
ifeq ($(origin SIMULATOR),undefined)
SIMULATOR   := $(shell xcrun simctl list devices available 2>/dev/null | grep -o 'iPhone[^$(LPAREN)]*' | head -1 | sed 's/ *$$//')
endif
BUILD_DIR   := build
APP_PATH    := $(BUILD_DIR)/Build/Products/Debug-iphonesimulator/$(APP).app
DESTINATION := platform=iOS Simulator,name=$(SIMULATOR)

ifneq ($(shell uname),Darwin)
$(error iOS 应用只能在 macOS 上编译，请把仓库克隆到 Mac 后运行 make)
endif

.PHONY: all setup gen build run device clean check-xcode

all: build

check-xcode:
	@xcode-select -p 2>/dev/null | grep -qv CommandLineTools || { \
	  echo ""; \
	  echo "编译 iOS 应用需要完整的 Xcode，当前只有命令行工具。"; \
	  echo "  已装 Xcode： sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"; \
	  echo "               sudo xcodebuild -license accept"; \
	  echo "  未装 Xcode： 从 App Store 安装 Xcode 后再执行上面两行"; \
	  echo ""; \
	  exit 1; }
	@test -d /Library/Developer/PrivateFrameworks/CoreSimulator.framework || { \
	  echo ""; \
	  echo "Xcode 首次启动组件未安装（缺 CoreSimulator），请执行："; \
	  echo "  sudo xcodebuild -runFirstLaunch"; \
	  echo "  xcodebuild -downloadPlatform iOS   # 下载 iOS 模拟器运行时"; \
	  echo ""; \
	  exit 1; }

setup:
	@command -v brew >/dev/null 2>&1 || { echo "请先安装 Homebrew: https://brew.sh"; exit 1; }
	@command -v xcodegen >/dev/null 2>&1 || brew install xcodegen
	@echo "依赖就绪"

# 每次都重新生成工程：新增/删除源文件后工程文件清单才会更新，xcodegen 幂等且秒级
gen:
	xcodegen generate

build: check-xcode gen
	@test -n "$(SIMULATOR)" || { \
	  echo "未找到可用 iPhone 模拟器。安装：xcodebuild -downloadPlatform iOS"; \
	  echo "或手动指定：make run SIMULATOR=\"iPad (A16)\""; \
	  exit 1; }
	@echo "==> 使用模拟器: $(SIMULATOR)"
	xcodebuild -project $(APP).xcodeproj -scheme $(APP) \
	  -configuration Debug -destination '$(DESTINATION)' \
	  -derivedDataPath $(BUILD_DIR) build

run: build
	xcrun simctl boot "$(SIMULATOR)" 2>/dev/null || true
	open -a Simulator
	xcrun simctl install booted "$(APP_PATH)"
	xcrun simctl launch booted $(BUNDLE_ID)

device: check-xcode gen
	@test -n "$(TEAM_ID)" || { echo "用法: make device TEAM_ID=XXXXXXXXXX（Apple 开发者团队 ID）"; exit 1; }
	xcodebuild -project $(APP).xcodeproj -scheme $(APP) \
	  -configuration Debug -destination 'generic/platform=iOS' \
	  -derivedDataPath $(BUILD_DIR) \
	  DEVELOPMENT_TEAM=$(TEAM_ID) -allowProvisioningUpdates build

clean:
	rm -rf $(BUILD_DIR) $(APP).xcodeproj
