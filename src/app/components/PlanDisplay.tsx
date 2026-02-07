'use client';

import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import EditableWorkoutModal from './EditableWorkoutModal';
import styles from './PlanDisplay.module.css';

interface PlanDisplayProps {
  plan: any;
  userInfo: {
    name: string;
    age: string;
    sport: string;
    skillLevel: string;
    goal: string;
  };
  onExportPDF?: () => void;
}

interface WeeklyPlan {
  week: number;
  startDate: Date;
  endDate: Date;
  focus: string;
  days: Array<{
    day: string;
    date: Date;
    workout?: string;
    duration?: string;
    intensity?: string;
    completed?: boolean;
    exercises?: any[];
    warmup?: string;
    cooldown?: string;
    tips?: string;
    equipment?: string[];
  }>;
}

const PlanDisplay: React.FC<PlanDisplayProps> = ({ plan, userInfo, onExportPDF }) => {
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly' | 'daily'>('weekly');
  const [selectedDay, setSelectedDay] = useState(0);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDayWorkout, setSelectedDayWorkout] = useState<any>(null);
  const [selectedModalDate, setSelectedModalDate] = useState<Date | null>(null);
  const planRef = useRef<HTMLDivElement>(null);

  // Generate weekly plan data with dates
  const generateWeeklyPlan = (): WeeklyPlan[] => {
    const startDate = new Date();
    const weeks: WeeklyPlan[] = [];
    
    for (let week = 0; week < 12; week++) { // 3 months = 12 weeks
      const weekStartDate = new Date(startDate);
      weekStartDate.setDate(startDate.getDate() + (week * 7));
      
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 6);
      
      const month = Math.floor(week / 4) + 1;
      const weekInMonth = (week % 4) + 1;
      
      const weekPlan: WeeklyPlan = {
        week: week + 1,
        startDate: weekStartDate,
        endDate: weekEndDate,
        focus: getFocusForWeek(month, weekInMonth),
        days: []
      };
      
      // Generate daily plan for the week
      for (let day = 0; day < 7; day++) {
        const dayDate = new Date(weekStartDate);
        dayDate.setDate(weekStartDate.getDate() + day);
        
        const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        weekPlan.days.push({
          day: dayName,
          date: dayDate,
          workout: getWorkoutForDay(month, weekInMonth, dayName),
          duration: getDurationForDay(dayName),
          intensity: getIntensityForWeek(weekInMonth),
          completed: false
        });
      }
      
      weeks.push(weekPlan);
    }
    
    return weeks;
  };

  const getFocusForWeek = (month: number, week: number): string => {
    const focuses = {
      1: ['Foundation Building', 'Basic Skills', 'Endurance Base', 'Flexibility'],
      2: ['Strength Development', 'Skill Refinement', 'Power Training', 'Advanced Techniques'],
      3: ['Peak Performance', 'Competition Prep', 'Advanced Skills', 'Maintenance']
    };
    return focuses[month as keyof typeof focuses]?.[week - 1] || 'General Training';
  };

  const getWorkoutForDay = (month: number, week: number, day: string): string => {
    if (day === 'saturday' || day === 'sunday') {
      return day === 'saturday' ? 'Light Activity / Recovery' : 'Complete Rest';
    }
    
    const workouts = {
      monday: 'Strength & Conditioning',
      tuesday: 'Sport-Specific Skills',
      wednesday: 'Cardio & Endurance',
      thursday: 'Technical Training',
      friday: 'Game Simulation'
    };
    
    return workouts[day as keyof typeof workouts] || 'General Training';
  };

  const getDurationForDay = (day: string): string => {
    const durations = {
      monday: '60-90 minutes',
      tuesday: '45-60 minutes',
      wednesday: '30-45 minutes',
      thursday: '60-75 minutes',
      friday: '45-90 minutes',
      saturday: '30 minutes',
      sunday: 'Rest'
    };
    
    return durations[day as keyof typeof durations] || '60 minutes';
  };

  const getIntensityForWeek = (week: number): string => {
    const intensities = ['Low', 'Medium', 'High', 'Peak'];
    return intensities[week - 1] || 'Medium';
  };

  const exportToPDF = async () => {
    if (!planRef.current) return;
    
    setExportingPDF(true);
    
    try {
      const canvas = await html2canvas(planRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      // Add header with user info
      pdf.setFontSize(20);
      pdf.text(`${userInfo.name}'s Training Plan`, 20, 20);
      pdf.setFontSize(12);
      pdf.text(`Sport: ${userInfo.sport} | Level: ${userInfo.skillLevel}`, 20, 30);
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 20, 40);
      
      position = 50;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`${userInfo.name.replace(/\s+/g, '-')}-training-plan.pdf`);
      
      if (onExportPDF) {
        onExportPDF();
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  // Initialize weekly plans and load completion status from localStorage
  useEffect(() => {
    const plans = generateWeeklyPlan();
    
    // Load completion status from localStorage
    const savedCompletions = localStorage.getItem(`completions_${userInfo.name}_${userInfo.sport}`);
    if (savedCompletions) {
      const completions = JSON.parse(savedCompletions);
      plans.forEach(week => {
        week.days.forEach(day => {
          const dayKey = `${week.week}_${day.day}`;
          if (completions[dayKey]) {
            day.completed = completions[dayKey];
          }
        });
      });
    }
    
    setWeeklyPlans(plans);
  }, [userInfo]);

  // Bulk completion functions
  const markWeekAsComplete = (weekIndex: number) => {
    const updatedPlans = [...weeklyPlans];
    updatedPlans[weekIndex].days.forEach(day => {
      if (day.workout && day.workout !== 'Complete Rest') {
        day.completed = true;
      }
    });
    setWeeklyPlans(updatedPlans);
    
    // Save to localStorage
    const savedCompletions = JSON.parse(localStorage.getItem(`completions_${userInfo.name}_${userInfo.sport}`) || '{}');
    updatedPlans[weekIndex].days.forEach(day => {
      if (day.workout && day.workout !== 'Complete Rest') {
        const dayKey = `${updatedPlans[weekIndex].week}_${day.day}`;
        savedCompletions[dayKey] = true;
      }
    });
    localStorage.setItem(`completions_${userInfo.name}_${userInfo.sport}`, JSON.stringify(savedCompletions));
    
    showNotification('✅ Week marked as complete!', '#10b981');
  };

  const markMonthAsComplete = (month: number) => {
    const startWeek = (month - 1) * 4;
    const endWeek = Math.min(startWeek + 4, weeklyPlans.length);
    
    const updatedPlans = [...weeklyPlans];
    for (let i = startWeek; i < endWeek; i++) {
      updatedPlans[i].days.forEach(day => {
        if (day.workout && day.workout !== 'Complete Rest') {
          day.completed = true;
        }
      });
    }
    setWeeklyPlans(updatedPlans);
    
    // Save to localStorage
    const savedCompletions = JSON.parse(localStorage.getItem(`completions_${userInfo.name}_${userInfo.sport}`) || '{}');
    for (let i = startWeek; i < endWeek; i++) {
      updatedPlans[i].days.forEach(day => {
        if (day.workout && day.workout !== 'Complete Rest') {
          const dayKey = `${updatedPlans[i].week}_${day.day}`;
          savedCompletions[dayKey] = true;
        }
      });
    }
    localStorage.setItem(`completions_${userInfo.name}_${userInfo.sport}`, JSON.stringify(savedCompletions));
    
    showNotification('✅ Month marked as complete!', '#3b82f6');
  };

  const clearAllCompletions = () => {
    const updatedPlans = [...weeklyPlans];
    updatedPlans.forEach(week => {
      week.days.forEach(day => {
        day.completed = false;
      });
    });
    setWeeklyPlans(updatedPlans);
    
    // Clear localStorage
    localStorage.removeItem(`completions_${userInfo.name}_${userInfo.sport}`);
    
    showNotification('🗑️ All completions cleared!', '#ef4444');
  };

  const showNotification = (message: string, color: string) => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${color};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 500;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      animation: slideInRight 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  // Handle day click to show detailed workout information
  const handleDayClick = (day: any) => {
    console.log('🔍 Day clicked:', day);
    console.log('🏃 Workout:', day.workout);
    console.log('📅 Date:', day.date);
    
    // Always open modal, even for rest days (to allow coaches to add workouts)
    const workoutData = {
      type: day.workout || 'Rest Day',
      duration: day.duration || '30 minutes',
      intensity: day.intensity || 'Low',
      warmup: day.warmup || 'Light movement and stretching',
      cooldown: day.cooldown || 'Relaxation and breathing',
      tips: day.tips || 'Use this time for recovery and planning',
      exercises: day.exercises || []
    };
    
    setSelectedDayWorkout(workoutData);
    setSelectedModalDate(day.date);
    setModalOpen(true);
    
    console.log('✅ Modal opening with data:', workoutData);
  };

  // Extract detailed workout information
  const getDetailedWorkoutInfo = (workoutDay: any) => {
    const dayName = workoutDay.day.toLowerCase();
    const weekNumber = workoutDay.week || 1;
    
    // Try to get detailed info from the plan if available
    const planData = plan?.coachingPlan;
    const weeklySchedule = planData?.weeklySchedule;
    
    if (weeklySchedule) {
      const weekKey = `week${weekNumber}`;
      const weekData = weeklySchedule[weekKey];
      const dayData = weekData?.days?.[dayName];
      
      if (dayData) {
        return {
          type: dayData.type || workoutDay.workout,
          duration: dayData.duration || workoutDay.duration,
          intensity: dayData.intensity || workoutDay.intensity,
          exercises: dayData.exercises || [],
          warmup: dayData.warmup,
          cooldown: dayData.cooldown,
          tips: dayData.tips,
          equipment: workoutDay.equipment || []
        };
      }
    }
    
    // Fallback to generating exercise details based on workout type
    return generateWorkoutDetails(workoutDay);
  };

  // Generate detailed workout information when not available in plan
  const generateWorkoutDetails = (workoutDay: any) => {
    const workoutType = workoutDay.workout || 'General Training';
    
    const workoutTemplates: { [key: string]: any } = {
      'Strength & Conditioning': {
        type: 'Strength Training',
        duration: workoutDay.duration || '60-90 minutes',
        intensity: workoutDay.intensity || 'Medium',
        exercises: [
          {
            name: 'Push-ups',
            sets: 3,
            reps: '10-15',
            restBetweenSets: '60 seconds',
            instructions: 'Keep body straight, lower chest to ground, push up explosively',
            equipment: 'None',
            targetMuscles: ['Chest', 'Triceps', 'Core']
          },
          {
            name: 'Squats',
            sets: 3,
            reps: '15-20',
            restBetweenSets: '60 seconds',
            instructions: 'Keep feet shoulder-width apart, lower until thighs parallel to ground',
            equipment: 'None',
            targetMuscles: ['Quadriceps', 'Glutes', 'Core']
          }
        ],
        warmup: '5-10 minutes light jogging or dynamic stretching',
        cooldown: '5-10 minutes static stretching',
        tips: 'Focus on proper form over speed. Increase reps gradually.'
      },
      'Sport-Specific Skills': {
        type: 'Skill Development',
        duration: workoutDay.duration || '45-60 minutes',
        intensity: workoutDay.intensity || 'Medium',
        exercises: [
          {
            name: 'Agility Ladder Drills',
            sets: 4,
            reps: '2 runs each pattern',
            restBetweenSets: '90 seconds',
            instructions: 'Quick feet, stay on balls of feet, maintain good posture',
            equipment: 'Agility ladder',
            targetMuscles: ['Legs', 'Core', 'Coordination']
          }
        ],
        warmup: '10 minutes dynamic warm-up with sport-specific movements',
        cooldown: '10 minutes stretching focusing on worked muscles',
        tips: 'Focus on technique and precision before adding speed.'
      },
      'Cardio & Endurance': {
        type: 'Cardiovascular Training',
        duration: workoutDay.duration || '30-45 minutes',
        intensity: workoutDay.intensity || 'Medium',
        exercises: [
          {
            name: 'Running',
            duration: '20-30 minutes',
            instructions: 'Maintain steady pace, breathe rhythmically',
            equipment: 'Running shoes',
            targetMuscles: ['Legs', 'Cardiovascular System']
          }
        ],
        warmup: '5 minutes light walking or easy movement',
        cooldown: '5-10 minutes walking and stretching',
        tips: 'Monitor heart rate, stay hydrated throughout.'
      }
    };
    
    return workoutTemplates[workoutType] || {
      type: workoutType,
      duration: workoutDay.duration || '60 minutes',
      intensity: workoutDay.intensity || 'Medium',
      exercises: [
        {
          name: 'General Exercise',
          instructions: 'Follow your coach\'s instructions for this workout',
          equipment: 'As needed',
          targetMuscles: ['Various']
        }
      ],
      warmup: '5-10 minutes light activity',
      cooldown: '5-10 minutes stretching',
      tips: 'Listen to your body and maintain proper form.'
    };
  };

  const monthNames = ['Month 1: Foundation', 'Month 2: Development', 'Month 3: Peak Performance'];

  return (
    <div className={styles.planContainer} ref={planRef}>
      <div className={styles.planHeader}>
        <h2 className={styles.planTitle}>🏃‍♂️ Your Personalized Training Plan</h2>
        <div className={styles.planMeta}>
          <span>Duration: 3 Months</span>
          <span>Sport: {userInfo.sport}</span>
          <span>Level: {userInfo.skillLevel}</span>
        </div>
      </div>

      {/* Export Controls */}
      <div className={styles.exportControls}>
        <button
          onClick={exportToPDF}
          disabled={exportingPDF}
          className={`${styles.exportBtn} ${styles.pdfBtn}`}
        >
          {exportingPDF ? (
            <>
              <span className={styles.spinner}></span>
              Generating PDF...
            </>
          ) : (
            <>
              📄 Export PDF
            </>
          )}
        </button>
      </div>

      {/* View Mode Selector */}
      <div className={styles.viewModeSelector}>
        {(['monthly', 'weekly', 'daily'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`${styles.viewModeBtn} ${viewMode === mode ? styles.active : ''}`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      <div className={styles.bulkActions}>
        <div className={styles.bulkActionLabel}>Quick Complete:</div>
        
        {viewMode === 'monthly' && (
          <button
            onClick={() => markMonthAsComplete(selectedMonth)}
            className={`${styles.bulkActionBtn} ${styles.selectAllMonth}`}
          >
            📅 Complete This Month
          </button>
        )}
        
        {(viewMode === 'weekly' || viewMode === 'daily') && (
          <button
            onClick={() => markWeekAsComplete(selectedWeek)}
            className={`${styles.bulkActionBtn} ${styles.selectAllWeek}`}
          >
            ✅ Complete This Week
          </button>
        )}
        
        <button
          onClick={clearAllCompletions}
          className={`${styles.bulkActionBtn} ${styles.clearAll}`}
        >
          🗑️ Clear All
        </button>
      </div>

      {/* Navigation - conditional based on view mode */}
      {viewMode !== 'daily' && (
        <div className={styles.monthNavigation}>
          {monthNames.map((month, index) => (
            <button
              key={index}
              onClick={() => {
                setSelectedMonth(index + 1);
                setSelectedWeek(index * 4);
              }}
              className={`${styles.monthBtn} ${selectedMonth === index + 1 ? styles.active : ''}`}
            >
              {month}
            </button>
          ))}
        </div>
      )}

      {/* Week Navigation */}
      <div className={styles.weekNavigation}>
        {weeklyPlans
          .filter((_, index) => Math.floor(index / 4) + 1 === selectedMonth)
          .map((weekPlan, index) => {
            const actualWeekIndex = (selectedMonth - 1) * 4 + index;
            return (
              <button
                key={actualWeekIndex}
                onClick={() => setSelectedWeek(actualWeekIndex)}
                className={`${styles.weekBtn} ${selectedWeek === actualWeekIndex ? styles.active : ''}`}
              >
                Week {index + 1}
                <span className={styles.weekDate}>
                  {weekPlan.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </button>
            );
          })}
      </div>

      {/* Selected Week Display */}
      {weeklyPlans[selectedWeek] && (
        <div className={styles.weekDisplay}>
          <div className={styles.weekHeader}>
            <h3 className={styles.weekTitle}>
              Week {weeklyPlans[selectedWeek].week}: {weeklyPlans[selectedWeek].focus}
            </h3>
            <p className={styles.weekDates}>
              {weeklyPlans[selectedWeek].startDate.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric' 
              })} - {weeklyPlans[selectedWeek].endDate.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
          </div>

          <div className={styles.daysGrid}>
            {weeklyPlans[selectedWeek].days.map((day, index) => (
              <div key={index} className={`${styles.dayCard} ${day.day === 'sunday' ? styles.restDay : ''}`}>
                <div className={styles.dayHeader}>
                  <h4 className={styles.dayName}>
                    {day.day.charAt(0).toUpperCase() + day.day.slice(1)}
                  </h4>
                  <span className={styles.dayDate}>
                    {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                
                <div className={styles.dayContent}>
                  <p className={styles.workout}>{day.workout}</p>
                  <div className={styles.dayMeta}>
                    <span className={styles.duration}>⏱️ {day.duration}</span>
                    <span className={`${styles.intensity} ${styles[day.intensity?.toLowerCase() || 'medium']}`}>
                      🔥 {day.intensity}
                    </span>
                  </div>
                </div>
                
                <div className={styles.dayActions}>
                  <label className={styles.completedCheck}>
                    <input
                      type="checkbox"
                      checked={day.completed}
                      onChange={(e) => {
                        // Update completion status
                        const updatedPlans = [...weeklyPlans];
                        updatedPlans[selectedWeek].days[index].completed = e.target.checked;
                        setWeeklyPlans(updatedPlans);
                        
                        // Save completion status to localStorage
                        const savedCompletions = JSON.parse(localStorage.getItem(`completions_${userInfo.name}_${userInfo.sport}`) || '{}');
                        const dayKey = `${weeklyPlans[selectedWeek].week}_${day.day}`;
                        savedCompletions[dayKey] = e.target.checked;
                        localStorage.setItem(`completions_${userInfo.name}_${userInfo.sport}`, JSON.stringify(savedCompletions));
                        
                        // Show notification
                        if (e.target.checked) {
                          // Create and show success notification
                          const notification = document.createElement('div');
                          notification.className = 'completion-notification';
                          notification.textContent = `✅ ${day.day} workout completed!`;
                          notification.style.cssText = `
                            position: fixed;
                            top: 20px;
                            right: 20px;
                            background: #4ade80;
                            color: white;
                            padding: 12px 20px;
                            border-radius: 8px;
                            font-weight: 500;
                            z-index: 1000;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                            animation: slideInRight 0.3s ease-out;
                          `;
                          document.body.appendChild(notification);
                          
                          // Remove notification after 3 seconds
                          setTimeout(() => {
                            notification.remove();
                          }, 3000);
                        }
                      }}
                    />
                    <span>Completed</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily View */}
      {viewMode === 'daily' && weeklyPlans[selectedWeek] && weeklyPlans[selectedWeek].days[selectedDay] && (
        <div className={styles.dailyView}>
          <div className={styles.dailyHeader}>
            <h3 className={styles.dailyTitle}>
              {weeklyPlans[selectedWeek].days[selectedDay].day.charAt(0).toUpperCase() + weeklyPlans[selectedWeek].days[selectedDay].day.slice(1)} Workout
            </h3>
            <p className={styles.dailyDate}>
              {weeklyPlans[selectedWeek].days[selectedDay].date.toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          <div className={styles.dailyContent}>
            <div className={styles.dailyWorkoutCard}>
              <div className={styles.dailyWorkoutHeader}>
                <h4>{weeklyPlans[selectedWeek].days[selectedDay].workout}</h4>
                <div className={styles.dailyWorkoutMeta}>
                  <span className={styles.duration}>⏱️ {weeklyPlans[selectedWeek].days[selectedDay].duration}</span>
                  <span className={`${styles.intensity} ${styles[weeklyPlans[selectedWeek].days[selectedDay].intensity?.toLowerCase() || 'medium']}`}>
                    🔥 {weeklyPlans[selectedWeek].days[selectedDay].intensity}
                  </span>
                </div>
              </div>

              {weeklyPlans[selectedWeek].days[selectedDay].workout !== 'Complete Rest' && (
                <div className={styles.dailyWorkoutActions}>
                  <button
                    onClick={() => handleDayClick(weeklyPlans[selectedWeek].days[selectedDay])}
                    className={styles.viewDetailsBtn}
                  >
                    👁️ View Detailed Instructions
                  </button>
                  
                  <label className={styles.dailyCompletedCheck}>
                    <input
                      type="checkbox"
                      checked={weeklyPlans[selectedWeek].days[selectedDay].completed}
                      onChange={(e) => {
                        const updatedPlans = [...weeklyPlans];
                        updatedPlans[selectedWeek].days[selectedDay].completed = e.target.checked;
                        setWeeklyPlans(updatedPlans);
                        
                        const savedCompletions = JSON.parse(localStorage.getItem(`completions_${userInfo.name}_${userInfo.sport}`) || '{}');
                        const dayKey = `${weeklyPlans[selectedWeek].week}_${weeklyPlans[selectedWeek].days[selectedDay].day}`;
                        savedCompletions[dayKey] = e.target.checked;
                        localStorage.setItem(`completions_${userInfo.name}_${userInfo.sport}`, JSON.stringify(savedCompletions));
                        
                        if (e.target.checked) {
                          showNotification('✅ Workout completed!', '#10b981');
                        }
                      }}
                    />
                    <span>Mark as Completed</span>
                  </label>
                </div>
              )}

              {weeklyPlans[selectedWeek].days[selectedDay].workout === 'Complete Rest' && (
                <div className={styles.restDayMessage}>
                  <p>🛌 Today is a rest day. Take time to recover and prepare for tomorrow's workout!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Plan Overview */}
      <div className={styles.planOverview}>
        <h3 className={styles.overviewTitle}>📋 Plan Overview</h3>
        <div className={styles.overviewContent}>
          {plan.overview && (
            <p className={styles.overviewText}>{plan.overview}</p>
          )}
          
          {plan.goals && (
            <div className={styles.goalsSection}>
              <h4>🎯 Goals</h4>
              <ul className={styles.goalsList}>
                {plan.goals.map((goal: string, index: number) => (
                  <li key={index}>{goal}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Nutrition & Recovery */}
      {plan.nutritionGuidance && (
        <div className={styles.nutritionSection}>
          <h3 className={styles.sectionTitle}>🥗 Nutrition & Recovery</h3>
          <div className={styles.nutritionGrid}>
            {plan.nutritionGuidance.generalTips && (
              <div className={styles.nutritionCard}>
                <h4>General Tips</h4>
                <ul>
                  {plan.nutritionGuidance.generalTips.map((tip: string, index: number) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {plan.nutritionGuidance.preWorkout && (
              <div className={styles.nutritionCard}>
                <h4>Pre-Workout</h4>
                <p>{plan.nutritionGuidance.preWorkout}</p>
              </div>
            )}
            
            {plan.nutritionGuidance.postWorkout && (
              <div className={styles.nutritionCard}>
                <h4>Post-Workout</h4>
                <p>{plan.nutritionGuidance.postWorkout}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress Tracking */}
      {plan.progressTracking && (
        <div className={styles.progressSection}>
          <h3 className={styles.sectionTitle}>📊 Progress Tracking</h3>
          <div className={styles.progressGrid}>
            {plan.progressTracking.weeklyAssessments && (
              <div className={styles.progressCard}>
                <h4>Weekly Assessments</h4>
                <ul>
                  {plan.progressTracking.weeklyAssessments.map((assessment: string, index: number) => (
                    <li key={index}>{assessment}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {plan.progressTracking.milestones && (
              <div className={styles.progressCard}>
                <h4>Milestones</h4>
                <ul>
                  {plan.progressTracking.milestones.map((milestone: string, index: number) => (
                    <li key={index}>{milestone}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Motivational Quotes */}
      {plan.motivationalQuotes && (
        <div className={styles.quotesSection}>
          <h3 className={styles.sectionTitle}>💪 Motivation</h3>
          <div className={styles.quotesGrid}>
            {plan.motivationalQuotes.map((quote: string, index: number) => (
              <div key={index} className={styles.quoteCard}>
                <p>"{quote}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editable Workout Details Modal */}
      <EditableWorkoutModal
        isOpen={modalOpen}
        onClose={() => {
          console.log('🔒 Closing modal');
          setModalOpen(false);
        }}
        date={selectedModalDate}
        workout={selectedDayWorkout}
        onSave={(updatedWorkout) => {
          // Save the updated workout back to the weekly plans
          if (selectedModalDate) {
            const updatedPlans = weeklyPlans.map(week => ({
              ...week,
              days: week.days.map(day => {
                if (day.date && day.date.toDateString() === selectedModalDate.toDateString()) {
                  return {
                    ...day,
                    workout: updatedWorkout.type,
                    duration: updatedWorkout.duration,
                    intensity: updatedWorkout.intensity,
                    warmup: updatedWorkout.warmup,
                    cooldown: updatedWorkout.cooldown,
                    tips: updatedWorkout.tips,
                    exercises: updatedWorkout.exercises
                  };
                }
                return day;
              })
            }));
            setWeeklyPlans(updatedPlans);
            
            // Save to localStorage
            localStorage.setItem('weeklyPlans', JSON.stringify(updatedPlans));
            console.log('💾 Saved updated workout plans');
          }
        }}
        editable={true}
      />
      
      {/* Debug Modal State */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#333',
          color: 'white',
          padding: '1rem',
          borderRadius: '8px',
          fontSize: '0.8rem',
          zIndex: 9999
        }}>
          <div>Modal Open: {modalOpen.toString()}</div>
          <div>Selected Date: {selectedModalDate?.toISOString() || 'null'}</div>
          <div>Selected Workout: {selectedDayWorkout ? 'exists' : 'null'}</div>
        </div>
      )}
    </div>
  );
};

export default PlanDisplay;