import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import apiClient from '../lib/apiClient';
import '../styles/StreakCalendar.css';

const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const AI_QUOTES = [
  'You are building momentum one day at a time—keep going the distance.',
  'Small daily wins stack into big outcomes. Stay steady and keep going the distance.',
  'Your consistency is your superpower. Keep going the distance.',
  'Progress is proof. Keep showing up and keep going the distance.',
  'You are closer than you think. Keep going the distance today.',
];

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getMondayFirstDayIndex(date) {
  const nativeDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  return nativeDay === 0 ? 6 : nativeDay - 1;
}

function getStreakCount(completedDateSet) {
  const today = startOfDay(new Date());
  const todayIso = toISODate(today);

  let cursor = today;
  if (!completedDateSet.has(todayIso)) {
    cursor = new Date(today);
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (completedDateSet.has(toISODate(cursor))) {
    streak += 1;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export default function StreakCalendar({ userId, onFirstLoginWelcome }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [completedDates, setCompletedDates] = useState([]);
  const [streakCount, setStreakCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestInFlight, setRequestInFlight] = useState(false);

  const completedDateSet = useMemo(() => new Set(completedDates), [completedDates]);
  const fallbackStreakCount = useMemo(() => getStreakCount(completedDateSet), [completedDateSet]);

  useEffect(() => {
    const fetchStreak = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get('/users/streak');
        setCompletedDates(response.data.completedDates || []);
        setStreakCount(response.data.streakCount ?? 0);
      } catch (err) {
        console.error('Failed to fetch streak data:', err);
        setCompletedDates([]);
        setStreakCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchStreak();
  }, [userId]);

  useEffect(() => {
    if (!onFirstLoginWelcome || loading) {
      return;
    }

    // Check if welcome was already shown in this session
    const welcomeShownKey = `streak_welcome_shown_${userId}`;
    const lastShownSession = localStorage.getItem(welcomeShownKey);
    const currentToken = localStorage.getItem('token');
    
    // Only show if not shown in this login session (token)
    if (lastShownSession === currentToken) {
      return;
    }

    const todayIso = toISODate(new Date());

    const countForQuote = streakCount !== null ? streakCount : fallbackStreakCount;
    const quoteIndex = Math.abs((countForQuote + todayIso.length) % AI_QUOTES.length);
    onFirstLoginWelcome({
      streakCount: countForQuote,
      quote: AI_QUOTES[quoteIndex],
    });
    
    // Mark as shown for this session
    localStorage.setItem(welcomeShownKey, currentToken);
  }, [onFirstLoginWelcome, streakCount, fallbackStreakCount, loading, userId]);

  const monthDays = daysInMonth(currentMonth);
  const leadingSlots = getMondayFirstDayIndex(currentMonth);
  const today = startOfDay(new Date());

  const handleToggleDay = (dayNumber) => {
    const targetDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNumber);
    const targetIso = toISODate(targetDate);
    const todayIso = toISODate(today);

    // Only allow toggling today's date - no past or future dates
    if (targetIso !== todayIso) {
      return;
    }

    if (requestInFlight) {
      return;
    }

    const syncToggle = async () => {
      setRequestInFlight(true);
      try {
        const isCompleted = completedDateSet.has(targetIso);
        const response = isCompleted
          ? await apiClient.delete(`/users/streak/${targetIso}`)
          : await apiClient.put('/users/streak', { date: targetIso });

        setCompletedDates(response.data.completedDates || []);
        setStreakCount(response.data.streakCount ?? 0);
      } catch (err) {
        console.error('Failed to update streak:', err);
      } finally {
        setRequestInFlight(false);
      }
    };

    syncToggle();
  };

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthLabel = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  }).toUpperCase();

  return (
    <section className="streak-calendar-card">
      <header className="streak-calendar-header">
        <div className="streak-month-controls">
          <button className="streak-month-btn" onClick={goToPreviousMonth} title="Previous month">
            <ChevronLeft size={18} />
          </button>
          <h3>{monthLabel}</h3>
          <button className="streak-month-btn" onClick={goToNextMonth} title="Next month">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="streak-count-badge" title="Current streak">
          🔥 {streakCount !== null ? streakCount : (loading ? '...' : fallbackStreakCount)}
        </div>
      </header>

      <div className="streak-weekdays">
        {WEEK_LABELS.map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>

      <div className="streak-days-grid">
        {Array.from({ length: leadingSlots }).map((_, index) => (
          <span key={`empty-${index}`} className="streak-empty-slot" />
        ))}

        {Array.from({ length: monthDays }).map((_, index) => {
          const dayNumber = index + 1;
          const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNumber);
          const isoDate = toISODate(date);
          const isCompleted = completedDateSet.has(isoDate);
          const isFuture = startOfDay(date) > today;
          const isToday = toISODate(today) === isoDate;
          const isPast = startOfDay(date) < today;

          return (
            <button
              key={isoDate}
              className={`streak-day ${isCompleted ? 'completed' : ''} ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''} ${isPast ? 'past' : ''}`}
              onClick={() => handleToggleDay(dayNumber)}
              disabled={!isToday}
              title={
                isToday 
                  ? (isCompleted ? 'Unmark today\'s task' : 'Mark today\'s task complete')
                  : isPast
                  ? 'Past dates cannot be modified'
                  : 'Future dates cannot be marked'
              }
            >
              <span className="streak-day-number">{dayNumber}</span>
              <span className={`streak-day-tick ${isCompleted ? 'visible' : ''}`}>
                <Check size={12} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
