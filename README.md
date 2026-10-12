# 자동차 스마트팩토리 3D 월드

공정: 입고 → 차체 용접 → 도장 → 최종 조립 → 검사 → 출하.
산업용 로봇 8대, 휴머노이드 2대, AMR 3대, 부품 랙, 공장 골조, 작업 셀, 안전 펜스, 컨베이어를 포함합니다.

## 웹
배포 주소: https://automotive-factory-twin-world.starrybat1.chatgpt.site
사이트는 본인 계정용입니다. GitHub 저장소는 공개입니다.

## 설치·실행
Python 3 또는 정적 서버, Node 18+는 테스트용입니다. Three.js 0.180.0 파일과 GLTFLoader를 동봉했으므로 npm install 및 CDN이 필요하지 않습니다.
```bash
python -m http.server 8000
# http://localhost:8000 열기
node test.mjs
```
file://로 직접 열면 모듈/GLB 로딩이 제한될 수 있어 HTTP 서버를 사용합니다.

## 사용법
드래그/터치 회전, 휠 확대. 전체/라인/평면 카메라. 작업 시간·투입 간격·목표 설정 후 초기화. 공정 정지 선택 시 해당 공정이 멈추고 upstream에 대기열이 쌓입니다. 재생 속도 1/3/8배, 일시정지. CSV는 최대 최근 10,000개 시간 샘플.

## 모델 출처
car.glb, robot.glb, humanoid.glb, amr.glb는 직접 작성한 절차적 기본 3D 모델이며 Tripo 생성 모델이 아닙니다. Tripo 로그인 차단으로 실제 생성은 미완료. TRIPO-ASSETS.md의 프롬프트와 웹 GLB 교체 기능을 제공합니다. 자산은 단일 내장 텍스처 GLB를 권장합니다. 모델 교체는 세션에만 유지됩니다.

## 시뮬레이션 설계
공정당 처리 서버 1개, buffer 3대, 고정 cycle, 결정적 순서. 후공정부터 처리하여 한 step에서 여러 공정을 건너뛰지 않습니다. 투입=공정내+출하 차량 보존을 검사합니다. 시간·설비·배치는 가상 예제입니다. AMR과 휴머노이드 작업은 시각적 애니메이션이며 자재 가용성에 영향을 주지 않습니다. 생산 capacity 계산에 로봇 대수를 사용하는 모델이 아닙니다.

## 입력과 출력
기본 cycle=8초, arrival=5초, target=40대. CSV 열: time_s,wip,shipped,temperature_c,robot_current_a,synthetic. 온도·전류는 시각화용 가상 센서 파형이며 장비 물리 모델에서 파생되지 않습니다. 샘플 입력과 출력 CSV 포함.

## 검증·한계
VALIDATION.txt: 생산 보존, buffer 한계, 정지/복구, 입력 오류, deterministic repeat, GLB 형식 검사. 실제 제조, 실장비 제어, 물리 충돌, inverse kinematics, 안전 동선, 실측 예지보전 검증은 포함하지 않습니다.

Three.js MIT 사용 고지는 THREE-LICENSE.txt. 원본 공장 코드와 절차적 자산은 LICENSE(MIT).
