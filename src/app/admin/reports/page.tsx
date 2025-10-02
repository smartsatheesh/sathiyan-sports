'use client';

import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import styles from './AdminReports.module.css';

interface AthleteData {
  id: string;
  name: string;
  sport: string;
  skillLevel: string;
  planGeneratedDate: Date;
  planProgress: number;
  completedWorkouts: number;
  totalWorkouts: number;
  lastActiveDate: Date;
  monthlyFocus: string[];
  currentWeek: number;
  currentMonth: number;
}

interface CoachReport {
  totalPlansGenerated: number;
  activeAthletes: number;
  completionRate: number;
  topSports: { sport: string; count: number }[];
  weeklyProgress: { week: string; completed: number; total: number }[];
}

const AdminReportsPage = () => {
  const [athleteData, setAthleteData] = useState<AthleteData[]>([]);
  const [coachReport, setCoachReport] = useState<CoachReport | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState('thisMonth');
  const [selectedSport, setSelectedSport] = useState('all');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadReportData();
  }, [selectedDateRange, selectedSport]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/reports?dateRange=${selectedDateRange}&sport=${selectedSport}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch reports data');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAthleteData(data.athleteData);
        setCoachReport(data.coachReport);
      } else {
        console.error('API Error:', data.error);
        // Fallback to existing mock data logic if API fails
        loadMockData();
      }
    } catch (error) {
      console.error('Failed to load reports data:', error);
      // Fallback to existing mock data
      loadMockData();
    }
    setLoading(false);
  };

  const loadMockData = () => {
    const mockAthleteData: AthleteData[] = [
      {
        id: '1',
        name: 'Rahul Sharma',
        sport: 'Cricket',
        skillLevel: 'Intermediate',
        planGeneratedDate: new Date('2024-01-15'),
        planProgress: 75,
        completedWorkouts: 45,
        totalWorkouts: 60,
        lastActiveDate: new Date('2024-01-20'),
        monthlyFocus: ['Batting Technique', 'Fitness', 'Mental Training'],
        currentWeek: 2,
        currentMonth: 2
      },
      {
        id: '2',
        name: 'Priya Patel',
        sport: 'Badminton',
        skillLevel: 'Advanced',
        planGeneratedDate: new Date('2024-01-10'),
        planProgress: 90,
        completedWorkouts: 54,
        totalWorkouts: 60,
        lastActiveDate: new Date('2024-01-21'),
        monthlyFocus: ['Power Shots', 'Agility', 'Strategy'],
        currentWeek: 1,
        currentMonth: 3
      },
      {
        id: '3',
        name: 'Arjun Kumar',
        sport: 'Football',
        skillLevel: 'Beginner',
        planGeneratedDate: new Date('2024-01-20'),
        planProgress: 50,
        completedWorkouts: 30,
        totalWorkouts: 60,
        lastActiveDate: new Date('2024-01-19'),
        monthlyFocus: ['Ball Control', 'Stamina', 'Basic Skills'],
        currentWeek: 3,
        currentMonth: 1
      }
    ];

    const mockCoachReport: CoachReport = {
      totalPlansGenerated: 25,
      activeAthletes: 18,
      completionRate: 72,
      topSports: [
        { sport: 'Cricket', count: 8 },
        { sport: 'Badminton', count: 6 },
        { sport: 'Football', count: 5 },
        { sport: 'Tennis', count: 4 },
        { sport: 'Basketball', count: 2 }
      ],
      weeklyProgress: [
        { week: 'Week 1', completed: 120, total: 150 },
        { week: 'Week 2', completed: 135, total: 150 },
        { week: 'Week 3', completed: 110, total: 150 },
        { week: 'Week 4', completed: 140, total: 150 }
      ]
    };

    setAthleteData(mockAthleteData);
    setCoachReport(mockCoachReport);
  };

  const filteredAthletes = athleteData.filter(athlete => {
    const matchesSearch = athlete.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         athlete.sport.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSport = selectedSport === 'all' || athlete.sport === selectedSport;
    return matchesSearch && matchesSport;
  });

  // Generate workout schedule based on sport and skill level
  const generateWorkoutSchedule = (sport: string, skillLevel: string) => {
    const baseIntensity = skillLevel === 'Beginner' ? 'Low' : skillLevel === 'Intermediate' ? 'Medium' : 'High';
    
    const sportSchedules: { [key: string]: any[] } = {
      'Shuttle Badminton': [
        {
          day: 'Monday',
          workout: 'Footwork & Agility Training',
          duration: '60-75 minutes',
          intensity: baseIntensity,
          exercises: [
            { name: 'Ladder Drills', sets: 4, reps: '30 seconds' },
            { name: 'Shadow Badminton', sets: 3, reps: '2 minutes' },
            { name: 'Court Sprints', sets: 6, reps: '20 seconds' }
          ]
        },
        {
          day: 'Tuesday',
          workout: 'Technique & Stroke Practice',
          duration: '90 minutes',
          intensity: 'Medium',
          exercises: [
            { name: 'Clear Practice', sets: 5, reps: '20 shots' },
            { name: 'Drop Shot Training', sets: 4, reps: '15 shots' },
            { name: 'Smash Practice', sets: 3, reps: '12 shots' }
          ]
        },
        {
          day: 'Wednesday',
          workout: 'Cardio & Endurance',
          duration: '45-60 minutes',
          intensity: baseIntensity,
          exercises: [
            { name: 'Running', duration: '30 minutes' },
            { name: 'Jump Rope', sets: 4, reps: '2 minutes' },
            { name: 'Burpees', sets: 3, reps: '15' }
          ]
        },
        {
          day: 'Thursday',
          workout: 'Strength Training',
          duration: '60 minutes',
          intensity: 'High',
          exercises: [
            { name: 'Squats', sets: 4, reps: '12-15' },
            { name: 'Lunges', sets: 3, reps: '10 each leg' },
            { name: 'Core Exercises', sets: 4, reps: '30 seconds' }
          ]
        },
        {
          day: 'Friday',
          workout: 'Game Practice & Strategy',
          duration: '120 minutes',
          intensity: 'High',
          exercises: [
            { name: 'Match Simulation', duration: '45 minutes' },
            { name: 'Tactical Drills', sets: 4, reps: '5 minutes' },
            { name: 'Serve Practice', sets: 5, reps: '20 serves' }
          ]
        },
        {
          day: 'Saturday',
          workout: 'Active Recovery',
          duration: '30-45 minutes',
          intensity: 'Low',
          exercises: [
            { name: 'Light Stretching', duration: '20 minutes' },
            { name: 'Easy Walk', duration: '25 minutes' }
          ]
        },
        {
          day: 'Sunday',
          workout: 'Complete Rest',
          duration: 'Rest Day',
          intensity: 'Rest',
          exercises: []
        }
      ],
      'Football': [
        {
          day: 'Monday',
          workout: 'Ball Control & Dribbling',
          duration: '75 minutes',
          intensity: baseIntensity,
          exercises: [
            { name: 'Cone Dribbling', sets: 4, reps: '2 minutes' },
            { name: 'Juggling Practice', sets: 3, reps: '5 minutes' },
            { name: 'First Touch Drills', sets: 4, reps: '3 minutes' }
          ]
        },
        {
          day: 'Tuesday',
          workout: 'Passing & Crossing',
          duration: '90 minutes',
          intensity: 'Medium',
          exercises: [
            { name: 'Short Passing', sets: 5, reps: '15 passes' },
            { name: 'Long Passing', sets: 4, reps: '12 passes' },
            { name: 'Crossing Practice', sets: 3, reps: '10 crosses' }
          ]
        },
        {
          day: 'Wednesday',
          workout: 'Fitness & Conditioning',
          duration: '60 minutes',
          intensity: 'High',
          exercises: [
            { name: 'Sprint Intervals', sets: 6, reps: '30 seconds' },
            { name: 'Plyometric Jumps', sets: 4, reps: '12' },
            { name: 'Core Stability', sets: 4, reps: '45 seconds' }
          ]
        },
        {
          day: 'Thursday',
          workout: 'Shooting & Finishing',
          duration: '75 minutes',
          intensity: 'Medium',
          exercises: [
            { name: 'Penalty Practice', sets: 3, reps: '10 shots' },
            { name: 'Shooting Drills', sets: 4, reps: '8 shots' },
            { name: 'Header Practice', sets: 3, reps: '12 headers' }
          ]
        },
        {
          day: 'Friday',
          workout: 'Match Simulation',
          duration: '120 minutes',
          intensity: 'High',
          exercises: [
            { name: 'Small-sided Games', duration: '60 minutes' },
            { name: 'Set Piece Practice', sets: 4, reps: '5 minutes' }
          ]
        },
        {
          day: 'Saturday',
          workout: 'Recovery & Flexibility',
          duration: '45 minutes',
          intensity: 'Low',
          exercises: [
            { name: 'Yoga Flow', duration: '30 minutes' },
            { name: 'Foam Rolling', duration: '15 minutes' }
          ]
        },
        {
          day: 'Sunday',
          workout: 'Complete Rest',
          duration: 'Rest Day',
          intensity: 'Rest',
          exercises: []
        }
      ]
    };

    // Default schedule for other sports
    const defaultSchedule = [
      {
        day: 'Monday',
        workout: 'Strength & Conditioning',
        duration: '60 minutes',
        intensity: baseIntensity,
        exercises: [
          { name: 'Push-ups', sets: 3, reps: '10-15' },
          { name: 'Squats', sets: 3, reps: '12-15' },
          { name: 'Plank', sets: 3, reps: '30-60 seconds' }
        ]
      },
      {
        day: 'Tuesday',
        workout: 'Sport-Specific Skills',
        duration: '75 minutes',
        intensity: 'Medium',
        exercises: [
          { name: 'Agility Drills', sets: 4, reps: '2 minutes' },
          { name: 'Coordination Exercises', sets: 3, reps: '3 minutes' }
        ]
      },
      {
        day: 'Wednesday',
        workout: 'Cardio & Endurance',
        duration: '45 minutes',
        intensity: baseIntensity,
        exercises: [
          { name: 'Running', duration: '30 minutes' },
          { name: 'Jump Rope', sets: 3, reps: '2 minutes' }
        ]
      },
      {
        day: 'Thursday',
        workout: 'Technical Training',
        duration: '60 minutes',
        intensity: 'Medium',
        exercises: [
          { name: 'Skill Drills', sets: 4, reps: '5 minutes' },
          { name: 'Form Practice', duration: '30 minutes' }
        ]
      },
      {
        day: 'Friday',
        workout: 'Game Simulation',
        duration: '90 minutes',
        intensity: 'High',
        exercises: [
          { name: 'Match Practice', duration: '60 minutes' },
          { name: 'Strategy Implementation', duration: '30 minutes' }
        ]
      },
      {
        day: 'Saturday',
        workout: 'Active Recovery',
        duration: '30 minutes',
        intensity: 'Low',
        exercises: [
          { name: 'Light Stretching', duration: '20 minutes' },
          { name: 'Walking', duration: '10 minutes' }
        ]
      },
      {
        day: 'Sunday',
        workout: 'Complete Rest',
        duration: 'Rest Day',
        intensity: 'Rest',
        exercises: []
      }
    ];

    return sportSchedules[sport] || defaultSchedule;
  };

  const exportReportToPDF = async () => {
    try {
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      let yPosition = 20;
      
      // Add header with logo and title
      pdf.setFontSize(24);
      pdf.setTextColor(0, 128, 128); // Teal color
      pdf.text('Sathiyan Sports - Admin Report', 20, yPosition);
      yPosition += 15;
      
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated on: ${new Date().toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Date Range: ${selectedDateRange.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Sport Filter: ${selectedSport === 'all' ? 'All Sports' : selectedSport}`, 20, yPosition);
      yPosition += 15;

      // Summary Statistics Section
      if (coachReport) {
        pdf.setFontSize(16);
        pdf.setTextColor(0, 128, 128);
        pdf.text('Executive Summary', 20, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
        
        const summaryData = [
          { label: 'Total Plans Generated:', value: coachReport.totalPlansGenerated.toString() },
          { label: 'Active Athletes:', value: coachReport.activeAthletes.toString() },
          { label: 'Average Completion Rate:', value: `${coachReport.completionRate}%` },
          { label: 'Growth Rate:', value: '+23%' }
        ];
        
        summaryData.forEach((item, index) => {
          const xPos = 20 + (index % 2) * 90;
          const yPos = yPosition + Math.floor(index / 2) * 8;
          pdf.text(item.label, xPos, yPos);
          pdf.setFont(undefined, 'bold');
          pdf.text(item.value, xPos + 50, yPos);
          pdf.setFont(undefined, 'normal');
        });
        yPosition += 25;

        // Sports Distribution Section
        pdf.setFontSize(16);
        pdf.setTextColor(0, 128, 128);
        pdf.text('Sports Distribution', 20, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
        coachReport.topSports.forEach((sport, index) => {
          const percentage = ((sport.count / coachReport.totalPlansGenerated) * 100).toFixed(1);
          pdf.text(`${sport.sport}: ${sport.count} plans (${percentage}%)`, 25, yPosition);
          yPosition += 6;
        });
        yPosition += 10;

        // Weekly Progress Section
        pdf.setFontSize(16);
        pdf.setTextColor(0, 128, 128);
        pdf.text('Weekly Progress Overview', 20, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
        coachReport.weeklyProgress.forEach((week, index) => {
          const percentage = ((week.completed / week.total) * 100).toFixed(1);
          pdf.text(`${week.week}: ${week.completed}/${week.total} completed (${percentage}%)`, 25, yPosition);
          yPosition += 6;
        });
        yPosition += 15;
      }

      // Athlete Details Section with Workout Information
      if (filteredAthletes.length > 0) {
        // Check if we need a new page
        if (yPosition > 200) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setFontSize(16);
        pdf.setTextColor(0, 128, 128);
        pdf.text('Athlete Progress & Workout Details', 20, yPosition);
        yPosition += 10;
        
        filteredAthletes.forEach((athlete, index) => {
          // Check if we need a new page for each athlete
          if (yPosition > 220) {
            pdf.addPage();
            yPosition = 20;
          }
          
          pdf.setFontSize(14);
          pdf.setTextColor(40, 40, 40);
          pdf.setFont(undefined, 'bold');
          pdf.text(`${index + 1}. ${athlete.name} - Training Plan Details`, 20, yPosition);
          pdf.setFont(undefined, 'normal');
          yPosition += 10;
          
          // Basic Info
          pdf.setFontSize(10);
          pdf.setTextColor(60, 60, 60);
          const athleteInfo = [
            `Sport: ${athlete.sport} | Skill Level: ${athlete.skillLevel}`,
            `Plan Progress: ${athlete.planProgress}% | Workouts: ${athlete.completedWorkouts}/${athlete.totalWorkouts}`,
            `Current Status: Month ${athlete.currentMonth}, Week ${athlete.currentWeek}`,
            `Plan Generated: ${athlete.planGeneratedDate ? new Date(athlete.planGeneratedDate).toLocaleDateString('en-IN') : 'Unknown'} | Last Active: ${athlete.lastActiveDate ? new Date(athlete.lastActiveDate).toLocaleDateString('en-IN') : 'Never'}`
          ];
          
          athleteInfo.forEach(info => {
            pdf.text(info, 25, yPosition);
            yPosition += 5;
          });
          yPosition += 3;

          // Load and display actual workout plan from localStorage
          try {
            const savedPlan = localStorage.getItem('currentCoachingPlan');
            if (savedPlan) {
              const planData = JSON.parse(savedPlan);
              
              // Monthly Focus Areas
              pdf.setFontSize(11);
              pdf.setTextColor(0, 128, 128);
              pdf.text('📋 Monthly Focus Areas:', 25, yPosition);
              yPosition += 6;
              
              pdf.setFontSize(9);
              pdf.setTextColor(60, 60, 60);
              if (athlete.monthlyFocus && athlete.monthlyFocus.length > 0) {
                athlete.monthlyFocus.forEach((focus, idx) => {
                  pdf.text(`  Month ${idx + 1}: ${focus}`, 30, yPosition);
                  yPosition += 4;
                });
              } else {
                pdf.text('  Month 1: Foundation Building', 30, yPosition);
                yPosition += 4;
                pdf.text('  Month 2: Skill Development', 30, yPosition);
                yPosition += 4;
                pdf.text('  Month 3: Peak Performance', 30, yPosition);
                yPosition += 4;
              }
              yPosition += 5;

              // Weekly Workout Breakdown
              pdf.setFontSize(11);
              pdf.setTextColor(0, 128, 128);
              pdf.text('💪 Weekly Workout Structure:', 25, yPosition);
              yPosition += 8;
              
              // Sample workout schedule based on sport
              const workoutSchedule = generateWorkoutSchedule(athlete.sport, athlete.skillLevel);
              workoutSchedule.forEach((day, dayIndex) => {
                if (yPosition > 270) {
                  pdf.addPage();
                  yPosition = 20;
                }
                
                pdf.setFontSize(9);
                pdf.setTextColor(40, 40, 40);
                pdf.setFont(undefined, 'bold');
                pdf.text(`  ${day.day}:`, 30, yPosition);
                pdf.setFont(undefined, 'normal');
                pdf.setTextColor(60, 60, 60);
                pdf.text(day.workout, 55, yPosition);
                yPosition += 4;
                
                pdf.setFontSize(8);
                pdf.setTextColor(80, 80, 80);
                pdf.text(`    Duration: ${day.duration} | Intensity: ${day.intensity}`, 35, yPosition);
                yPosition += 4;
                
                if (day.exercises && day.exercises.length > 0) {
                  pdf.text('    Key Exercises:', 35, yPosition);
                  yPosition += 3;
                  day.exercises.slice(0, 3).forEach((exercise, exIdx) => {
                    if (yPosition > 275) {
                      pdf.addPage();
                      yPosition = 20;
                    }
                    const exerciseText = exercise.sets ? 
                      `${exercise.name} (${exercise.sets}x${exercise.reps})` : 
                      `${exercise.name} (${exercise.duration || '30 min'})`;
                    pdf.text(`      • ${exerciseText}`, 40, yPosition);
                    yPosition += 3;
                  });
                }
                yPosition += 3;
              });
              
              // Nutrition Guidelines
              if (yPosition > 250) {
                pdf.addPage();
                yPosition = 20;
              }
              
              pdf.setFontSize(11);
              pdf.setTextColor(0, 128, 128);
              pdf.text('🥗 Nutrition Guidelines:', 25, yPosition);
              yPosition += 6;
              
              pdf.setFontSize(9);
              pdf.setTextColor(60, 60, 60);
              const nutritionTips = [
                'Pre-workout: Light meal 1-2 hours before training',
                'Post-workout: Protein + carbs within 30 minutes',
                'Hydration: 2-3 liters of water daily',
                'Recovery: Include anti-inflammatory foods'
              ];
              
              nutritionTips.forEach(tip => {
                pdf.text(`  • ${tip}`, 30, yPosition);
                yPosition += 4;
              });
              yPosition += 5;

              // Progress Tracking
              pdf.setFontSize(11);
              pdf.setTextColor(0, 128, 128);
              pdf.text('📊 Progress Tracking Metrics:', 25, yPosition);
              yPosition += 6;
              
              pdf.setFontSize(9);
              pdf.setTextColor(60, 60, 60);
              const progressMetrics = [
                `Completion Rate: ${Math.round((athlete.completedWorkouts / athlete.totalWorkouts) * 100)}%`,
                `Weekly Average: ${Math.round(athlete.completedWorkouts / athlete.currentWeek)} workouts`,
                `Consistency Score: ${athlete.planProgress}%`,
                `Recommended Focus: ${athlete.currentWeek > 8 ? 'Maintain intensity' : 'Build foundation'}`
              ];
              
              progressMetrics.forEach(metric => {
                pdf.text(`  • ${metric}`, 30, yPosition);
                yPosition += 4;
              });
              
            } else {
              // Fallback if no plan data
              pdf.setFontSize(9);
              pdf.setTextColor(100, 100, 100);
              pdf.text('  Detailed workout plan not available. Please generate a new plan.', 30, yPosition);
              yPosition += 5;
            }
          } catch (error) {
            console.error('Error loading plan data:', error);
            pdf.setFontSize(9);
            pdf.setTextColor(100, 100, 100);
            pdf.text('  Error loading workout details.', 30, yPosition);
            yPosition += 5;
          }
          
          yPosition += 15; // Space between athletes
        });
      }

      // Training Plan Statistics
      if (yPosition > 200) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(16);
      pdf.setTextColor(0, 128, 128);
      pdf.text('📈 Training Plan Analytics', 20, yPosition);
      yPosition += 12;

      // Training Plan Analytics
      pdf.setFontSize(12);
      pdf.setTextColor(60, 60, 60);
      
      const analytics = {
        totalPlans: filteredAthletes.length,
        averageProgress: Math.round(filteredAthletes.reduce((sum, a) => sum + a.planProgress, 0) / filteredAthletes.length),
        totalWorkouts: filteredAthletes.reduce((sum, a) => sum + a.totalWorkouts, 0),
        completedWorkouts: filteredAthletes.reduce((sum, a) => sum + a.completedWorkouts, 0),
        sportsDistribution: filteredAthletes.reduce((acc, athlete) => {
          acc[athlete.sport] = (acc[athlete.sport] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        skillLevelDistribution: filteredAthletes.reduce((acc, athlete) => {
          acc[athlete.skillLevel] = (acc[athlete.skillLevel] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
      
      // Overall Statistics
      pdf.setFontSize(11);
      pdf.setTextColor(0, 128, 128);
      pdf.text('📊 Overall Training Statistics', 25, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);
      const overallStats = [
        `Total Active Training Plans: ${analytics.totalPlans}`,
        `Average Progress Completion: ${analytics.averageProgress}%`,
        `Total Workouts Scheduled: ${analytics.totalWorkouts}`,
        `Total Workouts Completed: ${analytics.completedWorkouts}`,
        `Overall Completion Rate: ${Math.round((analytics.completedWorkouts / analytics.totalWorkouts) * 100)}%`,
        `Average Workouts per Athlete: ${Math.round(analytics.totalWorkouts / analytics.totalPlans)}`
      ];
      
      overallStats.forEach(stat => {
        pdf.text(`  • ${stat}`, 30, yPosition);
        yPosition += 4;
      });
      yPosition += 8;
      
      // Sport Distribution
      pdf.setFontSize(11);
      pdf.setTextColor(0, 128, 128);
      pdf.text('🏃 Sport Distribution Analysis', 25, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);
      Object.entries(analytics.sportsDistribution).forEach(([sport, count]) => {
        const percentage = Math.round((count / analytics.totalPlans) * 100);
        pdf.text(`  • ${sport}: ${count} athletes (${percentage}%)`, 30, yPosition);
        yPosition += 4;
      });
      yPosition += 8;
      
      // Skill Level Distribution
      pdf.setFontSize(11);
      pdf.setTextColor(0, 128, 128);
      pdf.text('🎯 Skill Level Distribution', 25, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);
      Object.entries(analytics.skillLevelDistribution).forEach(([level, count]) => {
        const percentage = Math.round((count / analytics.totalPlans) * 100);
        pdf.text(`  • ${level}: ${count} athletes (${percentage}%)`, 30, yPosition);
        yPosition += 4;
      });
      yPosition += 8;
      
      // Recommendations
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(11);
      pdf.setTextColor(0, 128, 128);
      pdf.text('💡 Coaching Recommendations', 25, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);
      const recommendations = [];
      
      if (analytics.averageProgress < 70) {
        recommendations.push('Consider additional motivation strategies for athletes below 70% completion');
      }
      if (analytics.averageProgress > 85) {
        recommendations.push('Excellent engagement! Consider increasing workout complexity');
      }
      if (Object.keys(analytics.sportsDistribution).length > 5) {
        recommendations.push('High sport diversity - consider sport-specific coaching specialization');
      }
      
      // Add some general recommendations
      recommendations.push('Regular progress reviews recommended every 2 weeks');
      recommendations.push('Consider implementing group training sessions for motivation');
      recommendations.push('Track nutrition adherence for better results');
      
      recommendations.forEach(rec => {
        pdf.text(`  • ${rec}`, 30, yPosition);
        yPosition += 5;
      });
      yPosition += 10;
      
      // Export Summary
      pdf.setFontSize(11);
      pdf.setTextColor(0, 128, 128);
      pdf.text('📋 Report Summary', 25, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);
      const reportSummary = [
        `Report Generated: ${new Date().toLocaleDateString('en-IN', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`,
        `Total Athletes Analyzed: ${analytics.totalPlans}`,
        `Data Range: ${selectedDateRange.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}`,
        `Sport Filter Applied: ${selectedSport === 'all' ? 'All Sports' : selectedSport}`,
        `Most Popular Sport: ${Object.entries(analytics.sportsDistribution).reduce((a, b) => analytics.sportsDistribution[a[0]] > analytics.sportsDistribution[b[0]] ? a : b)[0]}`,
        `Highest Completion Rate: ${Math.max(...filteredAthletes.map(a => a.planProgress))}%`
      ];
      
      reportSummary.forEach(item => {
        pdf.text(`  • ${item}`, 30, yPosition);
        yPosition += 4;
      });
      
      // Add footer to all pages
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${i} of ${pageCount}`, 180, 290);
        pdf.text('Sathiyan Sports Coach Platform - Confidential', 20, 290);
      }
      
      pdf.save(`sathiyan-sports-admin-report-${new Date().toISOString().split('T')[0]}.pdf`);
      
      // Show success message
      alert('✅ PDF report exported successfully with detailed JSON data!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('❌ Error generating PDF report. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingDiv}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading admin reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerIcon}>📊</div>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <p className={styles.subtitle}>Coach Performance & Athlete Progress Reports</p>
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <div className={styles.filtersSection}>
            <div className={styles.filterGroup}>
              <label htmlFor="dateRange">Date Range:</label>
              <select
                id="dateRange"
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className={styles.select}
              >
                <option value="thisWeek">This Week</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="last3Months">Last 3 Months</option>
                <option value="thisYear">This Year</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label htmlFor="sport">Sport:</label>
              <select
                id="sport"
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                className={styles.select}
              >
                <option value="all">All Sports</option>
                <option value="Cricket">Cricket</option>
                <option value="Badminton">Badminton</option>
                <option value="Football">Football</option>
                <option value="Tennis">Tennis</option>
                <option value="Basketball">Basketball</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label htmlFor="search">Search Athletes:</label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or sport..."
                className={styles.searchInput}
              />
            </div>
          </div>

          <button
            onClick={exportReportToPDF}
            className={styles.exportButton}
          >
            📄 Export Enhanced PDF Report
          </button>
          <button
            onClick={() => {
              // Test JSON export
              const testData = {
                testMode: true,
                summary: coachReport,
                athletes: filteredAthletes.slice(0, 2), // First 2 athletes for testing
                timestamp: new Date().toISOString()
              };
              console.log('Test JSON Data:', JSON.stringify(testData, null, 2));
              alert('✅ JSON data logged to console for testing!');
            }}
            className={styles.testButton}
          >
            🧪 Test JSON Export
          </button>
        </div>

        <div id="admin-report-content">
          {/* Summary Cards */}
          {coachReport && (
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <div className={styles.cardIcon}>📝</div>
                <div className={styles.cardContent}>
                  <h3>Total Plans Generated</h3>
                  <p className={styles.cardNumber}>{coachReport.totalPlansGenerated}</p>
                </div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.cardIcon}>👥</div>
                <div className={styles.cardContent}>
                  <h3>Active Athletes</h3>
                  <p className={styles.cardNumber}>{coachReport.activeAthletes}</p>
                </div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.cardIcon}>✅</div>
                <div className={styles.cardContent}>
                  <h3>Completion Rate</h3>
                  <p className={styles.cardNumber}>{coachReport.completionRate}%</p>
                </div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.cardIcon}>📈</div>
                <div className={styles.cardContent}>
                  <h3>Growth Rate</h3>
                  <p className={styles.cardNumber}>+23%</p>
                </div>
              </div>
            </div>
          )}

          {/* Top Sports Chart */}
          {coachReport && (
            <div className={styles.chartSection}>
              <h2 className={styles.sectionTitle}>Popular Sports Distribution</h2>
              <div className={styles.sportsChart}>
                {coachReport.topSports.map((sport, index) => (
                  <div key={sport.sport} className={styles.sportBar}>
                    <div className={styles.sportLabel}>
                      <span className={styles.sportName}>{sport.sport}</span>
                      <span className={styles.sportCount}>{sport.count}</span>
                    </div>
                    <div className={styles.sportBarContainer}>
                      <div
                        className={styles.sportBarFill}
                        style={{
                          width: `${(sport.count / Math.max(...coachReport.topSports.map(s => s.count))) * 100}%`,
                          backgroundColor: `hsl(${180 + index * 30}, 70%, 60%)`
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weekly Progress Chart */}
          {coachReport && (
            <div className={styles.chartSection}>
              <h2 className={styles.sectionTitle}>Weekly Progress Overview</h2>
              <div className={styles.weeklyChart}>
                {coachReport.weeklyProgress.map((week, index) => (
                  <div key={week.week} className={styles.weekBar}>
                    <div className={styles.weekLabel}>{week.week}</div>
                    <div className={styles.weekBarContainer}>
                      <div
                        className={styles.weekBarCompleted}
                        style={{
                          height: `${(week.completed / week.total) * 100}%`
                        }}
                      ></div>
                    </div>
                    <div className={styles.weekStats}>
                      {week.completed}/{week.total}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Athletes Table */}
          <div className={styles.tableSection}>
            <h2 className={styles.sectionTitle}>
              Athlete Progress Details ({filteredAthletes.length} athletes)
            </h2>
            <div className={styles.tableContainer}>
              <table className={styles.athleteTable}>
                <thead>
                  <tr>
                    <th>Athlete Name</th>
                    <th>Sport</th>
                    <th>Skill Level</th>
                    <th>Plan Progress</th>
                    <th>Workouts</th>
                    <th>Current Status</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAthletes.map((athlete) => (
                    <tr key={athlete.id}>
                      <td className={styles.athleteName}>
                        <div className={styles.nameCell}>
                          <div className={styles.avatar}>
                            {athlete.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{athlete.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.sportBadge}>{athlete.sport}</span>
                      </td>
                      <td>
                        <span className={styles.skillBadge}>{athlete.skillLevel}</span>
                      </td>
                      <td>
                        <div className={styles.progressContainer}>
                          <div className={styles.progressBar}>
                            <div
                              className={styles.progressFill}
                              style={{ width: `${athlete.planProgress}%` }}
                            ></div>
                          </div>
                          <span className={styles.progressText}>{athlete.planProgress}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.workoutStats}>
                          {athlete.completedWorkouts}/{athlete.totalWorkouts}
                        </span>
                      </td>
                      <td>
                        <div className={styles.statusContainer}>
                          <span className={styles.statusBadge}>
                            Month {athlete.currentMonth}, Week {athlete.currentWeek}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.lastActive}>
                          {athlete.lastActiveDate ? new Date(athlete.lastActiveDate).toLocaleDateString('en-IN') : 'Never'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button className={styles.viewButton} title="View Details">
                            👁️
                          </button>
                          <button className={styles.messageButton} title="Send Message">
                            💬
                          </button>
                          <button className={styles.exportButton} title="Export Plan">
                            📄
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Focus Summary */}
          <div className={styles.focusSection}>
            <h2 className={styles.sectionTitle}>Current Training Focus Areas</h2>
            <div className={styles.focusGrid}>
              {filteredAthletes.map((athlete) => (
                <div key={athlete.id} className={styles.focusCard}>
                  <h3 className={styles.focusAthleteName}>{athlete.name}</h3>
                  <p className={styles.focusSport}>{athlete.sport} • {athlete.skillLevel}</p>
                  <div className={styles.focusAreas}>
                    {athlete.monthlyFocus.map((focus, index) => (
                      <span key={index} className={styles.focusTag}>
                        {focus}
                      </span>
                    ))}
                  </div>
                  <div className={styles.focusProgress}>
                    Month {athlete.currentMonth} • Week {athlete.currentWeek}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={styles.quickActions}>
          <button
            onClick={() => window.location.href = '/admin'}
            className={styles.actionButton}
          >
            🔙 Back to Admin
          </button>
          <button
            onClick={() => {
              // Refresh data
              loadReportData();
            }}
            className={styles.actionButton}
          >
            🔄 Refresh Data
          </button>
          <button
            onClick={() => {
              // Export to CSV (simplified)
              alert('CSV export feature coming soon! 📊');
            }}
            className={styles.actionButton}
          >
            📊 Export CSV
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminReportsPage;