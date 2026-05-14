// app.js — 主邏輯入口、UI 狀態管理與事件綁定

// ── DOM 參考 ──────────────────────────────────────────────
const speedSlider      = document.getElementById('speedSlider');
const speedDisplay     = document.getElementById('speedDisplay');
const apiKeyInput      = document.getElementById('apiKeyInput');
const apiKeySave       = document.getElementById('apiKeySave');
const userInput        = document.getElementById('userInput');
const analyzeBtn       = document.getElementById('analyzeBtn');
const loadingArea      = document.getElementById('loadingArea');
const errorArea        = document.getElementById('errorArea');
const resultArea       = document.getElementById('resultArea');
const grammarPattern   = document.getElementById('grammarPattern');
const grammarExplanation = document.getElementById('grammarExplanation');
const exampleJapanese  = document.getElementById('exampleJapanese');
const exampleChinese   = document.getElementById('exampleChinese');
const exampleCounter   = document.getElementById('exampleCounter');
const speakBtn         = document.getElementById('speakBtn');
const nextBtn          = document.getElementById('nextBtn');

// ── 狀態 ──────────────────────────────────────────────────
let examples = [];
let currentIndex = 0;

// ── API Key 管理 ──────────────────────────────────────────
function loadApiKey() {
  const saved = localStorage.getItem('claude-api-key');
  if (saved) apiKeyInput.value = saved;
}

apiKeySave.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    showError('請輸入 API Key。');
    return;
  }
  localStorage.setItem('claude-api-key', key);
  apiKeySave.textContent = '✓ 已儲存';
  setTimeout(() => { apiKeySave.textContent = '儲存'; }, 1500);
});

// ── 語速控制 ──────────────────────────────────────────────
speedSlider.addEventListener('input', () => {
  const rate = parseFloat(speedSlider.value).toFixed(1);
  speedDisplay.textContent = `${rate}x`;
  setSpeechRate(parseFloat(rate));
});

// ── 分析按鈕 ──────────────────────────────────────────────
analyzeBtn.addEventListener('click', async () => {
  const text = userInput.value.trim();
  if (!text) { showError('請先輸入日語句子或中文描述。'); return; }

  const apiKey = localStorage.getItem('claude-api-key') || apiKeyInput.value.trim();
  if (!apiKey) { showError('請先輸入並儲存 Anthropic API Key。'); return; }

  clearError();
  setLoading(true);
  stopSpeech();

  try {
    const result = await analyzeGrammar(text, apiKey);
    displayResult(result);
  } catch (err) {
    showError(err.message || '發生未知錯誤，請重試。');
  } finally {
    setLoading(false);
  }
});

// Enter 鍵（Shift+Enter 換行，Enter 送出）
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    analyzeBtn.click();
  }
});

// ── 顯示結果 ──────────────────────────────────────────────
function displayResult(data) {
  // 文法說明
  grammarPattern.textContent = data.grammar_pattern || '';
  grammarExplanation.textContent = data.explanation || '';

  // 樹狀圖
  if (data.tree) {
    renderDiagram(data.tree);
  }

  // 例句
  examples = data.examples || [];
  currentIndex = 0;
  renderExample(currentIndex);

  resultArea.classList.remove('hidden');
  resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── 例句渲染 ──────────────────────────────────────────────
function renderExample(index) {
  const ex = examples[index];
  if (!ex) return;

  stopSpeech();
  speakBtn.classList.remove('speaking');
  speakBtn.textContent = '🔊 發音';

  // 計數器
  exampleCounter.textContent = `${index + 1} / ${examples.length}`;

  // 日語句子（帶 token 高亮）
  exampleJapanese.innerHTML = '';
  for (const token of ex.tokens || []) {
    const span = document.createElement('span');
    span.className = 'token';
    if (token.type) span.classList.add(token.type);
    span.textContent = token.text;
    exampleJapanese.appendChild(span);
  }

  // 中文翻譯
  exampleChinese.textContent = ex.chinese || '';
}

// ── 下一則按鈕 ────────────────────────────────────────────
nextBtn.addEventListener('click', () => {
  if (examples.length === 0) return;
  currentIndex = (currentIndex + 1) % examples.length;
  renderExample(currentIndex);
});

// ── 發音按鈕 ──────────────────────────────────────────────
speakBtn.addEventListener('click', () => {
  const ex = examples[currentIndex];
  if (!ex) return;

  speakJapanese(
    ex.japanese,
    () => {
      speakBtn.classList.add('speaking');
      speakBtn.textContent = '■ 停止';
    },
    () => {
      speakBtn.classList.remove('speaking');
      speakBtn.textContent = '🔊 發音';
    }
  );
});

// ── UI 工具函式 ───────────────────────────────────────────
function setLoading(on) {
  loadingArea.classList.toggle('hidden', !on);
  analyzeBtn.disabled = on;
  if (on) resultArea.classList.add('hidden');
}

function showError(msg) {
  errorArea.textContent = msg;
  errorArea.classList.remove('hidden');
}

function clearError() {
  errorArea.textContent = '';
  errorArea.classList.add('hidden');
}

// ── 初始化 ────────────────────────────────────────────────
loadApiKey();
setSpeechRate(parseFloat(speedSlider.value));
