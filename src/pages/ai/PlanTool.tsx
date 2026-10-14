import { useState } from 'react';
import { Check, RotateCcw, Sparkles } from 'lucide-react';
import { useLanguage } from '@/i18n/useLanguage';

type Task = { label: string; n?: number };
type Goal = 'vocab' | 'exam';
type Plan = { goal: Goal; days: number; minutes: number; tasks: Task[][]; done: string[] };

const STORAGE_KEY = 'aethera.ai.plan';
const dayChoices = [3, 7, 14];
const minuteChoices = [10, 15, 30];
const goals: { id: Goal; label: string; hint: string }[] = [
  { id: 'vocab', label: 'Học từ vựng mới', hint: 'Mỗi ngày thêm vài từ mới' },
  { id: 'exam', label: 'Ôn thi', hint: 'Ôn lại và kiểm tra các từ đã học' },
];

const vocabActivities = ['Ôn bằng Flashcard', 'Làm Quiz nối từ', 'Luyện nghe bản địa', 'Nói thử 1–2 câu ở mục Luyện giao tiếp'];
const examActivities = ['Ôn các từ chưa thuộc bằng Flashcard', 'Làm Quiz nối từ', 'Nghe lại các từ khó', 'Nói thử một đoạn ngắn'];

function buildTasks(goal: Goal, days: number, minutes: number): Task[][] {
  const perDay = minutes <= 10 ? 2 : minutes <= 15 ? 3 : 4;
  const activities = goal === 'vocab' ? vocabActivities : examActivities;
  return Array.from({ length: days }, (_, index) => {
    const isLast = index === days - 1 && days > 1;
    if (isLast) return [{ label: 'Ôn lại toàn bộ từ đã học' }, { label: 'Làm một lượt Quiz tổng hợp' }];
    const first: Task = goal === 'vocab' ? { label: 'Học từ mới trong Sổ từ vựng', n: perDay } : { label: 'Ôn lại từ đã ghim trong Sổ từ vựng', n: perDay + 1 };
    return [first, { label: activities[index % activities.length] }];
  });
}

function loadPlan(): Plan | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Plan | null;
    return parsed && Array.isArray(parsed.tasks) && Array.isArray(parsed.done) ? parsed : null;
  } catch {
    return null;
  }
}

export function PlanTool() {
  const { t } = useLanguage();
  const [plan, setPlan] = useState<Plan | null>(loadPlan);
  const [goal, setGoal] = useState<Goal>('vocab');
  const [days, setDays] = useState(7);
  const [minutes, setMinutes] = useState(15);

  const save = (next: Plan | null) => {
    setPlan(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // The plan then lives only in memory.
    }
  };

  const toggle = (key: string) => {
    if (!plan) return;
    save({ ...plan, done: plan.done.includes(key) ? plan.done.filter((item) => item !== key) : [...plan.done, key] });
  };

  if (!plan) {
    return (
      <form className="aip-setup" onSubmit={(event) => { event.preventDefault(); save({ goal, days, minutes, tasks: buildTasks(goal, days, minutes), done: [] }); }}>
        <fieldset>
          <legend>{t('Em muốn học gì?')}</legend>
          <div className="aip-goals">
            {goals.map((item) => (
              <button type="button" key={item.id} className={goal === item.id ? 'aip-on' : ''} onClick={() => setGoal(item.id)} aria-pressed={goal === item.id}>
                <strong>{t(item.label)}</strong>
                <span>{t(item.hint)}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>{t('Trong bao nhiêu ngày?')}</legend>
          <div className="aip-pills">
            {dayChoices.map((value) => (
              <button type="button" key={value} className={days === value ? 'aip-on' : ''} onClick={() => setDays(value)} aria-pressed={days === value}>{value} {t('ngày')}</button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>{t('Mỗi ngày học bao lâu?')}</legend>
          <div className="aip-pills">
            {minuteChoices.map((value) => (
              <button type="button" key={value} className={minutes === value ? 'aip-on' : ''} onClick={() => setMinutes(value)} aria-pressed={minutes === value}>{value} {t('phút')}</button>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="aix-primary aip-make"><Sparkles size={18} /> {t('Tạo lộ trình')}</button>
      </form>
    );
  }

  const total = plan.tasks.reduce((sum, list) => sum + list.length, 0);
  const finished = plan.done.length;
  const dayDone = (index: number) => plan.tasks[index].every((_, taskIndex) => plan.done.includes(`${index}-${taskIndex}`));
  const nextDay = plan.tasks.findIndex((_, index) => !dayDone(index));

  return (
    <div className="aip-plan">
      <div className="aip-summary">
        <div>
          <small>{plan.days} {t('ngày')} · {plan.minutes} {t('phút')} {t('mỗi ngày')}</small>
          <strong>{nextDay === -1 ? t('Em đã hoàn thành lộ trình!') : `${t('Đã xong')} ${finished}/${total} ${t('việc')}`}</strong>
        </div>
        <div className="aip-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={finished}><i style={{ width: `${(finished / total) * 100}%` }} /></div>
        <button type="button" className="aix-ghost" onClick={() => { if (window.confirm(t('Tạo lộ trình mới? Tiến độ hiện tại sẽ bị xóa.'))) save(null); }}><RotateCcw size={15} /> {t('Lộ trình mới')}</button>
      </div>

      <ol className="aip-days">
        {plan.tasks.map((list, index) => (
          <li key={index} className={`aip-day ${dayDone(index) ? 'aip-day-done' : ''} ${index === nextDay ? 'aip-day-next' : ''}`}>
            <header>
              <span className="aip-num">{dayDone(index) ? <Check size={16} /> : index + 1}</span>
              <strong>{t('Ngày')} {index + 1}</strong>
              {index === nextDay && <em>{t('Hôm nay')}</em>}
            </header>
            <ul>
              {list.map((task, taskIndex) => {
                const key = `${index}-${taskIndex}`;
                const checked = plan.done.includes(key);
                return (
                  <li key={key}>
                    <label className={checked ? 'aip-checked' : ''}>
                      <input type="checkbox" checked={checked} onChange={() => toggle(key)} />
                      <span>{t(task.label)}{task.n ? ` · ${task.n} ${t('từ')}` : ''}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
