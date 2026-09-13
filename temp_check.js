
    // --- DOM要素 ---
    const appLayout = document.getElementById('appLayout');
    const cameraBox = document.getElementById('cameraBox');
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('output');
    const ctx = canvas.getContext('2d');
    const placeholder = document.getElementById('placeholder');
    const startBtn = document.getElementById('startBtn');
    const activeCameraBadge = document.getElementById('activeCameraBadge');

    // キャリブレーションUI
    const calibBadge = document.getElementById('calibBadge');
    const calib3sBtn = document.getElementById('calib3sBtn');
    const calibFullBtn = document.getElementById('calibFullBtn');
    const calibOverlay = document.getElementById('calibOverlay');
    const calibCountdown = document.getElementById('calibCountdown');
    const calibProgressBox = document.getElementById('calibProgressBox');
    const calibProgressBar = document.getElementById('calibProgressBar');
    const calibInstruction = document.getElementById('calibInstruction');
    const calibSubInstruction = document.getElementById('calibSubInstruction');

    // 画面サイズボタン
    const sizeStdBtn = document.getElementById('sizeStdBtn');
    const sizeLgBtn = document.getElementById('sizeLgBtn');
    const sizeFullWidthBtn = document.getElementById('sizeFullWidthBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');

    // カメラボタン
    const switchCamBtn = document.getElementById('switchCamBtn');
    const mirrorToggleBtn = document.getElementById('mirrorToggleBtn');
    const camText = document.getElementById('camText');

    // メーター要素
    const phaseDisplay = document.getElementById('phaseDisplay');
    const velocityDisplay = document.getElementById('velocityDisplay');
    const tutDisplay = document.getElementById('tutDisplay');
    const repDisplay = document.getElementById('repDisplay');
    const fsPhase = document.getElementById('fsPhase');
    const fsVelocity = document.getElementById('fsVelocity');
    const fsTut = document.getElementById('fsTut');
    const fsRep = document.getElementById('fsRep');
    const hudMarkerStatus = document.getElementById('hudMarkerStatus');
    const hudStatusText = document.getElementById('hudStatusText');
    const hudVelocityTag = document.getElementById('hudVelocityTag');

    // 設定要素
    const smoothingRange = document.getElementById('smoothingRange');
    const smoothingVal = document.getElementById('smoothingVal');
    const trackHipBtn = document.getElementById('trackHipBtn');
    const trackShoulderBtn = document.getElementById('trackShoulderBtn');
    const toggleGuideBtn = document.getElementById('toggleGuideBtn');
    const resetRepBtn = document.getElementById('resetRepBtn');

    // 評価モード！E��ィードバチE��要素
    const modeHypertrophyBtn = document.getElementById('modeHypertrophyBtn');
    const modePowerBtn = document.getElementById('modePowerBtn');
    const evalTargetDesc = document.getElementById('evalTargetDesc');
    const evalModeShortTag = document.getElementById('evalModeShortTag');
    const ratingDisplay = document.getElementById('ratingDisplay');
    const fsRating = document.getElementById('fsRating');
    const repFeedbackPopup = document.getElementById('repFeedbackPopup');
    const popupBadge = document.getElementById('popupBadge');
    const popupTime = document.getElementById('popupTime');
    const statGreatCount = document.getElementById('statGreatCount');
    const statGoodCount = document.getElementById('statGoodCount');
    const statOkCount = document.getElementById('statOkCount');
    const repHistoryList = document.getElementById('repHistoryList');

    // --- カメラ�E�E��作状慁E---
    let currentFacingMode = 'user';
    let isMirror = true;
    let isCameraRunning = false;
    let currentStream = null;
    let poseDetector = null;
    let isPoseProcessing = false;
    let latestPoseResults = null;
    let isModelLoaded = false;

    // --- トラチE��ング�E�E��レ防止フィルタ ---
    let trackingTarget = 'hip';
    let showCenterGuide = true;
    let smoothAlpha = 0.25;

    // スムージング用バッファ
    let smoothedTrackPoint = null;
    let smoothedLandmarks = null;
    let smoothedVelocity = 0;

    // --- キャリブレーション状慁E---
    let isCalibrated = false;
    let calibratedTopY = null;
    let calibratedHeight = null;
    let calibratedCenterX = null;

    let calibMode = null;
    let calibTimer = null;
    let calibStableFrames = 0;
    const REQUIRED_STABLE_FRAMES = 8; // 紁E.2、E.3秒で満タンになる趁E��速仕槁E    let poseProcessStartTime = 0;
    let calibSnapshotLm = null;

    // --- 厳寁E��レチE�E数判定スチE�Eト�Eシン ---
    let motionState = 'TOP';
    let topBaselineY = null;
    let bottomY = null;
    let minDisplacement = 35;
    let eccentricStartTime = 0;
    let repCount = 0;
    let lastRepTime = 0;
    let isWarning = false;

    // 評価モード！E��歴用スチE�EチE    let currentEvalMode = 'HYPERTROPHY'; // 'HYPERTROPHY' | 'POWER'
    let lastCompletedTut = 0;
    let repHistory = [];
    let statCounts = { GREAT: 0, GOOD: 0, OK: 0 };

    const VELOCITY_MOVE_THRESHOLD = 25;
    const MAX_ALLOWED_ECC_VELOCITY = 240;

    // Web Audio API
    let audioCtx = null;
    function playBeep(freq = 440, type = 'sine', duration = 0.1) {
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
        osc.stop(audioCtx.currentTime + duration);
      } catch (e) {
        console.warn(e);
      }
    }

    // 評価サウンチE    function playGreatSound() {
      playBeep(523.25, 'sine', 0.08); // C5
      setTimeout(() => playBeep(659.25, 'sine', 0.08), 90); // E5
      setTimeout(() => playBeep(783.99, 'sine', 0.18), 180); // G5
    }
    function playGoodSound() {
      playBeep(587.33, 'sine', 0.1); // D5
      setTimeout(() => playBeep(880, 'sine', 0.16), 110); // A5
    }
    function playOkSound() {
      playBeep(440, 'sine', 0.15); // A4
    }

    // 評価判定ロジチE��
    // 筋肥大: 2~3s => GREAT, ±0.5s (1.5~2.0s未満 また�E 3.0~3.5s以丁E => GOOD, それ以夁E=> OK
    // 瞬発劁E 1秒以冁E(<=1.0s) => GREAT, それ以夁E(>1.0s) => GOOD
    function evaluateRep(tutSeconds) {
      let rating = 'OK';
      let badgeClass = 'badge-ok';

      if (currentEvalMode === 'HYPERTROPHY') {
        if (tutSeconds >= 2.0 && tutSeconds <= 3.0) {
          rating = 'GREAT';
          badgeClass = 'badge-great';
        } else if ((tutSeconds >= 1.5 && tutSeconds < 2.0) || (tutSeconds > 3.0 && tutSeconds <= 3.5)) {
          rating = 'GOOD';
          badgeClass = 'badge-good';
        } else {
          rating = 'OK';
          badgeClass = 'badge-ok';
        }
      } else {
        // 瞬発力モーチE        if (tutSeconds <= 1.0) {
          rating = 'GREAT';
          badgeClass = 'badge-great';
        } else {
          rating = 'GOOD';
          badgeClass = 'badge-good';
        }
      }
      return { rating, badgeClass };
    }

    // レチE�E評価UIおよび演�Eの更新
    function updateRepEvaluationUI(count, tutSeconds) {
      const { rating, badgeClass } = evaluateRep(tutSeconds);

      // 統計集訁E      if (statCounts[rating] !== undefined) {
        statCounts[rating]++;
      }
      statGreatCount.innerText = statCounts.GREAT;
      statGoodCount.innerText = statCounts.GOOD;
      statOkCount.innerText = statCounts.OK;

      // ダチE��ュボ�Eド更新
      ratingDisplay.innerHTML = `<span class="eval-badge ${badgeClass}">${rating}</span><span class="eval-sub-time">${tutSeconds.toFixed(1)}s</span>`;
      fsRating.innerText = rating;
      fsRating.className = `eval-badge ${badgeClass}`;

      // カメラ映像上�EポップアチE�E演�E
      popupBadge.className = `popup-badge-inner ${badgeClass}`;
      popupBadge.innerText = `${rating}!`;
      popupTime.innerText = `遠忁E��: ${tutSeconds.toFixed(1)}s`;
      repFeedbackPopup.classList.remove('animate');
      void repFeedbackPopup.offsetWidth; // 強制リフロー
      repFeedbackPopup.classList.add('animate');

      // サウンド�E甁E      if (rating === 'GREAT') playGreatSound();
      else if (rating === 'GOOD') playGoodSound();
      else playOkSound();

      // 履歴追加
      addRepHistoryItem(count, tutSeconds, rating, badgeClass);
    }

    function addRepHistoryItem(count, tutSeconds, rating, badgeClass) {
      repHistory.unshift({ count, tut: tutSeconds, rating, badgeClass, mode: currentEvalMode });
      if (repHistory.length > 30) repHistory.pop();
      renderRepHistoryList();
    }

    function renderRepHistoryList() {
      if (repHistory.length === 0) {
        repHistoryList.innerHTML = '<div class="history-empty">レチE�E完亁E��にここに履歴が表示されまぁE/div>';
        return;
      }
      repHistoryList.innerHTML = repHistory.map(item => `
        <div class="history-item">
          <span class="history-rep-num">#${item.count}</span>
          <span class="history-time">${item.tut.toFixed(1)}s</span>
          <span class="history-badge ${item.badgeClass}">${item.rating}</span>
        </div>
      `).join('');
    }

    // 評価モード�E替処琁E    function switchEvalMode(mode) {
      currentEvalMode = mode;
      if (mode === 'HYPERTROPHY') {
        modeHypertrophyBtn.classList.add('active');
        modePowerBtn.classList.remove('active');
        evalTargetDesc.innerText = "目樁E 遠忁E�� 2.0、E.0s (±0.5s許容)";
        evalModeShortTag.innerText = "筋肥大";
      } else {
        modePowerBtn.classList.add('active');
        modeHypertrophyBtn.classList.remove('active');
        evalTargetDesc.innerText = "目樁E 遠忁E�� ≤1.0s (瞬発刁E��返し)";
        evalModeShortTag.innerText = "瞬発劁E;
      }
    }
    modeHypertrophyBtn.addEventListener('click', () => switchEvalMode('HYPERTROPHY'));
    modePowerBtn.addEventListener('click', () => switchEvalMode('POWER'));

    // --- MediaPipe Pose初期匁E---
    function initPose() {
      if (poseDetector) return;
      if (typeof Pose === 'undefined') {
        console.warn('Pose library is not loaded yet');
        return;
      }
      try {
        const isOffline = !navigator.onLine && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
        poseDetector = new Pose({
          locateFile: (file) => {
            if (isOffline) {
              return `./mediapipe/${file}`;
            }
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
          }
        });

        poseDetector.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        poseDetector.onResults(onPoseResults);
      } catch (err) {
        console.error("Failed to init Pose:", err);
      }
    }

    // --- カメラ起動（縦横比�E強制歪みを排除�E�E---
    async function startCamera() {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }

      // 固定�E幁E�E高さを強制せず、端末の自然な向き�E�縦持ちなら縦長�E�で取得（以前�E正常動作設定！E      const constraints = {
        video: {
          facingMode: currentFacingMode
        },
        audio: false
      };

      try {
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.muted = true;
        video.srcObject = currentStream;
        await video.play();

        // 映像寸法を即時反映
        if (video.videoWidth > 0) {
          updateCanvasDimensions(video.videoWidth, video.videoHeight);
        }
        video.onloadedmetadata = () => {
          updateCanvasDimensions(video.videoWidth, video.videoHeight);
        };

        isCameraRunning = true;
        placeholder.classList.add('hidden');
        updateCameraUI();

        // カメラ接続後にPose検�E器を�E期化
        try {
          initPose();
        } catch (poseErr) {
          console.warn("Pose init deferred:", poseErr);
        }

        processVideoLoop();
      } catch (err) {
        console.error("Camera Error:", err);
        alert("カメラの起動に失敗しました: " + (err.message || err.name));
      }
    }

    // 解像度とアスペクト比を同期�E�歪み・つぶれを防止�E�E    function updateCanvasDimensions(w, h) {
      if (!w || !h) return;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        // コンチE��にもアスペクト比を設宁E        cameraBox.style.aspectRatio = `${w} / ${h}`;
      }
    }

    function updateCameraUI() {
      const isFront = (currentFacingMode === 'user');
      camText.innerText = isFront ? "背面カメラへ" : "インカメへ";
      activeCameraBadge.innerText = `カメラ: ${isFront ? "インカメラ" : "背面カメラ"}`;
      mirrorToggleBtn.classList.toggle('active', isMirror);
    }

    // カメラ刁E��
    switchCamBtn.addEventListener('click', async () => {
      currentFacingMode = (currentFacingMode === 'user') ? 'environment' : 'user';
      isMirror = (currentFacingMode === 'user');
      updateCameraUI();
      if (isCameraRunning) await startCamera();
    });

    // ミラー刁E��
    mirrorToggleBtn.addEventListener('click', () => {
      isMirror = !isMirror;
      mirrorToggleBtn.classList.toggle('active', isMirror);
    });

    // 開始�Eタン
    startBtn.addEventListener('click', () => {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      startCamera();
    });

    // 画面サイズ刁E��
    function setAppSize(mode) {
      sizeStdBtn.classList.remove('active');
      sizeLgBtn.classList.remove('active');
      sizeFullWidthBtn.classList.remove('active');

      if (mode === 'std') {
        document.documentElement.style.setProperty('--container-max-w', '520px');
        sizeStdBtn.classList.add('active');
      } else if (mode === 'lg') {
        document.documentElement.style.setProperty('--container-max-w', '850px');
        sizeLgBtn.classList.add('active');
      } else if (mode === 'full') {
        document.documentElement.style.setProperty('--container-max-w', '100%');
        sizeFullWidthBtn.classList.add('active');
      }
    }

    sizeStdBtn.addEventListener('click', () => setAppSize('std'));
    sizeLgBtn.addEventListener('click', () => setAppSize('lg'));
    sizeFullWidthBtn.addEventListener('click', () => setAppSize('full'));

    // 全画面表示
    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        cameraBox.requestFullscreen().catch(e => {
          // iOS Safari等�Eフォールバック
          cameraBox.classList.toggle('is-fullscreen');
        });
      } else {
        document.exitFullscreen();
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) {
        cameraBox.classList.add('is-fullscreen');
        fullscreenBtn.classList.add('active');
      } else {
        cameraBox.classList.remove('is-fullscreen');
        fullscreenBtn.classList.remove('active');
      }
    });

    // 設宁E    smoothingRange.addEventListener('input', (e) => {
      const v = parseInt(e.target.value);
      smoothingVal.innerText = v;
      smoothAlpha = 0.55 - (v * 0.045);
    });

    trackHipBtn.addEventListener('click', () => {
      trackingTarget = 'hip';
      trackHipBtn.classList.add('active');
      trackShoulderBtn.classList.remove('active');
      if (!isCalibrated) topBaselineY = null;
    });

    trackShoulderBtn.addEventListener('click', () => {
      trackingTarget = 'shoulder';
      trackShoulderBtn.classList.add('active');
      trackHipBtn.classList.remove('active');
      if (!isCalibrated) topBaselineY = null;
    });

    toggleGuideBtn.addEventListener('click', () => {
      showCenterGuide = !showCenterGuide;
      toggleGuideBtn.classList.toggle('active', showCenterGuide);
      toggleGuideBtn.innerText = showCenterGuide ? "ON" : "OFF";
    });

    resetRepBtn.addEventListener('click', () => {
      repCount = 0;
      repDisplay.innerText = 0;
      fsRep.innerText = 0;
      tutDisplay.innerText = "0.0s";
      fsTut.innerText = "0.0s";
      ratingDisplay.innerHTML = '<span style="color: var(--text-muted); font-size: 1rem;">-</span>';
      fsRating.innerText = '-';
      fsRating.className = '';
      lastCompletedTut = 0;
      repHistory = [];
      statCounts = { GREAT: 0, GOOD: 0, OK: 0 };
      statGreatCount.innerText = 0;
      statGoodCount.innerText = 0;
      statOkCount.innerText = 0;
      renderRepHistoryList();
      motionState = 'TOP';
      if (!isCalibrated) topBaselineY = null;
    });

    // --- ト�Eスト通知表示 ---
    const calibToast = document.getElementById('calibToast');
    const toastMsg = document.getElementById('toastMsg');
    let toastTimeout = null;
    function showToastNotification(msg) {
      if (!calibToast) return;
      if (toastMsg) toastMsg.innerText = msg;
      calibToast.classList.add('show');
      if (toastTimeout) clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        calibToast.classList.remove('show');
      }, 2400);
    }

    // --- キャリブレーション操佁E---
    const calibInstantBtn = document.getElementById('calibInstantBtn');
    const calibForceConfirmBtn = document.getElementById('calibForceConfirmBtn');
    const calibCancelBtn = document.getElementById('calibCancelBtn');
    const forceReloadBtn = document.getElementById('forceReloadBtn');

    // 🔄 最新版に強制更新�E�キャチE��ュ�E�Eervice Workerクリア�E�E    if (forceReloadBtn) {
      forceReloadBtn.addEventListener('click', async () => {
        if (confirm("最新バ�Eジョンを�E読み込みしますか�E�\n�E�キャチE��ュを消去して最新の画面を取得します！E)) {
          try {
            if ('serviceWorker' in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              for (const r of regs) await r.unregister();
            }
            if ('caches' in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map(k => caches.delete(k)));
            }
          } catch (e) {
            console.warn("Cache reset:", e);
          }
          window.location.href = window.location.pathname + '?v=' + Date.now();
        }
      });
    }

    // ⚡ 今すぐ確定（ワンタチE�Eで現在の姿勢を即座にロチE���E�E    if (calibInstantBtn) {
      calibInstantBtn.addEventListener('click', () => {
        if (!isCameraRunning) { alert("まずカメラを起動してください"); return; }
        applyCalibration(true);
        playBeep(880, 'sine', 0.25);
        showToastNotification("✁E基準姿勢を確定�EロチE��しました�E�E);
      });
    }

    // ✁E今すぐ基準を確定（オーバ�Eレイ表示中�E�E    if (calibForceConfirmBtn) {
      calibForceConfirmBtn.addEventListener('click', () => {
        applyCalibration(true);
        if (calibTimer) clearInterval(calibTimer);
        calibCountdown.innerText = "🌟";
        calibInstruction.innerText = "キャリブレーション確定！E;
        playBeep(880, 'sine', 0.25);
        showToastNotification("✁E基準姿勢を確定�EロチE��しました�E�E);
        setTimeout(() => {
          calibOverlay.classList.remove('active');
          calibMode = null;
        }, 400);
      });
    }

    // ✁E中止�E�オーバ�Eレイを閉じる�E�E    if (calibCancelBtn) {
      calibCancelBtn.addEventListener('click', () => {
        if (calibTimer) clearInterval(calibTimer);
        calibOverlay.classList.remove('active');
        calibMode = null;
      });
    }

    calib3sBtn.addEventListener('click', () => {
      if (!isCameraRunning) { alert("まずカメラを起動してください"); return; }
      start3sCalibration();
    });

    function start3sCalibration() {
      if (calibTimer) clearInterval(calibTimer);
      calibMode = '3s';
      calibOverlay.classList.add('active');
      calibProgressBox.style.display = 'none';
      calibInstruction.innerText = "直立して静止してください";
      calibSubInstruction.innerText = "3秒後に姿勢を記�E�E�今すぐ確定も可能�E�E;

      let count = 3;
      calibCountdown.innerText = count;
      playBeep(440, 'sine', 0.1);

      calibTimer = setInterval(() => {
        count--;
        if (count > 0) {
          calibCountdown.innerText = count;
          playBeep(440, 'sine', 0.1);
        } else {
          clearInterval(calibTimer);
          applyCalibration(true); // 3秒経過時�E忁E��確定！E          calibCountdown.innerText = "🌟";
          calibInstruction.innerText = "キャリブレーション完亁E��E;
          playBeep(880, 'sine', 0.25);
          showToastNotification("✁E基準姿勢を確定�EロチE��しました�E�E);
          setTimeout(() => {
            calibOverlay.classList.remove('active');
            calibMode = null;
          }, 500);
        }
      }, 1000);
    }

    calibFullBtn.addEventListener('click', () => {
      if (!isCameraRunning) { alert("まずカメラを起動してください"); return; }
      startFullCalibration();
    });

    function startFullCalibration() {
      if (calibTimer) clearInterval(calibTimer);
      calibMode = 'full';
      calibStableFrames = 0;
      calibOverlay.classList.add('active');
      calibProgressBox.style.display = 'block';
      calibProgressBar.style.width = '0%';
      calibCountdown.innerText = "🎯";
      calibInstruction.innerText = "カメラに体を映してください";
      calibSubInstruction.innerText = "紁E.3秒静止すると自動確定しまぁE;
    }

    function applyCalibration(force = false) {
      // 1. 利用可能なランド�Eークを取得！EmoothedLandmarks > calibSnapshotLm > latestPoseResults�E�E      let lm = smoothedLandmarks;
      if (!lm && calibSnapshotLm) lm = calibSnapshotLm;
      if (!lm && latestPoseResults && latestPoseResults.poseLandmarks) {
        lm = [];
        const raw = latestPoseResults.poseLandmarks;
        for (let i = 0; i < raw.length; i++) {
          let x = raw[i].x * canvas.width;
          let y = raw[i].y * canvas.height;
          if (isMirror) x = canvas.width - x;
          lm[i] = { x, y, visibility: raw[i].visibility };
        }
        smoothedLandmarks = lm;
      }

      // forceフラグがある場合�E、最悪ランド�Eークが未検�Eでも画面中央で強制初期化して進める
      if ((!lm || lm.length === 0) && !force) return false;

      isCalibrated = true;
      calibBadge.innerText = "✁E基準ロチE��渁E;
      calibBadge.className = "calib-status-badge ready";

      if (lm && lm.length > 0) {
        if (!smoothedTrackPoint) {
          if (trackingTarget === 'hip' && lm[23] && lm[24]) {
            smoothedTrackPoint = { x: (lm[23].x + lm[24].x) / 2, y: (lm[23].y + lm[24].y) / 2 };
          } else if (lm[11] && lm[12]) {
            smoothedTrackPoint = { x: (lm[11].x + lm[12].x) / 2, y: (lm[11].y + lm[12].y) / 2 };
          }
        }

        if (smoothedTrackPoint) {
          calibratedTopY = smoothedTrackPoint.y;
          topBaselineY = smoothedTrackPoint.y;
          bottomY = smoothedTrackPoint.y;
        }

        const headY = lm[0] ? lm[0].y : (canvas.height * 0.2);

        if (lm[27] && lm[28] && lm[27].visibility > 0.25 && lm[28].visibility > 0.25) {
          calibratedHeight = Math.abs((lm[27].y + lm[28].y) / 2 - headY);
        } else if (lm[25] && lm[26] && lm[25].visibility > 0.25 && lm[26].visibility > 0.25) {
          calibratedHeight = Math.abs((lm[25].y + lm[26].y) / 2 - headY) * 1.35;
        } else if (lm[23] && lm[24]) {
          calibratedHeight = Math.abs((lm[23].y + lm[24].y) / 2 - headY) * 1.9;
        } else {
          calibratedHeight = canvas.height * 0.7;
        }

        if (lm[11] && lm[12]) {
          calibratedCenterX = (lm[11].x + lm[12].x) / 2;
        }
      } else {
        // 丁E��一のフォールバック
        calibratedTopY = canvas.height * 0.45;
        topBaselineY = calibratedTopY;
        bottomY = calibratedTopY;
        calibratedHeight = canvas.height * 0.7;
        calibratedCenterX = canvas.width / 2;
        if (!smoothedTrackPoint) smoothedTrackPoint = { x: calibratedCenterX, y: calibratedTopY };
      }

      minDisplacement = Math.max(28, calibratedHeight * 0.12);
      return true;
    }

    // --- メインルーチE---
    async function processVideoLoop() {
      if (!isCameraRunning) return;

      // 1. カメラ映像が準備できてぁE��ば、直ちにCanvasへ直接描画�E�真っ暗を100%防止�E�E      if (video.videoWidth > 0 && video.videoHeight > 0) {
        updateCanvasDimensions(video.videoWidth, video.videoHeight);

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (isMirror) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      // 2. Pose検�E器が未初期化なら�E期化を試衁E      if (!poseDetector) {
        initPose();
      }

      // 3. MediaPipe Pose へのフレーム送信�E�ハング防止タイムアウト付き�E�E      const now = performance.now();
      const isStuck = isPoseProcessing && (now - poseProcessStartTime > 450);
      if (isStuck) isPoseProcessing = false;

      if (video.readyState >= 2 && poseDetector && !isPoseProcessing) {
        isPoseProcessing = true;
        poseProcessStartTime = now;
        poseDetector.send({ image: video })
          .catch(err => {
            console.warn("Pose send error:", err);
          })
          .finally(() => {
            isPoseProcessing = false;
          });
      }

      // 4. 最新のAI検�E結果があれ�E骨格・マ�Eカーをオーバ�Eレイ描画
      if (latestPoseResults) {
        renderPoseOverlay(latestPoseResults);
      } else {
        // AIモチE��ロード中のガイチE        drawModelLoadingOverlay();
      }

      requestAnimationFrame(processVideoLoop);
    }

    let lastFrameTimestamp = performance.now();

    function onPoseResults(results) {
      if (!isCameraRunning) return;
      isModelLoaded = true;
      latestPoseResults = results;
    }

    function drawModelLoadingOverlay() {
      if (isModelLoaded) return;
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, canvas.width, 32);
      ctx.font = '600 13px "Inter", sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.fillText('🤁EAI姿勢モチE��を準備中...', canvas.width / 2, 21);
      ctx.restore();
    }

    // 骨格・マ�Eカーおよびアライメント�Eオーバ�Eレイ描画
    function renderPoseOverlay(results) {
      const now = performance.now();
      const dt = (now - lastFrameTimestamp) / 1000;
      lastFrameTimestamp = now;

      if (!results.poseLandmarks) {
        hudMarkerStatus.className = 'hud-chip searching';
        hudStatusText.innerText = '全身をカメラに映してください';
        hudVelocityTag.innerText = '0 px/s';
        drawGuidanceOverlay();
        if (calibMode === 'full') {
          calibStableFrames = Math.max(0, calibStableFrames - 1);
          const pct = Math.min(100, Math.round((calibStableFrames / REQUIRED_STABLE_FRAMES) * 100));
          calibProgressBar.style.width = `${pct}%`;
          calibInstruction.innerText = "カメラに体を映してください";
          calibSubInstruction.innerText = "直立して静止すると基準を記�EしまぁE;
        }
        return;
      }

      hudMarkerStatus.className = 'hud-chip locked';
      hudStatusText.innerText = isCalibrated ? '基準ロチE��中 (高精度)' : '全身・関節追跡中';

      // 2. ランド�Eークの座標変換�E�E��ムージング
      const rawLm = results.poseLandmarks;
      const landmarks = [];

      for (let i = 0; i < rawLm.length; i++) {
        let x = rawLm[i].x * canvas.width;
        let y = rawLm[i].y * canvas.height;
        if (isMirror) x = canvas.width - x;

        if (!smoothedLandmarks || !smoothedLandmarks[i]) {
          landmarks[i] = { x, y, visibility: rawLm[i].visibility };
        } else {
          landmarks[i] = {
            x: smoothAlpha * x + (1 - smoothAlpha) * smoothedLandmarks[i].x,
            y: smoothAlpha * y + (1 - smoothAlpha) * smoothedLandmarks[i].y,
            visibility: rawLm[i].visibility
          };
        }
      }
      smoothedLandmarks = landmarks;

      // 3. 追跡基準点の算�E
      let targetX = 0, targetY = 0;
      if (trackingTarget === 'hip') {
        targetX = (landmarks[23].x + landmarks[24].x) / 2;
        targetY = (landmarks[23].y + landmarks[24].y) / 2;
      } else {
        targetX = (landmarks[11].x + landmarks[12].x) / 2;
        targetY = (landmarks[11].y + landmarks[12].y) / 2;
      }

      if (!smoothedTrackPoint) {
        smoothedTrackPoint = { x: targetX, y: targetY };
      } else {
        smoothedTrackPoint.x = smoothAlpha * targetX + (1 - smoothAlpha) * smoothedTrackPoint.x;
        smoothedTrackPoint.y = smoothAlpha * targetY + (1 - smoothAlpha) * smoothedTrackPoint.y;
      }

      // 4. 速度計箁E      let rawVelocity = 0;
      if (dt > 0.005) {
        const dy = targetY - smoothedTrackPoint.y;
        rawVelocity = (dy / dt) * 0.4;
      }
      smoothedVelocity = 0.25 * rawVelocity + 0.75 * smoothedVelocity;
      const absVelocity = Math.round(Math.abs(smoothedVelocity));

      // 5. しっかり読込判宁E      if (calibMode === 'full') {
        handleFullCalibrationCheck(landmarks, absVelocity);
      }

      // 6. レチE�E数判宁E      if (!calibMode) {
        updateMotionRepLogic(smoothedTrackPoint.y, smoothedVelocity, now);
      }

      // 7. マ�Eカー�E�E��ライメント描画
      drawBodyAlignmentAndJoints(landmarks, smoothedTrackPoint, absVelocity);
    }

    function handleFullCalibrationCheck(lm, speed) {
      // 認識されたランド�EークをスナップショチE��に保孁E      if (lm && lm.length > 0) {
        calibSnapshotLm = lm;
      }

      // 体幹�E�肩また�E腰また�E頭�E�が認識できてぁE��ば判定OK
      const hasBody = lm && (
        (lm[11] && lm[12] && (lm[11].visibility > 0.2 || lm[12].visibility > 0.2)) ||
        (lm[23] && lm[24] && (lm[23].visibility > 0.2 || lm[24].visibility > 0.2)) ||
        (lm[0] && lm[0].visibility > 0.2)
      );

      // スマ�Eの手ブレやAI座標ジチE��ーを老E�Eし速度制限を大きく緩咁E      const isStill = speed < 75;

      if (hasBody && isStill) {
        calibStableFrames += 2; // スムーズにゲージを増加
        const pct = Math.min(100, Math.round((calibStableFrames / REQUIRED_STABLE_FRAMES) * 100));
        calibProgressBar.style.width = `${pct}%`;
        calibInstruction.innerText = `静止をキーチE(${pct}%)`;
        calibSubInstruction.innerText = "姿勢を記�EしてぁE��ぁE..";

        if (calibStableFrames >= REQUIRED_STABLE_FRAMES) {
          calibProgressBar.style.width = '100%';
          calibCountdown.innerText = "🌟";
          calibInstruction.innerText = "しっかり読込完亁E��E;
          calibSubInstruction.innerText = "基準姿勢をロチE��しました";
          playBeep(880, 'sine', 0.25);
          applyCalibration(true);
          showToastNotification("✁E基準姿勢を確定�EロチE��しました�E�E);
          setTimeout(() => {
            calibOverlay.classList.remove('active');
            calibMode = null;
          }, 400);
        }
      } else {
        // 微動時もゲージをゼロにリセチE��せず維持E        const pct = Math.min(100, Math.round((calibStableFrames / REQUIRED_STABLE_FRAMES) * 100));
        calibProgressBar.style.width = `${pct}%`;

        if (!hasBody) {
          calibInstruction.innerText = "カメラに体を映してください";
        } else {
          calibInstruction.innerText = "直立して静止してください";
        }
      }
    }

    function updateMotionRepLogic(currentY, velocity, timestamp) {
      if (topBaselineY === null) {
        topBaselineY = currentY;
        bottomY = currentY;
      }

      if (!isCalibrated && currentY < topBaselineY && Math.abs(velocity) < 15) {
        topBaselineY = 0.1 * currentY + 0.9 * topBaselineY;
      }

      const displacement = currentY - topBaselineY;

      switch (motionState) {
        case 'TOP':
          phaseDisplay.innerText = isCalibrated ? '準備完亁E(基準ロチE��渁E' : '準備完亁E(TOP)';
          phaseDisplay.className = 'metric-value';
          fsPhase.innerText = 'TOP (静止)';
          fsPhase.className = 'metric-value';
          isWarning = false;

          if (velocity > VELOCITY_MOVE_THRESHOLD && displacement > minDisplacement * 0.3) {
            motionState = 'ECCENTRIC';
            eccentricStartTime = timestamp;
            bottomY = currentY;
          }
          break;

        case 'ECCENTRIC':
          const tut = ((timestamp - eccentricStartTime) / 1000).toFixed(1);
          tutDisplay.innerText = `${tut}s`;
          fsTut.innerText = `${tut}s`;

          if (currentY > bottomY) bottomY = currentY;

          if (velocity > MAX_ALLOWED_ECC_VELOCITY) {
            isWarning = true;
            phaseDisplay.innerText = '⚠�E�E落下（負荷抜け�E�E;
            phaseDisplay.className = 'metric-value status-warn';
            fsPhase.innerText = '⚠�E�E落丁E';
            fsPhase.className = 'metric-value status-warn';
            hudMarkerStatus.className = 'hud-chip warn';
            playBeep(220, 'square', 0.05);
          } else {
            isWarning = false;
            phaseDisplay.innerText = 'エキセントリチE�� ⬁E��E;
            phaseDisplay.className = 'metric-value status-ok';
            fsPhase.innerText = '下降 (ECC)';
            fsPhase.className = 'metric-value status-ok';
          }

          if (velocity < -VELOCITY_MOVE_THRESHOLD && (bottomY - topBaselineY) >= minDisplacement) {
            motionState = 'CONCENTRIC';
            lastCompletedTut = parseFloat(((timestamp - eccentricStartTime) / 1000).toFixed(1));
            isWarning = false;
          }
          break;

        case 'CONCENTRIC':
          phaseDisplay.innerText = '挙上中 ⬁E��E;
          phaseDisplay.className = 'metric-value status-concentric';
          fsPhase.innerText = '挙丁E(CON)';
          fsPhase.className = 'metric-value status-concentric';
          isWarning = false;

          if (displacement < minDisplacement * 0.28) {
            if (timestamp - lastRepTime > 700) {
              repCount++;
              repDisplay.innerText = repCount;
              fsRep.innerText = repCount;
              lastRepTime = timestamp;

              const effectiveTut = lastCompletedTut > 0 ? lastCompletedTut : parseFloat(((timestamp - eccentricStartTime) / 1000).toFixed(1));
              updateRepEvaluationUI(repCount, effectiveTut);
              lastCompletedTut = 0;
            }
            motionState = 'TOP';
            if (!isCalibrated) topBaselineY = currentY;
          }
          break;
      }

      const absV = Math.round(Math.abs(velocity));
      velocityDisplay.innerText = absV;
      fsVelocity.innerText = absV;
      hudVelocityTag.innerText = `${absV} px/s`;
    }

    function drawBodyAlignmentAndJoints(lm, targetPt, velocity) {
      ctx.save();

      const head = lm[0];
      const midShoulder = { x: (lm[11].x + lm[12].x) / 2, y: (lm[11].y + lm[12].y) / 2 };
      const midAnkle = { x: (lm[27].x + lm[28].x) / 2, y: (lm[27].y + lm[28].y) / 2 };

      // 1. 体幹一直線�Eーカー
      if (showCenterGuide) {
        const axisX = (isCalibrated && calibratedCenterX) ? calibratedCenterX : midShoulder.x;

        ctx.beginPath();
        ctx.moveTo(axisX, Math.max(0, head.y - 45));
        ctx.lineTo(axisX, Math.min(canvas.height, midAnkle.y + 45));
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = isWarning ? 'rgba(239, 68, 68, 0.9)' : (isCalibrated ? 'rgba(16, 185, 129, 0.9)' : 'rgba(6, 182, 212, 0.85)');
        ctx.shadowColor = isWarning ? '#ef4444' : (isCalibrated ? '#10b981' : '#06b6d4');
        ctx.shadowBlur = 12;
        ctx.stroke();

        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.moveTo(lm[11].x, lm[11].y);
        ctx.lineTo(lm[12].x, lm[12].y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(lm[23].x, lm[23].y);
        ctx.lineTo(lm[24].x, lm[24].y);
        ctx.stroke();
      }

      // 2. 骨格ボ�Eンライン
      const bones = [
        [11, 13], [13, 15],
        [12, 14], [14, 16],
        [11, 23], [12, 24],
        [23, 25], [25, 27],
        [24, 26], [26, 28]
      ];

      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.75)';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (const [s, e] of bones) {
        if (lm[s] && lm[e] && lm[s].visibility > 0.3 && lm[e].visibility > 0.3) {
          ctx.moveTo(lm[s].x, lm[s].y);
          ctx.lineTo(lm[e].x, lm[e].y);
        }
      }
      ctx.stroke();

      // 3. 関節丸マ�Eカー
      const jointIndices = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
      for (const idx of jointIndices) {
        const p = lm[idx];
        if (!p || p.visibility < 0.3) continue;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 12;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = isWarning ? '#ef4444' : '#0284c7';
        ctx.fill();
      }

      // 4. 追跡ターゲチE��HUD
      const fx = targetPt.x;
      const fy = targetPt.y;
      const focusColor = isWarning ? '#ef4444' : '#3b82f6';

      ctx.beginPath();
      ctx.arc(fx, fy, 16, 0, 2 * Math.PI);
      ctx.lineWidth = 3;
      ctx.strokeStyle = focusColor;
      ctx.shadowColor = focusColor;
      ctx.shadowBlur = 14;
      ctx.stroke();

      const tagText = isWarning ? `⚠�E�E落丁E ${velocity} px/s` : (isCalibrated ? `LOCKED ${velocity} px/s` : `TRACK ${velocity} px/s`);
      ctx.font = 'bold 12px "JetBrains Mono", sans-serif';
      const tw = ctx.measureText(tagText).width;

      ctx.fillStyle = 'rgba(10, 14, 23, 0.85)';
      ctx.strokeStyle = focusColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(fx + 22, fy - 12, tw + 14, 24, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isWarning ? '#fca5a5' : '#93c5fd';
      ctx.shadowBlur = 0;
      ctx.fillText(tagText, fx + 28, fy + 4);

      ctx.restore();
    }

    function drawGuidanceOverlay() {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, 36);
      ctx.font = '600 14px "Inter", sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.fillText('🧁E頭から足允E��でが映るよぁE��メラの位置を調整してください', canvas.width / 2, 23);
      ctx.restore();
    }

    // --- オフライン対忁EService Worker 登録 ---
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => {
          console.warn('[PWA] Service Worker registration skipped/failed:', err);
        });
      });
    }
  
