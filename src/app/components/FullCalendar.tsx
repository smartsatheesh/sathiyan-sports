'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import EditableWorkoutModal from './EditableWorkoutModal';
import styles from './FullCalendar.module.css';

interface WorkoutDay {
  workout?: string;
  duration?: string;
  intensity?: string;
  equipment?: string[];
  motivation?: string;
  completed?: boolean;
  date?: Date;
}

interface WeeklyPlan {
  week: number;
  startDate: Date;
  endDate: Date;
  focus: string;
  days: WorkoutDay[];
}

interface CoachingPlan {
  athleteProfile: {
    name: string;
    age: number;
    sport: string;
    skillLevel: string;
  };
  coachingPlan: any;
  generatedAt: string;
  planId?: string;
}

const FullCalendar = () => {
  const router = useRouter();
  const calendarRef = useRef<HTMLDivElement>(null);
  const [plan, setPlan] = useState<CoachingPlan | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [completedWorkouts, setCompletedWorkouts] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDayWorkout, setSelectedDayWorkout] = useState<any>(null);
  const [selectedModalDate, setSelectedModalDate] = useState<Date | null>(null);
  const [workoutEdits, setWorkoutEdits] = useState<{ [date: string]: any }>({});
  const [planId, setPlanId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load workout edits from MongoDB
  const loadWorkoutEdits = async () => {
    try {
      console.log('📖 Loading workout edits from MongoDB...');
      const response = await fetch('/api/coach/workout-edits');
      console.log('📡 Load edits response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📖 Load edits response data:', data);
        
        if (data.success) {
          setWorkoutEdits(data.workoutEdits || {});
          setPlanId(data.planId);
          console.log('✅ Loaded workout edits from MongoDB:', Object.keys(data.workoutEdits || {}).length, 'edits');
          console.log('🆔 Plan ID set to:', data.planId);
        } else {
          console.log('❌ Failed to load workout edits:', data.error);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to load workout edits - HTTP', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Error loading workout edits:', error);
    }
  };

  // Save workout edit to MongoDB
  const saveWorkoutEdit = async (date: Date, workout: any) => {
    if (isSaving) {
      console.log('🔄 Save already in progress, skipping...');
      return false;
    }

    setIsSaving(true);
    
    try {
      console.log('💾 Attempting to save workout edit:', {
        date: date.toISOString(),
        workout,
        planId
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch('/api/coach/workout-edits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: date.toISOString(),
          workout,
          planId
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('📡 API Response status:', response.status);
      console.log('📡 API Response ok:', response.ok);
      console.log('📡 API Response headers:', response.headers);
      
      if (response.ok) {
        const responseText = await response.text();
        console.log('📡 Raw response text:', responseText);
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('❌ JSON parse error:', parseError);
          console.error('❌ Response text was:', responseText);
          alert('Failed to save workout: Invalid server response');
          return false;
        }
        
        console.log('📡 Parsed API Response data:', data);
        
        if (data && data.success === true) {
          // Update local state
          const dateString = date.toDateString();
          setWorkoutEdits(prev => ({
            ...prev,
            [dateString]: workout
          }));
          console.log('✅ Frontend: Successfully saved workout edit to MongoDB for', dateString);
          
          // Show success message
          const successMsg = document.createElement('div');
          successMsg.innerHTML = '✅ Workout saved successfully!';
          successMsg.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: #10b981; color: white; padding: 1rem 1.5rem;
            border-radius: 0.5rem; font-weight: 600;
          `;
          document.body.appendChild(successMsg);
          setTimeout(() => document.body.removeChild(successMsg), 3000);
          
          return true;
        } else {
          console.error('❌ API returned success=false:', data);
          alert(`Failed to save workout: ${data?.error || 'Unknown error'}`);
          return false;
        }
      } else {
        const errorText = await response.text();
        console.error('❌ HTTP Error:', response.status, errorText);
        alert(`Failed to save workout: HTTP ${response.status} - ${errorText}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Network error saving workout edit:', error);
      console.error('❌ Error details:', error.name, error.message);
      
      if (error.name === 'AbortError') {
        alert('Request timed out. Please try again.');
      } else {
        alert('Network error: Failed to save workout. Please check your connection.');
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    // Load plan from localStorage or fetch from API
    const loadPlan = async () => {
      const savedPlan = localStorage.getItem('currentCoachingPlan');
      if (savedPlan) {
        try {
          const parsedPlan = JSON.parse(savedPlan);
          setPlan(parsedPlan);
          generateWeeklyPlans(parsedPlan);
          console.log('📅 Loaded plan from localStorage for calendar');
        } catch (error) {
          console.error('Error parsing saved plan:', error);
          // Don't redirect, just show empty state
        }
      } else {
        // Try to fetch latest plan from API
        try {
          const response = await fetch('/api/coach/get-latest-plan');
          if (response.ok) {
            const latestPlan = await response.json();
            setPlan(latestPlan);
            generateWeeklyPlans(latestPlan);
            localStorage.setItem('currentCoachingPlan', JSON.stringify(latestPlan));
          } else {
            console.log('No plan found, showing empty calendar state');
          }
        } catch (error) {
          console.error('Error fetching plan:', error);
          // Don't redirect, just show empty state
        }
      }
    };

    loadPlan();

    // Load workout edits from MongoDB
    loadWorkoutEdits();

    // Load completed workouts from localStorage
    const saved = localStorage.getItem('completedWorkouts');
    if (saved) {
      setCompletedWorkouts(new Set(JSON.parse(saved)));
    }
  }, [router]);

  const generateWeeklyPlans = (planData: CoachingPlan) => {
    const startDate = new Date();
    const weeks: WeeklyPlan[] = [];
    
    // Generate 12 weeks (3 months)
    for (let week = 0; week < 12; week++) {
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
          workout: getWorkoutForDay(month, weekInMonth, dayName),
          duration: getDurationForDay(dayName),
          intensity: getIntensityForWeek(weekInMonth),
          equipment: getEquipmentForDay(dayName),
          motivation: getMotivationForDay(dayName, planData),
          completed: false,
          date: dayDate
        });
      }
      
      weeks.push(weekPlan);
    }
    
    setWeeklyPlans(weeks);
  };

  // Apply workout edits to the generated weekly plans
  const applyWorkoutEdits = (plans: WeeklyPlan[]) => {
    console.log('🛠️ applyWorkoutEdits called with', plans.length, 'weekly plans');
    console.log('🛠️ Available workout edits:', Object.keys(workoutEdits));
    
    return plans.map(week => ({
      ...week,
      days: week.days.map(day => {
        if (day.date) {
          const dateString = day.date.toDateString();
          const editedWorkout = workoutEdits[dateString];
          if (editedWorkout) {
            console.log('✏️ Applying edit for', dateString, ':', editedWorkout.type);
            return {
              ...day,
              workout: editedWorkout.type,
              duration: editedWorkout.duration,
              intensity: editedWorkout.intensity,
              warmup: editedWorkout.warmup,
              cooldown: editedWorkout.cooldown,
              tips: editedWorkout.tips,
              exercises: editedWorkout.exercises
            };
          }
        }
        return day;
      })
    }));
  };

  // Update weekly plans when workout edits change
  useEffect(() => {
    console.log('🔄 useEffect triggered - workoutEdits changed');
    console.log('📊 Current state:', {
      weeklyPlansLength: weeklyPlans.length,
      workoutEditsCount: Object.keys(workoutEdits).length,
      workoutEditsDates: Object.keys(workoutEdits)
    });
    
    if (weeklyPlans.length > 0 && Object.keys(workoutEdits).length > 0) {
      console.log('✅ Applying workout edits to weekly plans...');
      const updatedPlans = applyWorkoutEdits(weeklyPlans);
      setWeeklyPlans(updatedPlans);
    } else {
      console.log('⏳ Not ready to apply edits yet');
    }
  }, [workoutEdits]);

  // Apply workout edits when weekly plans are first generated
  useEffect(() => {
    console.log('🔄 useEffect triggered - weeklyPlans changed');
    console.log('📊 Plans state:', {
      weeklyPlansLength: weeklyPlans.length,
      workoutEditsCount: Object.keys(workoutEdits).length
    });
    
    if (weeklyPlans.length > 0 && Object.keys(workoutEdits).length > 0) {
      console.log('✅ Weekly plans loaded, applying existing workout edits...');
      const updatedPlans = applyWorkoutEdits(weeklyPlans);
      // Only update if there are actual changes to prevent infinite loop
      const hasChanges = JSON.stringify(updatedPlans) !== JSON.stringify(weeklyPlans);
      if (hasChanges) {
        console.log('📝 Changes detected, updating weekly plans...');
        setWeeklyPlans(updatedPlans);
      } else {
        console.log('📝 No changes detected, skipping update');
      }
    }
  }, [weeklyPlans.length]); // Only depend on length to avoid infinite loops

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

  const getEquipmentForDay = (day: string): string[] => {
    const equipment = {
      monday: ['Weights', 'Resistance Bands'],
      tuesday: ['Sport Equipment', 'Cones'],
      wednesday: ['Cardio Equipment'],
      thursday: ['Technical Equipment'],
      friday: ['Full Equipment Set'],
      saturday: ['Light Equipment'],
      sunday: []
    };
    
    return equipment[day as keyof typeof equipment] || [];
  };

  const getMotivationForDay = (day: string, planData: CoachingPlan): string => {
    const quotes = planData?.coachingPlan?.motivationalQuotes || [
      "Every workout brings you closer to your goals!",
      "Consistency is the key to success!",
      "Push your limits and discover your potential!",
      "Champions are made through daily dedication!",
      "Your future self will thank you for today's effort!"
    ];
    
    const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day);
    return quotes[dayIndex % quotes.length];
  };

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
    const dateStr = date.toDateString();
    
    for (const weekPlan of weeklyPlans) {
      for (const dayPlan of weekPlan.days) {
        if (dayPlan.date?.toDateString() === dateStr) {
          return {
            ...dayPlan,
            completed: completedWorkouts.has(dateStr)
          };
        }
      }
    }
    
    return null;
  };

  const toggleWorkoutCompletion = (date: Date) => {
    const dateStr = date.toDateString();
    const newCompleted = new Set(completedWorkouts);
    
    const isCompleting = !newCompleted.has(dateStr);
    
    if (newCompleted.has(dateStr)) {
      newCompleted.delete(dateStr);
    } else {
      newCompleted.add(dateStr);
    }
    
    setCompletedWorkouts(newCompleted);
    localStorage.setItem('completedWorkouts', JSON.stringify([...newCompleted]));
    
    // Show success message
    const message = isCompleting ? 
      '🎉 Great job! Workout marked as completed!' : 
      '📝 Workout unmarked. You can always mark it complete later!';
    
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(45deg, ${isCompleting ? '#10b981, #059669' : '#6b7280, #4b5563'});
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 0.5rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      z-index: 9999;
      font-weight: 600;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
  };

  const exportCalendarToPDF = async () => {
    if (!calendarRef.current || !plan) return;
    
    setExportingPDF(true);
    
    try {
      const canvas = await html2canvas(calendarRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add header
      pdf.setFontSize(20);
      pdf.text(`${plan?.athleteProfile?.name || (plan as any)?.name || 'Athlete'}'s Training Calendar`, 20, 20);
      pdf.setFontSize(12);
      pdf.text(`Sport: ${plan?.athleteProfile?.sport || (plan as any)?.sport || 'Sport'} | Level: ${plan?.athleteProfile?.skillLevel || (plan as any)?.skillLevel || 'Level'}`, 20, 30);
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 20, 40);
      
      // Add calendar image
      const imgWidth = 257; // A4 landscape width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 20, 50, imgWidth, imgHeight);
      
      // Add workout summary on new page
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text('Workout Summary', 20, 20);
      
      let yPosition = 40;
      weeklyPlans.slice(0, 4).forEach((week, index) => {
        pdf.setFontSize(14);
        pdf.text(`Week ${week.week}: ${week.focus}`, 20, yPosition);
        yPosition += 10;
        
        week.days.forEach((day, dayIndex) => {
          if (day.workout && day.workout !== 'Complete Rest') {
            pdf.setFontSize(10);
            const dayName = day.date?.toLocaleDateString('en-US', { weekday: 'long' }) || '';
            pdf.text(`${dayName}: ${day.workout} (${day.duration})`, 30, yPosition);
            yPosition += 7;
          }
        });
        yPosition += 5;
      });
      
      const athleteName = plan?.athleteProfile?.name || (plan as any)?.name || 'Athlete';
      pdf.save(`${athleteName.replace(/\s+/g, '-')}-training-calendar.pdf`);
      
      // Show success notification
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(45deg, #14b8a6, #0891b2);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 10px 25px rgba(20, 184, 166, 0.3);
        z-index: 9999;
        font-weight: 500;
      `;
      notification.textContent = '📄 Calendar exported successfully!';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  const navigateToDate = (date: Date) => {
    setCurrentDate(date);
    setSelectedDate(date);
  };

  const goToToday = () => {
    const today = new Date();
    navigateToDate(today);
  };

  const changeMonth = (direction: 'next' | 'prev') => {
    const newDate = new Date(currentDate);
    if (direction === 'next') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  // Bulk completion actions
  const markWeekAsComplete = () => {
    const currentWeekStart = new Date(currentDate);
    currentWeekStart.setDate(currentDate.getDate() - currentDate.getDay());
    
    const updatedCompleted = new Set(completedWorkouts);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      const dateStr = date.toDateString();
      
      // Find if there's a workout for this date
      const hasWorkout = weeklyPlans.some(week => 
        week.days.some(day => 
          day.date && day.date.toDateString() === dateStr && 
          day.workout && day.workout !== 'Complete Rest'
        )
      );
      
      if (hasWorkout) {
        updatedCompleted.add(dateStr);
      }
    }
    
    setCompletedWorkouts(updatedCompleted);
    localStorage.setItem('completedWorkouts', JSON.stringify([...updatedCompleted]));
    
    // Show notification
    showNotification('✅ Week marked as complete!', '#10b981');
  };

  const markMonthAsComplete = () => {
    const updatedCompleted = new Set(completedWorkouts);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get all days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toDateString();
      
      // Find if there's a workout for this date
      const hasWorkout = weeklyPlans.some(week => 
        week.days.some(dayData => 
          dayData.date && dayData.date.toDateString() === dateStr && 
          dayData.workout && dayData.workout !== 'Complete Rest'
        )
      );
      
      if (hasWorkout) {
        updatedCompleted.add(dateStr);
      }
    }
    
    setCompletedWorkouts(updatedCompleted);
    localStorage.setItem('completedWorkouts', JSON.stringify([...updatedCompleted]));
    
    // Show notification
    showNotification('✅ Month marked as complete!', '#3b82f6');
  };

  const clearAllCompletions = () => {
    setCompletedWorkouts(new Set());
    localStorage.setItem('completedWorkouts', JSON.stringify([]));
    
    // Show notification
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
  const handleDayClick = (date: Date) => {
    const dateStr = date.toDateString();
    
    // Find the workout for this specific date
    const workoutForDate = weeklyPlans.find(week => 
      week.days.some(day => day.date && day.date.toDateString() === dateStr)
    )?.days.find(day => day.date && day.date.toDateString() === dateStr);

    if (workoutForDate && workoutForDate.workout && workoutForDate.workout !== 'Complete Rest') {
      // Try to get detailed workout info from the plan
      const detailedWorkout = getDetailedWorkoutInfo(workoutForDate, date);
      setSelectedDayWorkout(detailedWorkout);
      setSelectedModalDate(date);
      setModalOpen(true);
    } else {
      // Show a simple notification for rest days
      showNotification('🛌 Rest day - No workout scheduled', '#6b7280');
    }
  };

  // Extract detailed workout information
  const getDetailedWorkoutInfo = (workoutDay: WorkoutDay, date: Date) => {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const weekNumber = Math.floor((date.getTime() - new Date().getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    
    // FIRST: Check if there's a saved workout edit for this date
    const dateString = date.toDateString();
    const editedWorkout = workoutEdits[dateString];
    if (editedWorkout) {
      console.log('📝 Found existing workout edit for', dateString, ':', editedWorkout);
      return editedWorkout;
    }
    
    // Try to get detailed info from the plan if available
    const planData = plan?.coachingPlan;
    const weeklySchedule = planData?.weeklySchedule;
    
    if (weeklySchedule) {
      const weekKey = `week${Math.max(1, Math.min(12, weekNumber))}`;
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
  const generateWorkoutDetails = (workoutDay: WorkoutDay) => {
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
          },
          {
            name: 'Plank',
            sets: 3,
            duration: '30-60 seconds',
            restBetweenSets: '45 seconds',
            instructions: 'Hold straight body position, engage core muscles',
            equipment: 'None',
            targetMuscles: ['Core', 'Shoulders']
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
          },
          {
            name: 'Cone Drills',
            sets: 3,
            reps: '5 repetitions',
            restBetweenSets: '2 minutes',
            instructions: 'Sharp cuts, low center of gravity, explosive movements',
            equipment: 'Cones',
            targetMuscles: ['Legs', 'Core', 'Agility']
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
          },
          {
            name: 'Jumping Jacks',
            sets: 3,
            reps: '30 seconds',
            restBetweenSets: '30 seconds',
            instructions: 'Keep pace steady, land softly',
            equipment: 'None',
            targetMuscles: ['Full Body', 'Cardiovascular']
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

  if (!plan) {
    return (
      <div className={styles.calendarContainer}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          padding: '3rem',
          background: '#f8fafc',
          borderRadius: '12px',
          margin: '2rem'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>📅</div>
          <h2 style={{ 
            color: '#1f2937',
            marginBottom: '1rem',
            fontSize: '1.8rem'
          }}>
            No Training Plan Found
          </h2>
          <p style={{ 
            color: '#6b7280',
            marginBottom: '2rem',
            fontSize: '1.1rem',
            maxWidth: '500px',
            lineHeight: '1.6'
          }}>
            Create a personalized training plan to see your daily workouts in the calendar. 
            Get AI-powered coaching recommendations tailored to your goals.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => router.push('/coach')}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '0.75rem',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                transition: 'transform 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              🚀 Generate Training Plan
            </button>
            <button
              onClick={() => {
                // Create a demo plan for calendar testing
                const demoData = {
                  athleteProfile: {
                    name: 'Demo User',
                    age: 25,
                    sport: 'General Fitness',
                    skillLevel: 'Beginner'
                  },
                  coachingPlan: {
                    weeklySchedule: {
                      week1: {
                        focus: 'Foundation Building',
                        days: {
                          monday: { type: 'Cardio', duration: '30 minutes', intensity: 'Medium' },
                          tuesday: { type: 'Strength Training', duration: '45 minutes', intensity: 'Medium' },
                          wednesday: { type: 'Rest', duration: 'Full Rest', intensity: 'Low' },
                          thursday: { type: 'Flexibility', duration: '30 minutes', intensity: 'Low' },
                          friday: { type: 'HIIT', duration: '25 minutes', intensity: 'High' },
                          saturday: { type: 'Sports Practice', duration: '60 minutes', intensity: 'Medium' },
                          sunday: { type: 'Rest', duration: 'Active Recovery', intensity: 'Low' }
                        }
                      }
                    }
                  },
                  generatedAt: new Date().toISOString()
                };
                localStorage.setItem('currentCoachingPlan', JSON.stringify(demoData));
                window.location.reload();
              }}
              style={{
                background: 'white',
                color: '#667eea',
                border: '2px solid #667eea',
                padding: '1rem 2rem',
                borderRadius: '0.75rem',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#667eea';
                e.currentTarget.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = '#667eea';
              }}
            >
              🎯 Try Demo Calendar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const days = getDaysInMonth(currentDate);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className={styles.calendarContainer} ref={calendarRef}>
      <div className={styles.calendarWrapper}>
        {/* Header */}
        <div className={styles.calendarHeader}>
          <div className={styles.headerContent}>
            <div className={styles.calendarIcon}>📅</div>
            <h1 className={styles.calendarTitle}>Training Calendar</h1>
            <p className={styles.calendarSubtitle}>
              {plan?.athleteProfile?.name || (plan as any)?.name || 'Athlete'} • {plan?.athleteProfile?.sport || (plan as any)?.sport || 'Sport'} • {plan?.athleteProfile?.skillLevel || (plan as any)?.skillLevel || 'Level'}
            </p>
            <p className={styles.calendarInstructions}>
              💡 Click on any workout day to see detailed exercise instructions
            </p>
          </div>
          
          <div className={styles.headerActions}>
            <button
              onClick={exportCalendarToPDF}
              disabled={exportingPDF}
              className={`${styles.actionBtn} ${styles.exportBtn}`}
            >
              {exportingPDF ? (
                <>
                  <span className={styles.spinner}></span>
                  Exporting...
                </>
              ) : (
                <>
                  📄 Export PDF
                </>
              )}
            </button>
            
            <button
              onClick={goToToday}
              className={`${styles.actionBtn} ${styles.todayBtn}`}
            >
              📍 Today
            </button>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className={styles.viewModeSelector}>
          {(['month', 'week', 'day'] as const).map((mode) => (
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
          <button
            onClick={markWeekAsComplete}
            className={`${styles.bulkActionBtn} ${styles.selectAllWeek}`}
          >
            ✅ Complete This Week
          </button>
          
          <button
            onClick={markMonthAsComplete}
            className={`${styles.bulkActionBtn} ${styles.selectAllMonth}`}
          >
            📅 Complete This Month
          </button>
          
          <button
            onClick={clearAllCompletions}
            className={`${styles.bulkActionBtn} ${styles.clearAll}`}
          >
            🗑️ Clear All
          </button>
        </div>

        {/* Calendar Navigation */}
        <div className={styles.calendarNavigation}>
          <button
            onClick={() => changeMonth('prev')}
            className={styles.navBtn}
          >
            ← Previous
          </button>
          
          <h2 className={styles.currentMonth}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          
          <button
            onClick={() => changeMonth('next')}
            className={styles.navBtn}
          >
            Next →
          </button>
        </div>

        {/* Calendar Grid */}
        {viewMode === 'month' && (
          <div className={styles.calendarGrid}>
            {/* Day Headers */}
            <div className={styles.dayHeaders}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className={styles.dayHeader}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className={styles.daysGrid}>
              {days.map((day, index) => {
                if (!day) {
                  return <div key={index} className={styles.emptyDay}></div>;
                }

                const workout = getWorkoutForDate(day);
                const isToday = day.toDateString() === new Date().toDateString();
                const isSelected = selectedDate?.toDateString() === day.toDateString();
                const hasWorkout = workout && workout.workout && workout.workout !== 'Complete Rest';
                const isCompleted = workout?.completed;

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={`${styles.dayCell} ${
                      isToday ? styles.today : ''
                    } ${isSelected ? styles.selected : ''} ${
                      hasWorkout ? styles.hasWorkout : ''
                    } ${isCompleted ? styles.completed : ''}`}
                  >
                    <div className={styles.dayNumber}>{day.getDate()}</div>
                    
                    {hasWorkout && (
                      <div className={styles.workoutPreview}>
                        <div className={styles.workoutTitle}>
                          {workout.workout?.substring(0, 15)}...
                        </div>
                        <div className={styles.workoutMeta}>
                          <span className={styles.duration}>{workout.duration}</span>
                          <span className={`${styles.intensity} ${styles[workout.intensity?.toLowerCase() || 'medium']}`}>
                            {workout.intensity}
                          </span>
                        </div>
                        {isCompleted && (
                          <div className={styles.completedBadge}>✅</div>
                        )}
                      </div>
                    )}
                    
                    {!hasWorkout && day.getDay() === 0 && (
                      <div className={styles.restDay}>Rest</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Weekly View */}
        {viewMode === 'week' && (
          <div className={styles.weekView}>
            <div className={styles.weekHeader}>
              <h3>
                Week of {currentDate.toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </h3>
            </div>
            
            <div className={styles.weekGrid}>
              {Array.from({ length: 7 }, (_, i) => {
                const weekStart = new Date(currentDate);
                const dayOfWeek = weekStart.getDay();
                weekStart.setDate(weekStart.getDate() - dayOfWeek + i);
                
                const workout = getWorkoutForDate(weekStart);
                const hasWorkout = workout && workout.workout && workout.workout !== 'Complete Rest';
                const isCompleted = workout?.completed;
                const isToday = weekStart.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={i}
                    className={`${styles.weekDay} ${isToday ? styles.today : ''} ${
                      hasWorkout ? styles.hasWorkout : ''
                    } ${isCompleted ? styles.completed : ''}`}
                    onClick={() => handleDayClick(weekStart)}
                  >
                    <div className={styles.weekDayHeader}>
                      <div className={styles.dayName}>
                        {weekStart.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className={styles.dayDate}>{weekStart.getDate()}</div>
                    </div>
                    
                    {hasWorkout && (
                      <div className={styles.weekWorkoutCard}>
                        <div className={styles.workoutTitle}>{workout.workout}</div>
                        <div className={styles.workoutMeta}>
                          ⏱️ {workout.duration}
                        </div>
                        <div className={styles.workoutMeta}>
                          🔥 {workout.intensity}
                        </div>
                        {isCompleted && (
                          <div className={styles.completedBadge}>✅ Completed</div>
                        )}
                      </div>
                    )}
                    
                    {!hasWorkout && (
                      <div className={styles.restDay}>
                        😌 Rest Day
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Daily View */}
        {viewMode === 'day' && (
          <div className={styles.dayView}>
            <div className={styles.dayViewHeader}>
              <h3>
                {currentDate.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </h3>
              <div className={styles.dayNavigation}>
                <button
                  onClick={() => {
                    const prevDay = new Date(currentDate);
                    prevDay.setDate(prevDay.getDate() - 1);
                    setCurrentDate(prevDay);
                  }}
                  className={styles.dayNavBtn}
                >
                  ← Previous Day
                </button>
                <button
                  onClick={() => {
                    const nextDay = new Date(currentDate);
                    nextDay.setDate(nextDay.getDate() + 1);
                    setCurrentDate(nextDay);
                  }}
                  className={styles.dayNavBtn}
                >
                  Next Day →
                </button>
              </div>
            </div>
            
            {(() => {
              const workout = getWorkoutForDate(currentDate);
              const hasWorkout = workout && workout.workout && workout.workout !== 'Complete Rest';
              const isCompleted = workout?.completed;

              if (!hasWorkout) {
                return (
                  <div className={styles.dayViewContent}>
                    <div className={styles.restDayCard}>
                      <div className={styles.restDayIcon}>😌</div>
                      <h4>Rest Day</h4>
                      <p>Take time to recover and prepare for tomorrow's training!</p>
                      <div className={styles.restDayTips}>
                        <h5>💡 Recovery Tips:</h5>
                        <ul>
                          <li>🧘‍♀️ Light stretching or yoga</li>
                          <li>💧 Stay hydrated</li>
                          <li>🛌 Get quality sleep</li>
                          <li>🍎 Focus on nutrition</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div className={styles.dayViewContent}>
                  <div className={styles.dayWorkoutCard}>
                    <div className={styles.workoutHeader}>
                      <h4>💪 Today's Workout</h4>
                      <button
                        onClick={() => toggleWorkoutCompletion(currentDate)}
                        className={`${styles.completeBtn} ${isCompleted ? styles.completed : ''}`}
                      >
                        {isCompleted ? '✅ Completed' : '✓ Mark Complete'}
                      </button>
                    </div>
                    
                    <div className={styles.workoutDetails}>
                      <div className={styles.workoutTitle}>{workout.workout}</div>
                      <div className={styles.workoutMeta}>
                        <span>⏱️ Duration: {workout.duration}</span>
                        <span>🔥 Intensity: {workout.intensity}</span>
                      </div>
                      
                      {workout.equipment && workout.equipment.length > 0 && (
                        <div className={styles.equipment}>
                          <strong>🏋️ Equipment:</strong> {workout.equipment.join(', ')}
                        </div>
                      )}
                    </div>
                    
                    {workout.motivation && (
                      <div className={styles.motivationSection}>
                        <h5>🌟 Daily Motivation</h5>
                        <p>{workout.motivation}</p>
                      </div>
                    )}
                    
                    <div className={styles.dayActions}>
                      <button
                        onClick={() => {
                          setSelectedDayWorkout(workout);
                          setSelectedModalDate(currentDate);
                          setModalOpen(true);
                        }}
                        className={`${styles.actionBtn} ${styles.detailsBtn}`}
                      >
                        📋 View Details
                      </button>
                      
                      <button
                        onClick={() => {
                          const message = `🏃‍♂️ Today's Training:\n\n💪 ${workout.workout}\n⏱️ ${workout.duration}\n🔥 ${workout.intensity}\n\n${workout.motivation}`;
                          navigator.share ? 
                            navigator.share({ text: message }) : 
                            navigator.clipboard?.writeText(message);
                        }}
                        className={`${styles.actionBtn} ${styles.shareBtn}`}
                      >
                        📱 Share
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Selected Date Details */}
        {selectedDate && (
          <div className={styles.workoutDetails}>
            <div className={styles.detailsHeader}>
              <h3 className={styles.selectedDateTitle}>
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              <button
                onClick={() => setSelectedDate(null)}
                className={styles.closeBtn}
              >
                ✕
              </button>
            </div>

            {(() => {
              const workout = getWorkoutForDate(selectedDate);
              if (!workout || !workout.workout || workout.workout === 'Complete Rest') {
                return (
                  <div className={styles.restDayDetails}>
                    <div className={styles.restIcon}>😴</div>
                    <h4>Rest & Recovery Day</h4>
                    <p>Recovery is essential for growth and performance improvement.</p>
                  </div>
                );
              }

              return (
                <div className={styles.workoutDetailsContent}>
                  <div className={styles.workoutMetaGrid}>
                    <div className={styles.metaCard}>
                      <h4>⏱️ Duration</h4>
                      <p>{workout.duration}</p>
                    </div>
                    <div className={styles.metaCard}>
                      <h4>🔥 Intensity</h4>
                      <p className={`${styles.intensityBadge} ${styles[workout.intensity?.toLowerCase() || 'medium']}`}>
                        {workout.intensity}
                      </p>
                    </div>
                    <div className={styles.metaCard}>
                      <h4>🛠️ Equipment</h4>
                      <p>{workout.equipment?.join(', ') || 'None required'}</p>
                    </div>
                  </div>

                  <div className={styles.workoutDescription}>
                    <h4>💪 Workout Details</h4>
                    <p>{workout.workout}</p>
                  </div>

                  {workout.motivation && (
                    <div className={styles.motivationCard}>
                      <h4>🌟 Daily Motivation</h4>
                      <p>{workout.motivation}</p>
                    </div>
                  )}

                  <div className={styles.workoutActions}>
                    <button
                      onClick={() => toggleWorkoutCompletion(selectedDate)}
                      className={`${styles.actionBtn} ${
                        workout.completed ? styles.completedBtn : styles.completeBtn
                      }`}
                    >
                      {workout.completed ? '✅ Completed' : '✓ Mark Complete'}
                    </button>
                    
                    <button
                      onClick={() => {
                        const message = `🏃‍♂️ Today's Training:\n\n💪 ${workout.workout}\n⏱️ ${workout.duration}\n🔥 ${workout.intensity}\n\n${workout.motivation}`;
                        navigator.share ? 
                          navigator.share({ text: message }) : 
                          navigator.clipboard?.writeText(message);
                      }}
                      className={`${styles.actionBtn} ${styles.shareBtn}`}
                    >
                      📱 Share
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Progress Overview */}
        <div className={styles.progressOverview}>
          <h3>📊 Training Progress</h3>
          <div className={styles.progressStats}>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>
                {completedWorkouts.size}
              </div>
              <div className={styles.statLabel}>Workouts Completed</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>
                {Math.round((completedWorkouts.size / (weeklyPlans.length * 5)) * 100)}%
              </div>
              <div className={styles.statLabel}>Progress</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>
                {weeklyPlans.length * 5 - completedWorkouts.size}
              </div>
              <div className={styles.statLabel}>Remaining</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={styles.quickActions}>
          <button
            onClick={() => router.push('/coach')}
            className={`${styles.actionBtn} ${styles.backBtn}`}
          >
            🔙 Back to Coach
          </button>
          
          <button
            onClick={() => router.push('/coach/admin')}
            className={`${styles.actionBtn} ${styles.adminBtn}`}
          >
            📊 Admin Dashboard
          </button>
        </div>
      </div>

      {/* Editable Workout Details Modal */}
      <EditableWorkoutModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        date={selectedModalDate}
        workout={selectedDayWorkout}
        onSave={async (updatedWorkout) => {
          // Save the updated workout to MongoDB
          if (selectedModalDate) {
            console.log('💾 Modal onSave called with workout:', updatedWorkout);
            console.log('📅 Selected date:', selectedModalDate);
            console.log('🆔 Current planId:', planId);
            
            const success = await saveWorkoutEdit(selectedModalDate, {
              type: updatedWorkout.type,
              duration: updatedWorkout.duration,
              intensity: updatedWorkout.intensity,
              warmup: updatedWorkout.warmup,
              cooldown: updatedWorkout.cooldown,
              tips: updatedWorkout.tips,
              exercises: updatedWorkout.exercises
            });

            if (success) {
              // Update the weekly plans display with the saved workout
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
              
              console.log('✅ Calendar: Successfully saved workout edit to MongoDB');
            } else {
              console.error('❌ Failed to save workout edit');
              alert('Failed to save workout. Please try again.');
            }
          } else {
            console.error('❌ No selected date for workout save');
          }
        }}
        editable={true}
      />
    </div>
  );
};

export default FullCalendar;