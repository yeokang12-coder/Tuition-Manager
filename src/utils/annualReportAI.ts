import { AnnualReportRatings, AnnualReportStats, AnnualReportTone, Student } from '../types';

export interface EvaluationDimension {
  key: 'focus' | 'homework' | 'progress' | 'exam' | 'nextYear';
  label: string;
  ratingKey?: keyof AnnualReportRatings;
  tags: string[];
}

export const EVALUATION_DIMENSIONS: EvaluationDimension[] = [
  {
    key: 'focus',
    label: '课堂专注与态度',
    ratingKey: 'focus',
    tags: ['专注认真', '积极发问', '礼貌配合', '互动良好', '偶尔分心', '需要老师多提醒'],
  },
  {
    key: 'homework',
    label: '功课与练习完成',
    ratingKey: 'homework',
    tags: ['按时完成', '书写工整', '订正认真', '主动练习', '偶尔拖延', '需家长协助督促'],
  },
  {
    key: 'progress',
    label: '理解与吸收能力',
    ratingKey: 'progress',
    tags: ['基础扎实', '理解力强', '举一反三', '进步显著', '概念仍需巩固', '计算容易粗心'],
  },
  {
    key: 'exam',
    label: '测验与考试表现',
    ratingKey: 'exam',
    tags: ['成绩优异', '稳步提升', '达标完成', '发挥不够稳定', '考前冲刺有效'],
  },
  {
    key: 'nextYear',
    label: '来年学习建议',
    tags: ['保持现有节奏', '多做历年考题', '加强应用题训练', '巩固基础概念', '提升做题速度与细心度'],
  },
];

export const TONE_OPTIONS: { value: AnnualReportTone; label: string; desc: string }[] = [
  { value: 'warm', label: '温柔鼓励型', desc: '亲切肯定孩子付出，适合发给家长沟通' },
  { value: 'professional', label: '专业客观型', desc: '条理清晰，侧重学习能力与提升方案' },
  { value: 'concise', label: '简明扼要型', desc: '精炼直白，适合 WhatsApp 快速阅读' },
];

/**
 * Built-in rule-based synthesizer that weaves selected tags, attendance stats,
 * and teacher highlights into a natural Chinese annual evaluation without needing an API key.
 */
