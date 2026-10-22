# webOS TV 26 Simulator — caminho padrão em Documentos do Windows
SIMULATOR_PATH ?= $(USERPROFILE)/Documents/webOS_TV_26_Simulator_1.5.0
SIMULATOR_VERSION ?= 26
DEVICE ?= minhatv
APP_ID := br.jonis.launcher
VERSION := 1.0.0
IPK := $(APP_ID)_$(VERSION)_all.ipk

# No Windows, o make (ezwinports) tenta bash/WSL; preferimos PowerShell/cmd.
ifeq ($(OS),Windows_NT)
  PS := powershell -NoProfile -ExecutionPolicy Bypass -File
  ARES_LAUNCH := node_modules\.bin\ares-launch.cmd
  ARES_PACKAGE := node_modules\.bin\ares-package.cmd
  ARES_INSTALL := node_modules\.bin\ares-install.cmd
else
  PS :=
  ARES_LAUNCH := ./node_modules/.bin/ares-launch
  ARES_PACKAGE := ./node_modules/.bin/ares-package
  ARES_INSTALL := ./node_modules/.bin/ares-install
endif

.PHONY: help install dev build test lint format sim package deploy clean

help:
	@echo ""
	@echo "Targets disponiveis:"
	@echo "  make install  - npm install"
	@echo "  make dev      - servidor Vite"
	@echo "  make build    - build + copia webos/* para dist"
	@echo "  make test     - Vitest"
	@echo "  make lint     - ESLint"
	@echo "  make sim      - build e abre no webOS TV $(SIMULATOR_VERSION) Simulator"
	@echo "  make package  - gera .ipk"
	@echo "  make deploy   - instala e lanca na TV ($(DEVICE))"
	@echo "  make clean    - remove dist e *.ipk"
	@echo ""
	@echo "Simulator: $(SIMULATOR_PATH)"
	@echo ""

install:
	npm install

dev:
	npm run dev

build:
	npm run build

test:
	npm run test

lint:
	npm run lint

format:
	npm run format

# Build + lanca no Simulator oficial (sem .ipk)
ifeq ($(OS),Windows_NT)
sim:
	$(PS) scripts/sim.ps1
else
sim: build
	SIMULATOR_PATH="$(SIMULATOR_PATH)" $(ARES_LAUNCH) -s $(SIMULATOR_VERSION) -sp "$(SIMULATOR_PATH)" dist
endif

ifeq ($(OS),Windows_NT)
package: build
	$(ARES_PACKAGE) dist

deploy: package
	$(ARES_INSTALL) --device $(DEVICE) $(IPK)
	$(ARES_LAUNCH) --device $(DEVICE) $(APP_ID)

clean:
	powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Test-Path dist) { Remove-Item -Recurse -Force dist }; Remove-Item -Force -ErrorAction SilentlyContinue *.ipk"
else
package: build
	$(ARES_PACKAGE) dist

deploy: package
	$(ARES_INSTALL) --device $(DEVICE) $(IPK)
	$(ARES_LAUNCH) --device $(DEVICE) $(APP_ID)

clean:
	rm -rf dist
	rm -f *.ipk
endif
