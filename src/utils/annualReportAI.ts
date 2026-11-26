import { AnnualReportRatings, AnnualReportStats, AnnualReportTone, Student } from '../types';

export interface EvaluationDimension {
  key: 'focus' | 'homework' | 'progress' | 'exam' | 'nextYear';
  label: string;
  ratingKey?: keyof AnnualReportRatings;
  tags: string[];
  placeholder: string;
}

export const EVALUATION_DIMENSIONS: EvaluationDimension[] = [
  {
    key: 'focus',
    label: '课堂专注与态度',
    ratingKey: 'focus',
    tags: ['专注认真', '积极发问', '礼貌配合', '互动良好', '偶尔分心', '需要老师多提醒'],
    placeholder: '也可手写补充课堂表现，例：遇到难题愿意多思考，偶尔会小声和同学讨论',
  },
  {
    key: 'homework',
    label: '功课与练习完成',
    ratingKey: 'homework',
    tags: ['按时完成', '书写工整', '订正认真', '主动练习', '偶尔拖延', '需家长协助督促'],
    placeholder: '也可手写补充功课情况，例：步骤写得越来越完整，错题会用红笔标记',
  },
  {
    key: 'progress',
    label: '理解与吸收能力',
    ratingKey: 'progress',
    tags: ['基础扎实', '理解力强', '举一反三', '进步显著', '概念仍需巩固', '计算容易粗心'],
    placeholder: '也可手写补充吸收情况，例：代数部分掌握得很快，但几何证明还需多练习',
  },
  {
    key: 'exam',
    label: '测验与考试表现',
    ratingKey: 'exam',
    tags: ['成绩优异', '稳步提升', '达标完成', '发挥不够稳定', '考前冲刺有效'],
    placeholder: '也可手写补充考试情况，例：下半年期中测验比上半年进步了 15 分',
  },
  {
    key: 'nextYear',
    label: '来年学习建议',
    tags: ['保持现有节奏', '多做历年考题', '加强应用题训练', '巩固基础概念', '提升做题速度与细心度'],
    placeholder: '也可手写补充给家长/孩子的建议，例：假期可以每周复习一次错题本',
  },
];

export const TONE_OPTIONS: { value: AnnualReportTone; label: string; desc: string }[] = [
  { value: 'warm', label: '温柔鼓励型', desc: '像老师跟家长面对面聊天一样亲切自然' },
  { value: 'professional', label: '专业客观型', desc: '条理清晰，具体阐述学习表现与改进方向' },
  { value: 'concise', label: '简明扼要型', desc: '精炼自然，适合 WhatsApp 快速阅读' },
];

