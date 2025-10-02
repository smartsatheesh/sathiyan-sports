'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../coach.module.css';

interface WorkoutDay {
  workout?: string;
  duration?: string;
  intensity?: string;
  equipment?: string[];
  motivation?: string;
}

interface CoachingPlan {
  athleteProfile: {
    name: string;
    age: number;
    sport: string;
    skillLevel: string;
  };
  coachingPlan: {
    overview: string;
    months: {
      [key: string]: {
        focus: string;
        weeks: {
          [key: string]: {
            days: {
              [key: string]: WorkoutDay;
            };
          };
        };
      };
    };
    nutritionGuidance?: any;
    motivationalQuotes?: string[];
  };
  generatedAt: string;
}

const CalendarView = () => {
  const router = useRouter();
  const [plan, setPlan] = useState<CoachingPlan | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(0); // 0 = month1, 1 = month2, 2 = month3
  const [currentWeek, setCurrentWeek] = useState(0);

  useEffect(() => {
    const savedPlan = localStorage.getItem('coachingPlan');
    if (savedPlan) {
      try {
        const parsedPlan = JSON.parse(savedPlan);
        setPlan(parsedPlan);
        console.log('Loaded plan:', parsedPlan);
      } catch (error) {
        console.error('Error parsing saved plan:', error);
        router.push('/coach');
      }
    } else {
      router.push('/coach');
    }
  }, [router]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getWorkoutForDate = (date: Date): WorkoutDay | null => {
    if (!plan?.coachingPlan?.months) return null;

    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const monthKey = `month${currentMonth + 1}`;
    const weekKey = `week${currentWeek + 1}`;

    try {
      const monthData = plan.coachingPlan.months[monthKey];
      if (!monthData?.weeks) return null;

      const weekData = monthData.weeks[weekKey];
      if (!weekData?.days) return null;

      return weekData.days[dayName] || null;
    } catch (error) {
      console.error('Error getting workout for date:', error);
      return null;
    }
  };

  const getMotivationalQuote = (): string => {
    if (!plan?.coachingPlan?.motivationalQuotes?.length) {
      return "Push yourself, because no one else is going to do it for you! 💪";
    }
    
    const quotes = plan.coachingPlan.motivationalQuotes;
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    return quotes[dayOfYear % quotes.length];
  };

  const nextMonth = () => {
    if (currentMonth < 2) {
      setCurrentMonth(currentMonth + 1);
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };

  const prevMonth = () => {
    if (currentMonth > 0) {
      setCurrentMonth(currentMonth - 1);
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
  };

  const sendDailyNotification = async (workout: WorkoutDay, date: Date) => {
    if (!plan) return;

    const message = `🏃‍♂️ Good morning ${plan.athleteProfile.name}!

🗓️ Today's Training: ${date.toLocaleDateString('en-IN')}
💪 Workout: ${workout.workout || 'Rest Day'}
⏱️ Duration: ${workout.duration || 'N/A'}
🔥 Intensity: ${workout.intensity || 'N/A'}

${workout.motivation || getMotivationalQuote()}

Let's crush it today! 🚀`;

    try {
      // Here you would integrate with your notification system
      // For now, we'll just show an alert
      alert(`Daily notification would be sent:\n\n${message}`);
      
      // You can integrate with WhatsApp, email, or push notifications here
      console.log('Daily notification:', message);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  if (!plan) {
    return (
      <div className={styles.coachContainer}>
        <div className={styles.coachWrapper}>
          <div className={styles.loadingDiv}>
            <div className={styles.spinner}></div>
            <p className={styles.loadingText}>Loading your training calendar...</p>
          </div>
        </div>
      </div>
    );
  }

  const days = getDaysInMonth(currentDate);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className={styles.coachContainer}>
      <div className={styles.coachWrapper}>
        {/* Header */}
        <div className={styles.coachHeader}>
          <div className={styles.coachIcon}>📅</div>
          <h1 className={styles.coachTitle}>Training Calendar</h1>
          <p className={styles.coachSubtitle}>Your Personalized 3-Month Training Plan</p>
          <p className={styles.coachDescription}>
            Athlete: {plan.athleteProfile.name} • Sport: {plan.athleteProfile.sport} • Level: {plan.athleteProfile.skillLevel}
          </p>
        </div>

        {/* Plan Navigation */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Month {currentMonth + 1} of 3</h2>
            <div className="flex gap-2">
              <button
                onClick={prevMonth}
                disabled={currentMonth === 0}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <button
                onClick={nextMonth}
                disabled={currentMonth === 2}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Week Selector */}
          <div className="flex gap-2 mb-4">
            {[0, 1, 2, 3].map((week) => (
              <button
                key={week}
                onClick={() => setCurrentWeek(week)}
                className={`px-4 py-2 rounded-lg ${
                  currentWeek === week
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Week {week + 1}
              </button>
            ))}
          </div>

          {/* Monthly Focus */}
          {plan.coachingPlan?.months?.[`month${currentMonth + 1}`]?.focus && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">🎯 This Month's Focus:</h3>
              <p className="text-blue-700">{plan.coachingPlan.months[`month${currentMonth + 1}`].focus}</p>
            </div>
          )}
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="text-sm text-gray-600">
              Week {currentWeek + 1} • Month {currentMonth + 1}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center font-semibold text-gray-700 bg-gray-100 rounded">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              if (!day) {
                return <div key={index} className="p-2 h-24"></div>;
              }

              const workout = getWorkoutForDate(day);
              const isToday = day.toDateString() === new Date().toDateString();
              const hasWorkout = workout && workout.workout;

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`p-2 h-24 border rounded-lg cursor-pointer transition-all ${
                    isToday
                      ? 'border-blue-500 bg-blue-50'
                      : hasWorkout
                      ? 'border-green-300 bg-green-50 hover:bg-green-100'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-sm font-semibold mb-1">{day.getDate()}</div>
                  {hasWorkout && (
                    <div className="text-xs">
                      <div className="text-green-700 font-medium truncate">
                        {workout.duration}
                      </div>
                      <div className={`text-xs px-1 rounded ${
                        workout.intensity === 'high' ? 'bg-red-200 text-red-700' :
                        workout.intensity === 'medium' ? 'bg-yellow-200 text-yellow-700' :
                        'bg-green-200 text-green-700'
                      }`}>
                        {workout.intensity}
                      </div>
                    </div>
                  )}
                  {isToday && (
                    <div className="text-xs text-blue-600 font-bold">Today</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Workout Details */}
        {selectedDate && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">
                {selectedDate.toLocaleDateString('en-IN', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {(() => {
              const workout = getWorkoutForDate(selectedDate);
              if (!workout || !workout.workout) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-4">😴</div>
                    <p>Rest Day - Recovery is important too!</p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-2">⏱️ Duration</h4>
                      <p className="text-blue-700">{workout.duration}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2">🔥 Intensity</h4>
                      <p className="text-green-700 capitalize">{workout.intensity}</p>
                    </div>
                    <div className="bg-teal-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-teal-800 mb-2">🛠️ Equipment</h4>
                      <p className="text-teal-700">
                        {workout.equipment?.join(', ') || 'None required'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">💪 Workout Details</h4>
                    <p className="text-gray-700 whitespace-pre-wrap">{workout.workout}</p>
                  </div>

                  {workout.motivation && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <h4 className="font-semibold text-yellow-800 mb-2">🌟 Daily Motivation</h4>
                      <p className="text-yellow-700">{workout.motivation}</p>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={() => sendDailyNotification(workout, selectedDate)}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 flex items-center gap-2"
                    >
                      📱 Send Motivation
                    </button>
                    <button
                      onClick={() => {
                        // Mark as completed (you can store this in localStorage or backend)
                        alert(`Great job completing today's workout! 🎉`);
                      }}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
                    >
                      ✅ Mark Complete
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Daily Motivation */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg shadow-lg p-6 text-white mb-6">
          <h3 className="text-xl font-bold mb-3">💡 Daily Motivation</h3>
          <p className="text-lg">{getMotivationalQuote()}</p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={() => router.push('/coach')}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 flex items-center gap-2"
          >
            🔙 Back to Coach
          </button>
          <button
            onClick={() => {
              const today = new Date();
              setSelectedDate(today);
              setCurrentDate(today);
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            📅 Today's Workout
          </button>
          <button
            onClick={() => {
              // Export calendar to Google Calendar (simplified)
              alert('Calendar export feature coming soon! 📅');
            }}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 flex items-center gap-2"
          >
            📤 Export Calendar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;