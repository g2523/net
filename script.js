/**
 * Real Speed Test - With Start & Retry Buttons
 */

(function() {
  'use strict';

  // ===== CONFIG =====
  const CONFIG = {
    testDuration: 5000,
    uiUpdateInterval: 100
  };

  // ===== DOM ELEMENTS =====
  const els = {
    speedValue: document.getElementById('speedValue'),
    status: document.getElementById('status'),
    progressRing: document.querySelector('.progress-ring'),
    progressFill: document.querySelector('.progress-ring-fill'),
    startBtn: document.getElementById('startBtn'),
    retryBtn: document.getElementById('retryBtn')
  };

  // ===== STATE =====
  let state = {
    isTesting: false,
    startTime: 0,
    totalBytes: 0,
    animationFrame: null,
    currentSpeed: 0,
    lastMeasuredSpeed: 0,
    finalSpeed: null,
    testElements: []
  };

  // ===== UTILITIES =====
  const formatNumber = (num) => {
    if (num >= 100) return Math.round(num).toString();
    if (num >= 10) return num.toFixed(1);
    return num.toFixed(2);
  };

  const updateProgressRing = (progress) => {
    const circumference = 660;
    const offset = circumference * (1 - Math.min(progress, 1));
    els.progressFill.style.strokeDashoffset = offset;
  };

  // ===== SPEED CALCULATION =====
  const calculateSpeed = (bytes, elapsedMs) => {
    if (elapsedMs <= 0) return 0;
    return (bytes * 8) / (elapsedMs / 1000) / 1_000_000;
  };

  // ===== UI UPDATES =====
  const updateUI = (speed, statusText = 'Testing') => {
    els.speedValue.textContent = formatNumber(speed);
    els.status.textContent = statusText;
    els.status.classList.add('testing');
  };

  const showResult = (speed) => {
    els.speedValue.textContent = formatNumber(speed);
    els.status.textContent = 'Complete';
    els.status.classList.remove('testing');
    els.progressRing.classList.remove('visible');
    
    // Show Retry button, hide Start button
    els.startBtn.classList.add('hidden');
    els.retryBtn.style.display = 'inline-block';
    els.retryBtn.disabled = false;
  };

  const showError = (message) => {
    els.status.textContent = message || 'Test failed';
    els.status.classList.remove('testing');
    els.progressRing.classList.remove('visible');
    
    // Show Retry button on error
    els.startBtn.classList.add('hidden');
    els.retryBtn.style.display = 'inline-block';
    els.retryBtn.disabled = false;
    state.isTesting = false;
  };

  const resetUI = () => {
    els.speedValue.textContent = '0';
    els.status.textContent = 'Ready to test';
    els.status.classList.remove('testing');
    els.progressRing.classList.remove('visible');
    updateProgressRing(0);
    
    // Show Start button, hide Retry button
    els.startBtn.classList.remove('hidden');
    els.retryBtn.style.display = 'none';
  };

  const setLoadingState = (loading) => {
    els.startBtn.disabled = loading;
    els.retryBtn.disabled = loading;
    
    if (loading) {
      els.startBtn.textContent = 'Testing...';
    } else {
      els.startBtn.textContent = 'Start';
    }
  };

  // ===== DOWNLOAD USING IMAGE TAGS =====
  const downloadWithImages = async (duration) => {
    const startTime = performance.now();
    let bytesLoaded = 0;
    let lastUpdate = startTime;
    let testComplete = false;
    
    const imageUrls = [
      'https://picsum.photos/1920/1080?random=1',
      'https://picsum.photos/1920/1080?random=2',
      'https://picsum.photos/1920/1080?random=3',
      'https://picsum.photos/1920/1080?random=4',
      'https://picsum.photos/1920/1080?random=5',
      'https://picsum.photos/1920/1080?random=6',
      'https://picsum.photos/1920/1080?random=7',
      'https://picsum.photos/1920/1080?random=8',
      'https://picsum.photos/1920/1080?random=9',
      'https://picsum.photos/1920/1080?random=10',
    ];
    
    let imageIndex = 0;
    const estimatedImageSize = 300000;
    
    const loadNextImage = () => {
      if (testComplete || imageIndex >= imageUrls.length) return;
      
      const img = new Image();
      
      img.onload = () => {
        bytesLoaded += estimatedImageSize;
        imageIndex++;
        
        if (!testComplete) {
          setTimeout(loadNextImage, 50);
        }
      };
      
      img.onerror = () => {
        imageIndex++;
        if (!testComplete) {
          setTimeout(loadNextImage, 50);
        }
      };
      
      img.src = imageUrls[imageIndex];
      state.testElements.push(img);
    };

    for (let i = 0; i < 4; i++) {
      setTimeout(loadNextImage, i * 150);
    }

    return new Promise((resolve) => {
      const checkProgress = () => {
        const now = performance.now();
        const elapsed = now - startTime;
        
        if (now - lastUpdate >= CONFIG.uiUpdateInterval) {
          const speed = calculateSpeed(bytesLoaded, elapsed);
          state.currentSpeed = speed;
          state.lastMeasuredSpeed = speed;
          
          const progress = Math.min(elapsed / duration, 1);
          
          updateUI(speed, `Testing ${Math.round(progress * 100)}%`);
          updateProgressRing(progress);
          lastUpdate = now;
        }
        
        if (elapsed >= duration) {
          testComplete = true;
          resolve({
            bytesLoaded: bytesLoaded,
            totalTime: elapsed,
            finalSpeed: state.lastMeasuredSpeed
          });
        } else {
          requestAnimationFrame(checkProgress);
        }
      };
      
      checkProgress();
    });
  };

  // ===== MAIN TEST FUNCTION =====
  const runSpeedTest = async () => {
    if (state.isTesting) return;
    
    // Reset state
    state = {
      isTesting: true,
      startTime: 0,
      totalBytes: 0,
      animationFrame: null,
      currentSpeed: 0,
      lastMeasuredSpeed: 0,
      finalSpeed: null,
      testElements: []
    };
    
    // Reset UI
    resetUI();
    els.status.textContent = 'Starting...';
    els.status.classList.add('testing');
    els.progressRing.classList.add('visible');
    updateProgressRing(0);
    
    // Disable buttons during test
    setLoadingState(true);
    
    try {
      const result = await downloadWithImages(CONFIG.testDuration);
      
      state.finalSpeed = result.finalSpeed;
      
      if (state.finalSpeed < 0.01) state.finalSpeed = 0.01;
      
      showResult(state.finalSpeed);
      
    } catch (error) {
      console.error('Speed test error:', error);
      showError('Retry');
    } finally {
      if (state.animationFrame) {
        cancelAnimationFrame(state.animationFrame);
      }
      setLoadingState(false);
      state.isTesting = false;
    }
  };

  // ===== EVENT HANDLERS =====
  const init = () => {
    // Start button click
    els.startBtn.addEventListener('click', (e) => {
      e.preventDefault();
      runSpeedTest();
    });
    
    // Retry button click
    els.retryBtn.addEventListener('click', (e) => {
      e.preventDefault();
      runSpeedTest();
    });
    
    // Keyboard support
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (!state.isTesting) {
          runSpeedTest();
        }
      }
    });
  };

  // ===== INITIALIZE =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();