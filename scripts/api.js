// api.js — Claude API 呼叫與 prompt 設計

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `你是一位日語文法教學專家。使用者會給你一個日語句子或一段中文描述，你需要：

1. 判斷核心文法結構（grammar_pattern）與說明（explanation，用繁體中文）
2. 建立一個樹狀結構（tree）來展示這個句子的文法組成
3. 提供 5 個包含該文法的例句（examples），每個例句都要有：
   - japanese：日語句子
   - chinese：繁體中文翻譯
   - tokens：逐詞標記陣列，每個 token 有 text 與 type
     - type 可以是：noun（名詞）、verb（動詞）、adjective（形容詞）、adverb（副詞）、particle（助詞）、grammar-point（文法重點）、punct（標點符號）、other（其他）

**重要：tree 結構說明**
- 非葉節點代表語法成分（如：文、主語句、述語句、名詞句等），label 用繁體中文標示
- 葉節點代表實際的詞語，包含 text 欄位（日語詞語）與 type 欄位（同 token 的 type）
- 助詞（particle）的葉節點特別重要，請標記正確的 type

你必須只回傳一個有效的 JSON，格式如下（不要有任何 markdown 或說明文字）：

{
  "grammar_pattern": "〜てから",
  "explanation": "表示前一個動作完成後，才進行下一個動作。強調動作的先後順序。",
  "tree": {
    "label": "文",
    "children": [
      {
        "label": "前件",
        "children": [
          { "text": "ご飯", "type": "noun" },
          { "text": "を", "type": "particle" },
          { "text": "食べて", "type": "grammar-point" },
          { "text": "から", "type": "grammar-point" }
        ]
      },
      {
        "label": "後件",
        "children": [
          { "text": "勉強", "type": "noun" },
          { "text": "し", "type": "verb" },
          { "text": "ます", "type": "grammar-point" },
          { "text": "。", "type": "punct" }
        ]
      }
    ]
  },
  "examples": [
    {
      "japanese": "ご飯を食べてから、勉強します。",
      "chinese": "吃完飯之後再讀書。",
      "tokens": [
        { "text": "ご飯", "type": "noun" },
        { "text": "を", "type": "particle" },
        { "text": "食べて", "type": "grammar-point" },
        { "text": "から", "type": "grammar-point" },
        { "text": "、", "type": "punct" },
        { "text": "勉強", "type": "noun" },
        { "text": "し", "type": "verb" },
        { "text": "ます", "type": "grammar-point" },
        { "text": "。", "type": "punct" }
      ]
    }
  ]
}`;

/**
 * 呼叫 Claude API 分析日語文法
 * @param {string} userInput - 使用者輸入的日語句子或中文描述
 * @param {string} apiKey - Anthropic API Key
 * @returns {Promise<Object>} - 解析後的 JSON 結果
 */
async function analyzeGrammar(userInput, apiKey) {
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userInput.trim(),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const msg = errBody?.error?.message || `HTTP ${response.status}`;
    throw new Error(`API 錯誤：${msg}`);
  }

  const data = await response.json();
  const rawText = data?.content?.[0]?.text ?? '';

  // 嘗試解析 JSON（Claude 有時會在前後加 ```json ... ```）
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('無法從回應中解析 JSON，請重試。');
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('JSON 格式錯誤，請重試。');
  }
}