export function synthesizeAnnualComment(params: {
  student: Student;
  year: string;
  stats: AnnualReportStats;
  selectedTags: Record<string, string[]>;
  ratings: AnnualReportRatings;
  highlights: string;
  nextYearGoal: string;
  tone: AnnualReportTone;
}): string {
  const { student, year, stats, selectedTags, ratings, highlights, nextYearGoal, tone } = params;
  const name = student.name;
  const parentGreeting = student.parent_name ? `${student.parent_name}您好` : '家长您好';

  const focusTags = selectedTags.focus || [];
  const homeworkTags = selectedTags.homework || [];
  const progressTags = selectedTags.progress || [];
  const examTags = selectedTags.exam || [];
  const nextTags = selectedTags.nextYear || [];

  const avgRating = (ratings.focus + ratings.homework + ratings.progress + ratings.exam) / 4;

  const attendancePhrase =
    stats.completedSessions > 0
      ? `在 ${year} 年的补习课程中，${name} 共完成了 ${stats.completedSessions} 节课（累计 ${stats.completedHours.toFixed(1)} 小时，出勤率 ${stats.attendanceRate}%）`
      : `回顾 ${year} 年的补习学习旅程，${name} 在 ${student.subjects || '相关科目'} 方面持续投入学习`;

  const positiveParts: string[] = [];
  const improveParts: string[] = [];

  const classify = (tags: string[], positiveList: string[], improveList: string[]) => {
    for (const t of tags) {
      if (
        t.includes('偶尔') ||
        t.includes('需要') ||
        t.includes('需') ||
        t.includes('粗心') ||
        t.includes('不够稳定') ||
        t.includes('巩固')
      ) {
        improveList.push(t);
      } else {
        positiveList.push(t);
      }
    }
  };

  classify([...focusTags, ...homeworkTags, ...progressTags, ...examTags], positiveParts, improveParts);

  const strengthText =
    positiveParts.length > 0
      ? `整体表现${avgRating >= 4.2 ? '非常出色' : '值得肯定'}，尤其在学习中展现出「${positiveParts.slice(0, 4).join('、')}」等优点。`
      : `整体学习态度端正，能够配合老师的节奏完成阶段性学习任务。`;

  const improveText =
    improveParts.length > 0
      ? `不过在「${improveParts.join('、')}」方面还有进一步提升的空间，日常练习时可以多加留意。`
      : '';

  const highlightText = highlights.trim() ? `值得一提的是：${highlights.trim().replace(/[。！!]+$/, '')}。` : '';

  const nextAdvice = [...nextTags, ...(nextYearGoal.trim() ? [nextYearGoal.trim()] : [])];
  const nextText =
    nextAdvice.length > 0
      ? `新的一年，建议重点放在「${nextAdvice.join('、')}」，稳扎稳打一定能更上一层楼。`
      : `期待新的一年继续保持学习热情，在学业上取得更亮眼的成绩！`;

  if (tone === 'concise') {
    return [
      `${parentGreeting}！${attendancePhrase}。`,
      strengthText,
      highlightText,
      improveText,
      nextText,
    ]
      .filter(Boolean)
      .join('');
  }

  if (tone === 'professional') {
    return [
      `${parentGreeting}，现将 ${name} ${year} 年度补习学习表现总结如下：`,
      `一、出勤与课堂概况：${attendancePhrase}。${strengthText}`,
      highlightText ? `二、年度亮点与突破：${highlightText}` : '',
      improveText ? `三、待加强方向：${improveText}` : '',
      `四、下一阶段学习规划：${nextText}`,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  // Default: warm
  return [
    `${parentGreeting}！转眼 ${year} 年即将结束，感谢您一直以来对补习课程的信任与配合。`,
    `${attendancePhrase}。这一年来，${name} ${strengthText}${highlightText ? ' ' + highlightText : ''}`,
    improveText ? `${improveText} 老师会在接下来的课堂中继续陪伴引导。` : '',
    `${nextText} 祝愿 ${name} 在新的一年学业进步、自信成长！`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function buildAnnualReportPrompt(params: {
  student: Student;
  year: string;
  stats: AnnualReportStats;
  selectedTags: Record<string, string[]>;
  ratings: AnnualReportRatings;
  highlights: string;
  nextYearGoal: string;
  tone: AnnualReportTone;
  existingDraft?: string;
  mode: 'generate' | 'polish';
}): string {
  const { student, year, stats, selectedTags, ratings, highlights, nextYearGoal, tone, existingDraft, mode } = params;
  const toneLabel = TONE_OPTIONS.find(t => t.value === tone)?.label || '温柔鼓励型';

  const tagSummary = EVALUATION_DIMENSIONS.map(dim => {
    const picked = selectedTags[dim.key] || [];
    return picked.length > 0 ? `- ${dim.label}：${picked.join('、')}` : null;
  })
    .filter(Boolean)
    .join('\n');

  return `你是一位经验丰富、富有爱心的马来西亚中小学补习老师。请用自然、真诚的简体中文，为家长撰写一份学生「${year} 年度补习表现总结」评语。

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

【老师勾选的表现标签】
${tagSummary || '（暂无勾选标签）'}

【年度亮点 / 补充事实】
${highlights.trim() || '（无）'}

【来年学习建议】
${nextYearGoal.trim() || '（无）'}

${mode === 'polish' && existingDraft?.trim() ? `【老师手写初稿（请保留其中的具体事实和分数，进行润色使其更通顺得体）】\n${existingDraft.trim()}\n` : ''}
【输出要求】
1. 语气风格：${toneLabel}。
2. 字数控制在 150～280 字之间，分段清晰，适合发在报告卡或 WhatsApp 给家长阅读。
3. 不要使用空洞夸张的套话，要贴合上面提供的真实标签、出勤情况与老师补充的细节。
4. 直接输出最终评语正文，不要加多余的解释或标题前缀。`;
}

export async function generateWithGeminiAPI(apiKey: string, prompt: string): Promise<string> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error('请先输入 Gemini API Key');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(trimmedKey)}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    let message = `API 请求失败 (${res.status})`;
    try {
      const parsed = JSON.parse(errText);
      if (parsed?.error?.message) message = parsed.error.message;
    } catch {
      // ignore parse failure
    }
    throw new Error(message);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('AI 未返回有效内容，请重试');
  }
  return text.trim();
}
