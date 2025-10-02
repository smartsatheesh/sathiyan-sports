'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import SkillAssessment from '../components/SkillAssessment';
import styles from './coach.module.css';

interface CoachFormData {
  name: string;
  age: string;
  height: number | null;
  weight: number | null;
  sport: string;
  skillLevel: string;
  weeklyHours: number | null;
  goal: string;
  injuries: string;
  skillAssessment: any;
}

interface BMI {
  value: number;
  category: string;
}

const CoachPage: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CoachFormData>({
    name: '',
    age: '',
    height: null,
    weight: null,
    sport: '',
    skillLevel: 'beginner',
    weeklyHours: null,
    goal: '',
    injuries: '',
    skillAssessment: null
  });
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bmi, setBmi] = useState<BMI | null>(null);
  const [sessionSteps, setSessionSteps] = useState<Array<{ step: number; completedAt: Date; data: any }>>([]);

  // Auth check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/coach');
    }
    
    if (session?.user) {
      setFormData(prev => ({
        ...prev,
        name: session.user.name || '',
      }));
    }
  }, [session, status, router]);

  // Check if user is admin
  const isAdmin = session?.user?.role === 'admin';

  // Calculate BMI
  useEffect(() => {
    if (formData.height && formData.weight) {
      const heightInMeters = formData.height / 100;
      const bmiValue = formData.weight / (heightInMeters * heightInMeters);
      
      let category = '';
      if (bmiValue < 18.5) category = 'Underweight';
      else if (bmiValue < 25) category = 'Normal weight';
      else if (bmiValue < 30) category = 'Overweight';
      else category = 'Obese';
      
      setBmi({ value: Math.round(bmiValue * 10) / 10, category });
    }
  }, [formData.height, formData.weight]);

  const sports = [
    'Shuttle Badminton',
    'Football',
    'Cricket',
    'Swimming',
    'Basketball',
    'Tennis',
    'Volleyball',
    'Table Tennis',
    'Hockey'
  ];

  const handleInputChange = (field: keyof CoachFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generatePlan = async () => {
    setLoading(true);
    setError('');
    
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/coach/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      
      if (result.success) {
        setPlan(result.plan);
        const generationTime = Date.now() - startTime;
        
        // Save to MongoDB
        await saveCoachDataToDatabase(result.plan, generationTime);
      } else {
        setError(result.error || 'Failed to generate plan');
      }
    } catch (error) {
      setError('Error generating plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to save coach data to MongoDB
  const saveCoachDataToDatabase = async (generatedPlan: any, generationTime: number) => {
    try {
      console.log('💾 Saving coach data to database...');
      
      const response = await fetch('/api/coach/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData,
          generatedPlan,
          sessionSteps,
          generationTime
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Coach data saved successfully:', result.data);
        // Show success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(45deg, #10b981, #059669);
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 0.5rem;
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
          z-index: 9999;
          font-weight: 500;
        `;
        notification.textContent = '✅ Training plan saved to database!';
        document.body.appendChild(notification);
        
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 3000);
      } else {
        console.error('❌ Failed to save coach data:', result.error);
      }
    } catch (error) {
      console.error('❌ Error saving coach data:', error);
    }
  };

  // Function to track session steps
  const trackStep = (step: number, data: any) => {
    setSessionSteps(prev => [
      ...prev.filter(s => s.step !== step),
      {
        step,
        completedAt: new Date(),
        data
      }
    ]);
  };

  const sendWhatsAppNotification = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/coach/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'training_plan',
          plan,
          userInfo: {
            name: formData.name,
            sport: formData.sport
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Show success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(45deg, #25d366, #128c7e);
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 0.5rem;
          box-shadow: 0 10px 25px rgba(37, 211, 102, 0.3);
          z-index: 9999;
          font-weight: 500;
          max-width: 300px;
        `;
        notification.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.2rem;">📱</span>
            <div>
              <div style="font-weight: 600;">WhatsApp Sent!</div>
              <div style="font-size: 0.875rem; opacity: 0.9;">Training plan delivered successfully</div>
            </div>
          </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 4000);
      } else {
        alert('Failed to send WhatsApp notification: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Error sending WhatsApp notification');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className={styles.coachContainer}>
        <div className={styles.coachWrapper}>
          <div className={styles.loadingDiv}>
            <div className={styles.spinner}></div>
            <p className={styles.loadingText}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className={styles.coachContainer}>
      <div className={styles.coachWrapper}>
        {/* Header */}
        <div className={styles.coachHeader}>
          <div className={styles.coachIcon}>🤖</div>
          <h1 className={styles.coachTitle}>The Coach</h1>
          <p className={styles.coachSubtitle}>AI-Powered Personal Sports & Fitness Coach</p>
          <p className={styles.coachDescription}>Powered by Gemini 2.5 • Personalized Training Plans</p>
          {isAdmin && (
            <div style={{ 
              marginTop: '0.5rem', 
              padding: '0.5rem 1rem', 
              background: 'linear-gradient(45deg, #ff6b6b, #ffd93d)', 
              borderRadius: '20px', 
              color: '#333',
              fontWeight: 'bold',
              fontSize: '0.875rem',
              display: 'inline-block'
            }}>
              🛠️ Admin Access • Advanced Features Enabled
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        <div className={styles.progressContainer}>
          <div className={styles.progressSteps}>
            {[1, 2, 3, 4, 5].map((num) => (
              <div key={num} style={{ display: 'flex', alignItems: 'center' }}>
                <div className={`${styles.progressStep} ${step >= num ? styles.active : styles.inactive}`}>
                  {num}
                </div>
                {num < 5 && (
                  <div className={`${styles.progressLine} ${step > num ? styles.completed : styles.pending}`}></div>
                )}
              </div>
            ))}
          </div>
          <div className={styles.progressLabel}>
            {step === 1 && 'Basic Information'}
            {step === 2 && 'Physical & Sport Details'}
            {step === 3 && 'Skill Assessment'}
            {step === 4 && 'Schedule & Goals'}
            {step === 5 && 'Your Personalized Plan'}
          </div>
        </div>

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>👤 Basic Information</h2>
            
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={styles.formInput}
                  placeholder="Enter your full name"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Age</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  className={styles.formInput}
                  placeholder="Enter your age"
                  min="13"
                  max="100"
                />
              </div>
            </div>
            
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  trackStep(1, { name: formData.name, age: formData.age });
                  setStep(2);
                }}
                disabled={!formData.name || !formData.age}
                className={`${styles.btn} ${styles.btnPrimary}`}
              >
                Next: Physical Details →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Physical & Sport Details */}
        {step === 2 && (
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>📏 Physical & Sport Details</h2>
            
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Height (cm)</label>
                <input
                  type="number"
                  value={formData.height || ''}
                  onChange={(e) => handleInputChange('height', Number(e.target.value))}
                  className={styles.formInput}
                  placeholder="e.g., 175"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Weight (kg)</label>
                <input
                  type="number"
                  value={formData.weight || ''}
                  onChange={(e) => handleInputChange('weight', Number(e.target.value))}
                  className={styles.formInput}
                  placeholder="e.g., 70"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Primary Sport</label>
                <select
                  value={formData.sport}
                  onChange={(e) => handleInputChange('sport', e.target.value)}
                  className={styles.formSelect}
                >
                  <option value="">Select your sport</option>
                  {sports.map((sport) => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Current Skill Level</label>
                <select
                  value={formData.skillLevel}
                  onChange={(e) => handleInputChange('skillLevel', e.target.value)}
                  className={styles.formSelect}
                >
                  <option value="beginner">Beginner (Just starting)</option>
                  <option value="intermediate">Intermediate (Some experience)</option>
                  <option value="expert">Expert (Advanced player)</option>
                </select>
              </div>
            </div>

            {bmi && (
              <div className={`${styles.bmiIndicator} ${
                bmi.category === 'Normal weight' ? styles.bmiNormal :
                bmi.category === 'Underweight' ? styles.bmiUnderweight :
                bmi.category === 'Overweight' ? styles.bmiOverweight :
                styles.bmiObese
              }`}>
                <p style={{ fontWeight: '500' }}>
                  BMI: {bmi.value} ({bmi.category})
                </p>
              </div>
            )}
            
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => setStep(1)}
                className={`${styles.btn} ${styles.btnSecondary}`}
              >
                ← Back
              </button>
              <button
                onClick={() => {
                  trackStep(2, { 
                    height: formData.height, 
                    weight: formData.weight, 
                    sport: formData.sport,
                    skillLevel: formData.skillLevel,
                    bmi 
                  });
                  setStep(3);
                }}
                disabled={!formData.height || !formData.weight || !formData.sport}
                className={`${styles.btn} ${styles.btnPrimary}`}
              >
                Next: Skill Assessment →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Skill Assessment */}
        {step === 3 && (
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>🎯 Skill Assessment</h2>
            
            <SkillAssessment
              sport={formData.sport}
              onAssessmentComplete={(results) => {
                setFormData(prev => ({ ...prev, skillAssessment: results }));
              }}
            />
            
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => setStep(2)}
                className={`${styles.btn} ${styles.btnSecondary}`}
              >
                ← Back
              </button>
              <button
                onClick={() => {
                  trackStep(3, { skillAssessment: formData.skillAssessment });
                  setStep(4);
                }}
                disabled={!formData.skillAssessment}
                className={`${styles.btn} ${styles.btnPrimary}`}
              >
                Next: Schedule & Goals →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Schedule & Goals */}
        {step === 4 && (
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>📅 Schedule & Goals</h2>
            
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Available Training Days (hours per week)
                </label>
                <input
                  type="number"
                  value={formData.weeklyHours || ''}
                  onChange={(e) => handleInputChange('weeklyHours', Number(e.target.value))}
                  className={styles.formInput}
                  placeholder="e.g., 5"
                  min="1"
                  max="20"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Primary Goal
                </label>
                <select
                  value={formData.goal}
                  onChange={(e) => handleInputChange('goal', e.target.value)}
                  className={styles.formSelect}
                >
                  <option value="">Select your goal</option>
                  <option value="lose_weight">Lose Weight</option>
                  <option value="gain_muscle">Gain Muscle</option>
                  <option value="improve_performance">Improve Performance</option>
                  <option value="stay_fit">Stay Fit</option>
                  <option value="competition_prep">Competition Preparation</option>
                </select>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Injury History/Limitations (optional)
                </label>
                <textarea
                  value={formData.injuries || ''}
                  onChange={(e) => handleInputChange('injuries', e.target.value)}
                  className={styles.formTextarea}
                  placeholder="Any past injuries or physical limitations..."
                  rows={3}
                />
              </div>
            </div>
            
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => setStep(3)}
                className={`${styles.btn} ${styles.btnSecondary}`}
              >
                ← Back
              </button>
              <button
                onClick={() => {
                  trackStep(4, { 
                    weeklyHours: formData.weeklyHours, 
                    goal: formData.goal,
                    injuries: formData.injuries 
                  });
                  setStep(5);
                }}
                disabled={!formData.weeklyHours || !formData.goal}
                className={`${styles.btn} ${styles.btnPrimary}`}
              >
                Generate My Plan →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Generate Plan */}
        {step === 5 && (
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>🚀 Your Personalized Training Plan</h2>
            
            {loading ? (
              <div className={styles.loadingDiv}>
                <div className={styles.spinner}></div>
                <p className={styles.loadingText}>
                  AI Coach is analyzing your profile and creating your personalized plan...
                </p>
              </div>
            ) : error ? (
              <div className={styles.errorCard}>
                Error: {error}
              </div>
            ) : plan ? (
              <div className={styles.planContainer}>
                {plan.overview && (
                  <div className={styles.planSection}>
                    <h3 className={styles.planSectionTitle}>📋 Plan Overview</h3>
                    <p className={styles.planText}>{plan.overview}</p>
                  </div>
                )}
                
                {plan.weekly_schedule && (
                  <div className={styles.planSection}>
                    <h3 className={styles.planSectionTitle}>📅 Weekly Schedule</h3>
                    {Object.entries(plan.weekly_schedule).map(([day, workout]: [string, any]) => (
                      <div key={day} className={styles.workoutDay}>
                        <h4 className={styles.workoutDayTitle}>{day}</h4>
                        {workout.exercises ? (
                          <ul className="mt-2 text-sm">
                            {workout.exercises.map((exercise: string, idx: number) => (
                              <li key={idx} className={styles.exerciseItem}>• {exercise}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className={styles.exerciseItem}>{workout}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {plan.nutrition_tips && (
                  <div className={styles.planSection}>
                    <h3 className={styles.planSectionTitle}>🥗 Nutrition Tips</h3>
                    {Array.isArray(plan.nutrition_tips) ? (
                      <ul>
                        {plan.nutrition_tips.map((tip: string, idx: number) => (
                          <li key={idx} className={styles.planText}>• {tip}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.planText}>{plan.nutrition_tips}</p>
                    )}
                  </div>
                )}
                
                {plan.progress_tracking && (
                  <div className={styles.planSection}>
                    <h3 className={styles.planSectionTitle}>📊 Progress Tracking</h3>
                    {Array.isArray(plan.progress_tracking) ? (
                      <ul>
                        {plan.progress_tracking.map((item: string, idx: number) => (
                          <li key={idx} className={styles.planText}>• {item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.planText}>{plan.progress_tracking}</p>
                    )}
                  </div>
                )}
                
                <div className={styles.actionButtons}>
                  <div className={styles.buttonContainer}>
                    <button
                      onClick={sendWhatsAppNotification}
                      className={`${styles.btn} ${styles.btnSuccess}`}
                    >
                      📱 Send to WhatsApp
                    </button>
                    
                    <button
                      onClick={() => router.push('/coach/calendar')}
                      className={`${styles.btn} ${styles.btnIndigo}`}
                    >
                      📅 View Calendar
                    </button>
                    
                    <button
                      onClick={() => {
                        setStep(1);
                        setPlan(null);
                        setFormData({
                          name: '',
                          age: '',
                          height: null,
                          weight: null,
                          sport: '',
                          skillLevel: 'beginner',
                          weeklyHours: null,
                          goal: '',
                          injuries: '',
                          skillAssessment: null
                        });
                      }}
                      className={`${styles.btn} ${styles.btnSecondary}`}
                    >
                      🔄 Create New Plan
                    </button>
                    
                    {isAdmin && (
                      <button
                        onClick={() => {
                          const exportData = {
                            timestamp: new Date().toISOString(),
                            user: {
                              name: formData.name,
                              age: formData.age,
                              sport: formData.sport,
                              skillLevel: formData.skillLevel,
                              goal: formData.goal
                            },
                            plan,
                            adminExport: true
                          };
                          const dataStr = JSON.stringify(exportData, null, 2);
                          const dataBlob = new Blob([dataStr], { type: 'application/json' });
                          const url = URL.createObjectURL(dataBlob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `coach-plan-${formData.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
                          link.click();
                        }}
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        style={{ background: 'linear-gradient(45deg, #ff6b6b, #ffd93d)', color: '#333' }}
                      >
                        📊 Admin Export
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.centerDiv}>
                <button
                  onClick={generatePlan}
                  className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLarge}`}
                >
                  🤖 Generate My AI Training Plan
                </button>
              </div>
            )}
            
            {!loading && !plan && (
              <div style={{ marginTop: '1.5rem' }}>
                <button
                  onClick={() => setStep(4)}
                  className={`${styles.btn} ${styles.btnSecondary}`}
                >
                  ← Back to Goals
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoachPage;