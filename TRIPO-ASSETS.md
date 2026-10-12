# Tripo 자산 생성 계획 / 확인일 2026-10-12

현재 상태: Tripo 사이트에 접근했으나 로그인 화면이 표시됨. Tripo 생성 요청은 실행하지 않았고 credits를 사용하지 않았음. 배포된 모델은 make-assets.py로 직접 만든 원본 GLB. API 키·로그인 정보는 저장소에 없음.

## 준비된 프롬프트
- car: Realistic unbranded automotive sedan body in white, 4.5m long, vehicle body for an automotive assembly line, clean industrial PBR surfaces, separate wheels, no scene, no text, origin at bottom center, +X forward, Y up, GLB.
- robot: Industrial six-axis articulated spot-welding robot, orange paint, pedestal base, visible shoulder elbow wrist, separate rigid joint parts, 2m tall, unbranded, no surrounding scene, PBR, bottom center pivot, Y up, GLB. Generated geometry is visual only, not calibrated robot kinematics.
- humanoid: Industrial humanoid robot for factory material handling, white silver torso, dark joint covers, biped, neutral A pose, 1.75m tall, separate limbs, no brand no pedestal no scene, bottom center pivot, Y up, GLB.
- amr: Low-profile autonomous mobile robot with rectangular green-gray chassis, four wheels, lidar housing, flat cargo deck, 1.2m long, unbranded factory logistics vehicle, no scene, bottom center pivot, Y up, GLB.

## 교체
웹의 모델 종류 선택 → GLB 파일 선택. 텍스처가 내장된 단일 GLB, 30MB 이하. 크기는 자동 정규화. 현재 세션에만 적용된다. 영구 교체는 저장소의 car.glb / robot.glb / humanoid.glb / amr.glb를 교체하고 배포한다. 산업용 로봇은 현재 관절별 절차적 애니메이션을 사용하므로 하나의 GLB로 교체하면 강체 외형이 된다. 실제 관절 애니메이션을 유지하려면 부품별 리깅과 이름 매핑이 필요하다. Draco/KTX2 등 외부 디코더를 요구하는 압축 모델은 기본 지원하지 않음.

공식 근거: https://developers.tripo3d.ai/en/docs/introduction (API 인증 필요), https://docs.tripo3d.ai/export/conversion.html (모델 포맷 변환). 생성 전 계정 credits와 다운로드/공개 사용 조건 확인 필요.
