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
SIMULATOR   ?= iPhone 16
BUILD_DIR   := build
APP_PATH    := $(BUILD_DIR)/Build/Products/Debug-iphonesimulator/$(APP).app
DESTINATION := platform=iOS Simulator,name=$(SIMULATOR)

ifneq ($(shell uname),Darwin)
$(error iOS 应用只能在 macOS 上编译，请把仓库克隆到 Mac 后运行 make)
endif

.PHONY: all setup gen build run device clean

all: build

setup:
	@command -v brew >/dev/null 2>&1 || { echo "请先安装 Homebrew: https://brew.sh"; exit 1; }
	@command -v xcodegen >/dev/null 2>&1 || brew install xcodegen
	@echo "依赖就绪"

$(APP).xcodeproj/project.pbxproj: project.yml
	xcodegen generate

gen: $(APP).xcodeproj/project.pbxproj

build: gen
	xcodebuild -project $(APP).xcodeproj -scheme $(APP) \
	  -configuration Debug -destination '$(DESTINATION)' \
	  -derivedDataPath $(BUILD_DIR) build

run: build
	xcrun simctl boot "$(SIMULATOR)" 2>/dev/null || true
	open -a Simulator
	xcrun simctl install booted "$(APP_PATH)"
	xcrun simctl launch booted $(BUNDLE_ID)

device: gen
	@test -n "$(TEAM_ID)" || { echo "用法: make device TEAM_ID=XXXXXXXXXX（Apple 开发者团队 ID）"; exit 1; }
	xcodebuild -project $(APP).xcodeproj -scheme $(APP) \
	  -configuration Debug -destination 'generic/platform=iOS' \
	  -derivedDataPath $(BUILD_DIR) \
	  DEVELOPMENT_TEAM=$(TEAM_ID) -allowProvisioningUpdates build

clean:
	rm -rf $(BUILD_DIR) $(APP).xcodeproj