// Natural human-like explanations for each tag (instead of quoting tag names mechanically)
const TAG_DESCRIPTIONS: Record<string, string> = {
  // 课堂专注与态度
  '专注认真': '上课时能跟着老师的思路专心听讲，很少被外界干扰',
  '积极发问': '遇到卡住或有疑问的地方会主动开口发问，愿意把问题弄懂',
  '礼貌配合': '对待老师和课堂要求很有礼貌，配合度一直很高',
  '互动良好': '课堂上愿意参与讨论和回答问题，学习氛围很积极',
  '偶尔分心': '有时在课程后半段会稍微走神，需要老师轻轻提醒拉回注意力',
  '需要老师多提醒': '课堂专注力有时还不够稳定，需要老师在旁适时督促与引导',

  // 功课与练习完成
  '按时完成': '每次课后布置的练习都能按时完成并交上，学习自觉性不错',
  '书写工整': '作业本上的字迹和解题步骤都写得比较工整清楚，方便自己复查',
  '订正认真': '对于做错的题目能够认真订正，愿意回头弄明白错在哪里',
  '主动练习': '除了老师布置的功课外，还会主动找题多加练习',
  '偶尔拖延': '功课方面偶尔会有拖延的情况，需要抓紧课后复习的时间',
  '需家长协助督促': '回家后的功课完成度有时还不够稳定，建议家长在家里多加留意和督促',

  // 理解与吸收能力
  '基础扎实': '基础知识掌握得比较稳固，学新内容时衔接起来比较顺畅',
  '理解力强': '讲授新单元时吸收得很快，通常稍微点拨就能明白其中的逻辑',
  '举一反三': '面对题型变化时能够灵活套用学过的方法，懂得举一反三',
  '进步显著': '相比年初，整体理解和解题能力有了肉眼可见的进步',
  '概念仍需巩固': '部分核心概念在遇到复杂题型时还不够熟练，需要反复多巩固几次',
  '计算容易粗心': '做题时思路其实是对的，但常常因为计算太快或看漏条件而出现粗心失分',

  // 测验与考试表现
  '成绩优异': '在平时的测验和考试中一直保持着相当亮眼的成绩',
  '稳步提升': '一次次的测验成绩都在稳步往上走，努力看得到成果',
  '达标完成': '阶段性测验都能顺利达到预期目标，表现平稳',
  '发挥不够稳定': '考试成绩有时会受到心态或审题习惯影响，发挥还不够稳定',
  '考前冲刺有效': '考前复习和冲刺阶段非常投入，复习效果也直接反映在成绩上',

  // 来年学习建议
  '保持现有节奏': '新的一年只要继续保持目前踏实的学习节奏就好',
  '多做历年考题': '可以开始多接触历年考题，提前熟悉出题方式和答题技巧',
  '加强应用题训练': '平时可以多花些时间拆解应用题的题意，把文字条件转化成算式',
  '巩固基础概念': '把基础概念和公式再打牢一些，后面的进阶单元学起来会更轻松',
  '提升做题速度与细心度': '练习时试着限时完成，并养成做完检查一遍的好习惯，既稳又快',
};

function joinNaturalClauses(clauses: string[], connector = '，'): string {
  const cleaned = clauses.map(c => c.trim().replace(/[。，,；;]+$/g, '')).filter(Boolean);
  if (cleaned.length === 0) return '';
  if (cleaned.length === 1) return cleaned[0];
  return cleaned.join(connector);
}

function buildDimensionNarrative(
  tags: string[],
  customNote: string | undefined,
  positiveSet: Set<string>
): string {
  const positives: string[] = [];
  const improves: string[] = [];

  for (const t of tags) {
    const desc = TAG_DESCRIPTIONS[t] || t;
    if (positiveSet.has(t)) {
      positives.push(desc);
    } else {
      improves.push(desc);
    }
  }

  const parts: string[] = [];
  if (positives.length > 0 && improves.length > 0) {
    parts.push(`${joinNaturalClauses(positives, '，')}；不过${joinNaturalClauses(improves, '，而且')}`);
  } else if (positives.length > 0) {
    parts.push(joinNaturalClauses(positives, '，'));
  } else if (improves.length > 0) {
    parts.push(joinNaturalClauses(improves, '，同时'));
  }

  if (customNote?.trim()) {
    parts.push(customNote.trim().replace(/[。！!]+$/g, ''));
  }

  if (parts.length === 0) return '';
  return parts.join('。') + '。';
}

const POSITIVE_TAGS = new Set([
  '专注认真', '积极发问', '礼貌配合', '互动良好',
  '按时完成', '书写工整', '订正认真', '主动练习',
  '基础扎实', '理解力强', '举一反三', '进步显著',
  '成绩优异', '稳步提升', '达标完成', '考前冲刺有效',
]);

/**
 * Built-in natural-language synthesizer that explains selected tags in warm,
 * human-like teacher prose rather than dumping tag labels verbatim.
 */
