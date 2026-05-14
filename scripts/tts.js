// tts.js — Web Speech API 日語發音控制

let _speechRate = 1.0;
let _speaking = false;

/**
 * 設定語速（由 app.js 的 slider 呼叫）
 */
function setSpeechRate(rate) {
  _speechRate = parseFloat(rate);
}

/**
 * 朗讀日語文字
 * @param {string} text - 要朗讀的日語文字
 * @param {Function} [onStart] - 開始時的回呼
 * @param {Function} [onEnd] - 結束時的回呼
 */
function speakJapanese(text, onStart, onEnd) {
  if (!window.speechSynthesis) {
    alert('此瀏覽器不支援語音合成功能，請改用 Chrome 或 Edge。');
    return;
  }

  // 若正在說話則停止
  if (_speaking) {
    window.speechSynthesis.cancel();
    _speaking = false;
    if (onEnd) onEnd();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  utterance.rate = _speechRate;

  // 嘗試選擇日語聲音（優先選 ja-JP 的聲音）
  const voices = window.speechSynthesis.getVoices();
  const jaVoice = voices.find(v => v.lang === 'ja-JP') ||
                  voices.find(v => v.lang.startsWith('ja'));
  if (jaVoice) utterance.voice = jaVoice;

  utterance.onstart = () => {
    _speaking = true;
    if (onStart) onStart();
  };

  utterance.onend = () => {
    _speaking = false;
    if (onEnd) onEnd();
  };

  utterance.onerror = () => {
    _speaking = false;
    if (onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * 強制停止朗讀
 */
function stopSpeech() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    _speaking = false;
  }
}

// 語音列表載入後的 Chrome 相容處理
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    // 確保聲音列表已載入（某些瀏覽器需要觸發一次）
    window.speechSynthesis.getVoices();
  };
}
