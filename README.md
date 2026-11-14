<img width="2208" height="512" alt="ivLyrics 한국어 배너" src="https://github.com/ivLis-Studio/ivLyrics/blob/main/preview_readme_ko.png?raw=true" /><br>
PLATFORM : <a href="https://github.com/ivLis-Studio/ivLyrics">PC</a> | <a href="https://github.com/ivLis-Studio/ivLyrics-Android">Android</a> | <a href="https://github.com/ivLis-Studio/ivLyrics-IOS">iOS</a><br>
MODULE : <a href="https://github.com/ivLis-Studio/ivLyrics-overlay">Overlay</a> | <a href="https://github.com/ivLis-Studio/ivLyrics-helper">Helper</a>

[한국어](README.md) | [English](README_EN.md)

# ivLyrics Overlay

Spotify 밖에서도 현재 곡의 가사를 볼 수 있도록, 다른 창 위에 가사를 띄우는 데스크탑 앱입니다. 같은 컴퓨터에서 실행 중인 [PC용 ivLyrics](https://github.com/ivLis-Studio/ivLyrics)로부터 가사와 재생 정보를 받습니다.

별도 가사 창이 필요할 때 선택해서 설치하세요. Spotify 안에서 ivLyrics를 사용하는 데 필수는 아니며, [ivLyrics Helper](https://github.com/ivLis-Studio/ivLyrics-helper)를 함께 설치할 필요도 없습니다. Helper는 로컬 영상 재생과 다른 프로그램의 가사 연동을 위한 별도 앱입니다.

## 할 수 있는 일

- 원어·발음·번역 가사와 곡 정보, 앨범 아트를 원하는 조합으로 표시합니다.
- 현재 줄과 이전·다음 줄을 표시하고, 음절 타이밍이 있는 가사는 노래방 효과로 보여줍니다.
- 프리셋, 글꼴, 색상, 배경 투명도, 정렬을 조절합니다.
- 가사 창을 잠가 아래쪽 창을 클릭하거나, 잠금을 풀고 원하는 위치로 옮깁니다.

가사·번역·발음 데이터는 PC용 ivLyrics에서 준비되어야 합니다. Overlay가 직접 가사를 찾거나 번역을 생성하지는 않습니다.

## 다운로드와 준비 사항

[최신 버전 다운로드](https://github.com/ivLis-Studio/ivLyrics-overlay/releases/latest) · [릴리스 기록](https://github.com/ivLis-Studio/ivLyrics-overlay/releases)

릴리스의 **Assets**에서 컴퓨터에 맞는 설치 파일 하나를 받으세요.

| 컴퓨터 | 설치 파일 | 설치 방법 |
| --- | --- | --- |
| Windows x64 | `lyrics-plus-overlay_…_x64-setup.exe` 또는 `…_x64_en-US.msi` | 설치 파일을 실행하고 안내를 따르세요. |
| macOS Apple Silicon | `lyrics-plus-overlay_…_aarch64.dmg` | DMG를 열어 앱을 응용 프로그램 폴더로 복사한 뒤 실행하세요. |

최신 공개 릴리스에는 Intel Mac·Linux·모바일용 설치 파일이 없습니다. 배포 파일과 앱 이름에 남아 있는 `lyrics-plus-overlay` 또는 `Lyrics Plus Overlay`는 이 앱을 가리킵니다. `latest.json`, `.sig`, `.app.tar.gz`는 업데이트용 파일이므로 일반 설치에는 위 설치 파일을 사용하세요.

Spotify 데스크탑 앱과 PC용 ivLyrics를 먼저 같은 컴퓨터에 설치하세요. ivLyrics 설치는 [PC 안내](https://github.com/ivLis-Studio/ivLyrics#readme)를 참고하세요. 배포된 Overlay 설치 파일을 사용하는 데 Node.js나 Rust는 필요하지 않습니다.

## 처음 실행하고 연결하기

1. 설치한 Overlay를 실행하세요. 처음 열리는 안내에서 **시작하기**를 누르고, 언어·표시 요소·스타일을 선택한 뒤 **사용 시작**을 누르세요.
2. Spotify에서 ivLyrics를 열고 **설정 → 일반 → 데스크탑 오버레이**로 이동하세요.
3. **데스크탑 오버레이 사용**을 켜세요. **연결 포트**는 기본값 `15000`을 사용합니다.
4. 노래를 재생하고 ivLyrics에 가사가 불러와졌는지 확인하세요. PC 설정에 **✓ 연결됨**이 표시되고, 동기화 가사가 있는 곡이면 별도 가사 창에 현재 가사가 나타납니다.

두 앱은 같은 컴퓨터에서 실행해야 합니다. 휴대폰이나 다른 컴퓨터의 Spotify와 연결하는 절차는 지원하지 않습니다.

### 연결 포트를 바꿔야 할 때

보통은 기본값을 유지하세요. `15000`을 다른 프로그램이 사용 중인 경우에는 다음과 같이 두 곳을 맞추세요.

1. Overlay의 **설정 → 고급 → 서버 포트**에서 사용하지 않는 `1024–65535` 범위의 번호를 입력하세요.
2. **적용**을 누르고 재시작 안내를 확인하세요.
3. PC용 ivLyrics의 **설정 → 일반 → 데스크탑 오버레이 → 연결 포트**에 같은 번호를 입력하고 Enter를 누르세요.

Helper의 기본 포트 `15123`과는 별개입니다. Helper도 실행 중이라면 해당 포트를 Overlay에 지정하지 마세요.

## 사용하기

Windows 알림 영역이나 macOS 메뉴 막대의 앱 아이콘에서 **설정**을 열 수 있습니다. 아래에서는 이 아이콘 메뉴를 트레이라고 부릅니다.

- **위치 이동:** 트레이의 **잠금 전환**으로 잠금을 푼 뒤, 가사 창의 버튼이 아닌 영역을 드래그하세요. 다시 잠그면 아래쪽 창으로 클릭이 전달됩니다. 기본 설정에서는 마우스를 가사 창 위에 잠시 멈춰 두어도 잠금을 풀 수 있고, 이동을 멈추면 자동으로 다시 잠깁니다. 시간과 동작은 **동작** 탭에서 조절하세요.
- **표시 조절:** **프리셋**으로 시작하고, **요소**에서 원어·발음·번역 및 이전·다음 가사 수를 선택하세요. **타이포그래피**, **색상**, **레이아웃**에서 모양을 조절할 수 있습니다.
- **표시 조건:** **동작 → 일시정지 시 숨기기**, **마우스 오버 시 표시**, **다음 곡 미리보기**를 필요에 맞게 설정하세요.
- **시작과 종료:** **고급**에서 **시작 시 자동 실행**과 **트레이에서 시작**을 설정하세요. 앱을 완전히 종료하려면 트레이의 **종료**를 선택하세요.

설정은 변경 시 저장됩니다. **고급 → 테마 관리**에서 설정을 JSON 파일로 내보내거나 가져올 수도 있습니다. 언어를 바꾼 뒤 트레이 메뉴가 이전 언어로 보이면 앱을 다시 실행하세요.

## 업데이트

앱은 시작할 때 새 버전을 확인합니다. 직접 확인하려면 **설정 → 고급 → 업데이트 확인**을 누르세요. 새 버전 안내에서 설치를 선택하면 다운로드 후 앱을 다시 시작합니다.

업데이트에 실패하면 안내의 **다운로드 페이지 열기**를 누르거나 [최신 릴리스](https://github.com/ivLis-Studio/ivLyrics-overlay/releases/latest)에서 설치 파일을 받으세요. 트레이의 **종료**로 앱을 닫고 새 설치 파일로 설치한 뒤 다시 실행하세요.

## 문제가 있을 때

| 증상 | 확인할 내용 |
| --- | --- |
| PC에서 연결 안됨으로 표시되거나 가사 창이 비어 있습니다. | Overlay와 PC용 ivLyrics가 같은 컴퓨터에서 실행 중인지, **데스크탑 오버레이 사용**이 켜져 있는지, 양쪽 포트가 같은지 확인하세요. Spotify에서 ivLyrics를 열고 곡을 다시 재생해 보세요. |
| 곡 정보만 나오고 가사가 없습니다. | 시간 정보가 없는 일반 가사는 Overlay에 표시되지 않습니다. PC용 ivLyrics에서 해당 곡의 동기화 가사가 준비되었는지 확인하세요. |
| 번역·발음 또는 노래방 효과가 없습니다. | **요소**의 표시 옵션과 PC용 ivLyrics의 데이터를 확인하세요. 번역·발음은 전달된 데이터가 있어야 하며, 노래방 효과는 음절 타이밍이 필요합니다. |
| 가사 창을 옮길 수 없거나 화면 밖으로 나갔습니다. | 트레이의 **잠금 전환**으로 잠금을 풀거나 **위치 초기화**를 선택하세요. |
| 가사 창이 사라지거나 마우스를 올리면 흐려집니다. | **동작**의 일시정지·마우스 오버 설정을 확인하세요. PC용 ivLyrics에서 재생 정보가 한동안(재생 중 약 5초, 일시정지 중 약 20초) 오지 않아도 창이 숨겨지므로 연결 상태도 확인하세요. |

## 다른 프로그램에서 가사 보내기

PC용 ivLyrics 외의 프로그램도 같은 로컬 연결로 가사를 보낼 수 있습니다.

- `POST /lyrics`: 곡 정보와 가사 (`trackUri`, `track`, `lyrics`, `isSynced`)
- `POST /progress`: 재생 위치 (`trackUri`, `position`, `isPlaying`)
- `GET /status`: 연결 확인. 표시 상태는 바뀌지 않습니다.

여러 프로그램이 동시에 보내면 재생 중인 프로그램의 가사를 표시합니다. 둘 이상이 재생 중이면 마지막으로 재생을 시작한 프로그램을 표시하고, 일시정지된 프로그램은 다른 프로그램의 가사를 지우지 않습니다. 요청에 `source`(프로그램 이름)를 넣으면 응답으로 표시 여부를 알려 주고, `heartbeatMs`(변화가 없을 때 재생 정보를 다시 보내는 간격)를 넣으면 그 간격의 약 두 배 동안 창을 유지합니다. 이름이 없는 요청은 요청 출처로 구분합니다.

## 데이터와 제한 사항

가사·곡 정보·재생 위치는 같은 컴퓨터의 로컬 연결(`127.0.0.1`, 기본 포트 `15000`)로 전달됩니다. 표시 설정은 컴퓨터에 저장됩니다. 업데이트 확인에는 GitHub를 사용하며, 앨범 아트와 아이콘을 불러올 때도 외부 서버에 연결할 수 있습니다.

로컬 연결에는 별도 인증이 없고 요청 출처를 제한하지 않습니다. 연결 포트를 외부에 공개하지 마세요. 가사 제공, 번역·발음 생성과 인터넷 연결 요건은 PC용 ivLyrics 및 선택한 제공자의 영향을 받습니다.

## 문의와 관련 프로젝트

[Discord](https://discord.gg/2fu36fUzdE) 또는 [GitHub Issues](https://github.com/ivLis-Studio/ivLyrics-overlay/issues)로 문의하세요. 운영체제와 CPU 종류, Overlay·PC용 ivLyrics 버전, 문제가 생긴 곡과 재현 절차를 함께 알려주시면 확인에 도움이 됩니다.

[PC용 ivLyrics](https://github.com/ivLis-Studio/ivLyrics) · [Android](https://github.com/ivLis-Studio/ivLyrics-Android) · [iOS](https://github.com/ivLis-Studio/ivLyrics-IOS) · [ivLyrics Helper](https://github.com/ivLis-Studio/ivLyrics-helper)

이 앱은 [Tauri](https://tauri.app/)와 [React](https://react.dev/)를 사용합니다.

<details>
<summary>직접 빌드하거나 기여하고 싶어요</summary>

직접 빌드할 때에는 Node.js와 Rust 환경이 필요합니다. 일반 사용자는 위의 설치 파일을 이용하면 됩니다. 실행·빌드 명령은 [패키지 스크립트](package.json), 데스크톱 앱 설정은 [Tauri 설정](src-tauri/tauri.conf.json)을 참고하세요.

</details>