export function synthesizeAnnualComment(params: {
  student: Student;
  year: string;
  stats: AnnualReportStats;
  selectedTags: Record<string, string[]>;
  customNotes?: Record<string, string>;
  ratings: AnnualReportRatings;
  highlights: string;
  nextYearGoal: string;
  tone: AnnualReportTone;
}): string {
  const { student, year, stats, selectedTags, customNotes = {}, highlights, nextYearGoal, tone } = params;
  const name = student.name;
  const parentGreeting = student.parent_name ? `${student.parent_name}您好` : '家长您好';

  const attendanceText =
    stats.completedSessions > 0
      ? `在 ${year} 年的补习课程里，${name} 一共完成了 ${stats.completedSessions} 节课（累计 ${stats.completedHours.toFixed(1)} 小时，出勤率达 ${stats.attendanceRate}%）`
      : `回顾 ${year} 年的学习历程，${name} 在 ${student.subjects || '补习科目'} 上持续跟着课程一步步前进`;

  const focusNarrative = buildDimensionNarrative(selectedTags.focus || [], customNotes.focus, POSITIVE_TAGS);
  const homeworkNarrative = buildDimensionNarrative(selectedTags.homework || [], customNotes.homework, POSITIVE_TAGS);
  const progressNarrative = buildDimensionNarrative(selectedTags.progress || [], customNotes.progress, POSITIVE_TAGS);
  const examNarrative = buildDimensionNarrative(selectedTags.exam || [], customNotes.exam, POSITIVE_TAGS);

  const nextTagDescriptions = (selectedTags.nextYear || []).map(t => TAG_DESCRIPTIONS[t] || t);
  if (customNotes.nextYear?.trim()) {
    nextTagDescriptions.push(customNotes.nextYear.trim().replace(/[。！!]+$/g, ''));
  }
  if (nextYearGoal.trim()) {
    nextTagDescriptions.push(nextYearGoal.trim().replace(/[。！!]+$/g, ''));
  }
  const nextNarrative =
    nextTagDescriptions.length > 0
      ? `展望新的一年，建议${joinNaturalClauses(nextTagDescriptions, '，同时')}。`
      : `希望新的一年继续保持这份学习的节奏与信心，成绩一定会越来越好！`;

  const highlightText = highlights.trim()
    ? `特别值得一提的是，${highlights.trim().replace(/[。！!]+$/g, '')}，这份进步非常值得肯定！`
    : '';

  const classroomAndHomework = [focusNarrative, homeworkNarrative].filter(Boolean).join('');
  const learningAndExam = [progressNarrative, examNarrative, highlightText].filter(Boolean).join('');

  if (tone === 'concise') {
    return [
      `${parentGreeting}！${attendanceText}。`,
      classroomAndHomework,
      learningAndExam,
      nextNarrative,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  if (tone === 'professional') {
    return [
      `${parentGreeting}，以下为 ${name} ${year} 年度补习学习表现与评估总结：`,
      `一、出勤与课堂习惯：${attendanceText}。${classroomAndHomework || '课堂整体配合度良好，能按计划推进学习。'}`,
      learningAndExam ? `二、知识吸收与测验表现：${learningAndExam}` : '',
      `三、下一阶段学习建议：${nextNarrative}`,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  // Default: warm, conversational teacher tone
  return [
    `${parentGreeting}！转眼 ${year} 年即将画上句号，非常感谢您这一年来对补习班的信任与配合。`,
    `${attendanceText}。${classroomAndHomework}`,
    learningAndExam,
    `${nextNarrative} 期待新的一年继续陪着 ${name} 一起进步、收获更多自信！`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function buildAnnualReportPrompt(params: {
  student: Student;
  year: string;
  stats: AnnualReportStats;
  selectedTags: Record<string, string[]>;
  customNotes?: Record<string, string>;
  ratings: AnnualReportRatings;
  highlights: string;
  nextYearGoal: string;
  tone: AnnualReportTone;
  existingDraft?: string;
  mode: 'generate' | 'polish';
}): string {
  const {
    student,
    year,
    stats,
    selectedTags,
    customNotes = {},
    ratings,
    highlights,
    nextYearGoal,
    tone,
    existingDraft,
    mode,
  } = params;
  const toneLabel = TONE_OPTIONS.find(t => t.value === tone)?.label || '温柔鼓励型';

  const tagSummary = EVALUATION_DIMENSIONS.map(dim => {
    const picked = selectedTags[dim.key] || [];
    const custom = customNotes[dim.key]?.trim();
    if (picked.length === 0 && !custom) return null;
    const parts: string[] = [];
    if (picked.length > 0) parts.push(`勾选表现：${picked.join('、')}`);
    if (custom) parts.push(`老师手写补充：${custom}`);
    return `- ${dim.label}（${parts.join('；')}）`;
  })
    .filter(Boolean)
    .join('\n');

  return `你是一位经验丰富、说话温暖真诚的马来西亚补习老师，正在写一段发给家长的「${year} 年度补习表现总结」。

【学生信息】
- 学生姓名：${student.name}
- 年级：${student.grade || '未填写'}
- 补习科目：${student.subjects || '综合科目'}
- 家长称呼：${student.parent_name || '家长'}

【${year} 年出勤统计】
- 已完成课节：${stats.completedSessions} 节（累计 ${stats.completedHours.toFixed(1)} 小时）
- 请假：${stats.leaveCount} 次，补课：${stats.makeupCount} 次，出勤率：${stats.attendanceRate}%

【老师评分（满分5星）】
- 课堂专注：${ratings.focus} 星 | 功课完成：${ratings.homework} 星 | 理解进步：${ratings.progress} 星 | 测验表现：${ratings.exam} 星

【各维度表现与老师手写补充】
${tagSummary || '（暂无勾选）'}

【年度亮点 / 具体成绩】
${highlights.trim() || '（无）'}

【来年补充建议】
${nextYearGoal.trim() || '（无）'}

${mode === 'polish' && existingDraft?.trim() ? `【老师手写初稿（请保留其中的真实事例和分数，润色得更自然通顺）】\n${existingDraft.trim()}\n` : ''}
【非常重要的写作要求】
1. 必须高度拟人化，像真实老师在 WhatsApp 或面对面跟家长沟通那样自然！
2. **严禁生硬罗列标签原词**（例如绝对不要写“展现出「专注认真、按时完成、书写工整」等优点”），而是要把每个标签**解释成具体的课堂或学习行为**（例如：“上课时很专注，遇到不懂的也会主动问”、“功课都能按时交上，字迹和步骤也写得工整”）。
3. 如果同一维度同时勾选了正面和待改进项（比如“专注认真”和“偶尔分心”），要自然衔接，例如“大部分时间都很专心，只是偶尔后半段会稍微走神，提醒一下就能回到状态”。
4. 语气风格：${toneLabel}。字数控制在 180～300 字左右，分段清晰，直接输出正文，不要加多余标题。`;
}

export async function generateWithGeminiAPI(apiKey: string, prompt: string): Promise<string> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error('请先输入 Gemini API Key');
  }

  const models = ['gemini-3.8-flash', 'gemini-3.8-flash-lite', 'gemini-2.5-flash'];
  let lastError = 'AI 请求失败';

  for (const model of models) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(trimmedKey)}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 900,
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('AI 未返回有效内容，请重试');
      }
      return text.trim();
    }

    const errText = await res.text();
    lastError = `API 请求失败 (${res.status})`;
    try {
      const parsed = JSON.parse(errText);
      if (parsed?.error?.message) lastError = parsed.error.message;
    } catch {
      // ignore
    }

    // Retry next fallback model if unavailable, not found, or temporarily overloaded (503/429)
    const retryable =
      res.status === 404 ||
      res.status === 503 ||
      res.status === 429 ||
      lastError.includes('no longer available') ||
      lastError.includes('high demand') ||
      lastError.includes('overloaded');
    if (!retryable) {
      break;
    }
  }

  throw new Error(lastError);
}
