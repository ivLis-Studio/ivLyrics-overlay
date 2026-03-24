의존성 프로그램입니다.
메인 프로젝트는 https://github.com/ivLis-Studio/lyrics-plus 를 참고하세요

## 시작하기 (Getting Started)

이 프로젝트는 [Tauri](https://tauri.app/)를 기반으로 한 오버레이 애플리케이션입니다. 개발을 위해서는 Rust와 Node.js 환경이 필요합니다.

### 필수 요구사항 (Prerequisites)

1. **Node.js**: 최신 LTS 버전을 권장합니다.
2. **Rust**: Tauri 백엔드 빌드를 위해 필요합니다.
   - 터미널에서 다음 명령어로 설치할 수 있습니다:
     ```bash
     curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
     ```
   - 설치 후 터미널을 재시작하거나 `source $HOME/.cargo/env`를 실행해야 합니다.

### 설치 및 실행 (Installation & Run)

1. 의존성 패키지 설치:

   ```bash
   npm install
   ```

2. 개발 모드로 실행 (Frontend + Backend):

   ```bash
   npm run dev
   ```

3. 프로덕션 빌드:
   ```bash
   npm run build:app
   ```

### 문제 해결 (Troubleshooting)

- **Rust가 설치되어 있지 않음**: `npm run tauri info` 명령어로 환경을 확인할 수 있습니다. Rust가 없다면 위 안내에 따라 설치해주세요.
- **포트 충돌**: 이 앱은 로컬 서버(15000 포트)를 사용합니다. 해당 포트가 사용 중인지 확인해주세요.
