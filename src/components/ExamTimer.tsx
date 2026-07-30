import React, { useEffect } from 'react';
import { Clock, AlertTriangle, Hourglass } from 'lucide-react';

interface ExamTimerProps {
  timeLeft: number;
  totalDurationMinutes: number;
  isActive: boolean;
  onTimeUp: () => void;
  isSubmitting?: boolean;
}

export default function ExamTimer({
  timeLeft,
  totalDurationMinutes,
  isActive,
  onTimeUp,
  isSubmitting = false,
}: ExamTimerProps) {
  // Trigger onTimeUp callback when time reaches 0
  useEffect(() => {
    if (isActive && timeLeft === 0 && !isSubmitting) {
      onTimeUp();
    }
  }, [timeLeft, isActive, isSubmitting, onTimeUp]);

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalSeconds = totalDurationMinutes * 60;
  const percentageLeft = totalSeconds > 0 ? Math.min(100, Math.max(0, (timeLeft / totalSeconds) * 100)) : 0;
  const isWarning = timeLeft <= 300 && timeLeft > 0; // Less than 5 minutes
  const isCritical = timeLeft <= 60 && timeLeft > 0;  // Less than 1 minute
  const isTimeUp = timeLeft <= 0;

  return (
    <div className="w-full space-y-2">
      <div
        className={`px-5 py-3.5 rounded-2xl border flex items-center justify-between gap-4 transition-all shadow-sm ${
          isTimeUp
            ? 'bg-rose-100 border-rose-400 text-rose-950 ring-2 ring-rose-400'
            : isCritical
            ? 'bg-rose-50 border-rose-300 text-rose-900 ring-2 ring-rose-400/60 animate-pulse'
            : isWarning
            ? 'bg-amber-50 border-amber-300 text-amber-900'
            : 'bg-gradient-to-r from-slate-50 via-amber-50/50 to-slate-50 border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 ${
              isTimeUp || isCritical
                ? 'bg-rose-500 text-white animate-bounce'
                : isWarning
                ? 'bg-amber-500 text-white'
                : 'bg-amber-400 text-[#0f2a4a]'
            }`}
          >
            {isTimeUp ? (
              <AlertTriangle className="h-6 w-6" />
            ) : isCritical || isWarning ? (
              <Hourglass className="h-6 w-6 animate-spin" />
            ) : (
              <Clock className="h-6 w-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                រយៈពេលនៅសល់ (សរុប {totalDurationMinutes} នាទី)
              </span>
              {isTimeUp ? (
                <span className="text-[11px] font-extrabold bg-rose-600 text-white px-2.5 py-0.5 rounded-full">
                  អស់ម៉ោងធ្វើតេស្ត!
                </span>
              ) : isCritical ? (
                <span className="text-[10px] font-extrabold bg-rose-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                  ជិតអស់ម៉ោងមែនទែន!
                </span>
              ) : isWarning ? (
                <span className="text-[10px] font-extrabold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                  នៅសល់ក្រោម ៥នាទី!
                </span>
              ) : null}
            </div>

            <div
              className={`text-2xl sm:text-3xl font-black font-mono tracking-widest ${
                isTimeUp || isCritical ? 'text-rose-600' : isWarning ? 'text-amber-700' : 'text-[#0f2a4a]'
              }`}
            >
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        {/* Time Progress Indicator */}
        <div className="hidden sm:flex flex-col items-end shrink-0">
          <span className="text-xs font-bold text-slate-500">
            {Math.round(percentageLeft)}% នៅសល់
          </span>
          <span className="text-[11px] text-slate-400">
            {isTimeUp ? 'ប្រព័ន្ធកំពុងប្រគល់លទ្ធផល' : isSubmitting ? 'កំពុងបញ្ជូន...' : 'ដំណើរការស្វ័យប្រវត្តិ'}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      {totalSeconds > 0 && (
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
          <div
            className={`h-full transition-all duration-1000 ${
              isTimeUp || isCritical
                ? 'bg-rose-500'
                : isWarning
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${percentageLeft}%` }}
          />
        </div>
      )}
    </div>
  );
}
