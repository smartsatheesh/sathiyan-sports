'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import SkillAssessment from '../components/SkillAssessment';
import PlanDisplay from '../components/PlanDisplay';
import FullCalendar from '../components/FullCalendar';
import LoadingSpinner from '../components/LoadingSpinner';
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

// Main navigation tabs
type TabType = 'generate' | 'calendar';

const CoachPage: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<TabType>('generate');
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
    
    // Check if user has coach access (admin or coach role)
    if (status === 'authenticated' && session?.user) {
      const userRole = session.user.role;
      if (userRole !== 'admin' && userRole !== 'coach') {
        router.push('/'); // Redirect customers to home page
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        name: session.user.name || '',
      }));
    }
  }, [session, status, router]);

  // Check if user is admin
  const isAdmin = session?.user?.role === 'admin';

  // Load saved form data immediately on component mount
  useEffect(() => {
    const loadSavedFormData = () => {
      const savedFormData = localStorage.getItem('coachFormData');
      if (savedFormData) {
        try {
          const formDataObj = JSON.parse(savedFormData);
          console.log('🏃 Sport from saved data:', formDataObj.sport);
          
          setFormData(prev => {
            const newData = {
              ...prev,
              ...formDataObj
            };
            console.log('🔄 Setting form data to:', newData);
            return newData;
          });
          console.log('✅ Loaded saved form data with sport:', formDataObj.sport);
        } catch (error) {
          console.error('Error parsing saved form data:', error);
          localStorage.removeItem('coachFormData'); // Clean up corrupted data
        }
      }
    };

    // Load form data immediately
    loadSavedFormData();
  }, []); // Empty dependency array - run once on mount

  // Check for existing plans and update name when session is available
  useEffect(() => {
    const checkExistingPlan = () => {
      const savedPlan = localStorage.getItem('currentCoachingPlan');
      if (savedPlan) {
        try {
          const planData = JSON.parse(savedPlan);
          setPlan(planData);
          setStep(5); // Show the plan directly
          console.log('📋 Found existing plan, displaying it directly');
        } catch (error) {
          console.error('Error parsing saved plan:', error);
          localStorage.removeItem('currentCoachingPlan'); // Clean up corrupted data
        }
      }
    };

    if (session?.user) {
      checkExistingPlan();
      
      // Update name from session if available and different
      if (session.user.name && formData.name !== session.user.name) {
        setFormData(prev => ({
          ...prev,
          name: session.user.name || ''
        }));
      }
    }
  }, [session?.user]);

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

  // Save form data whenever it changes (but avoid infinite loops)
  useEffect(() => {
    // Only save if form has meaningful data and user is authenticated
    if (session?.user && (formData.name || formData.sport || formData.age)) {
      const dataToSave = {
        ...formData,
        // Ensure we preserve the user's name from session
        name: session.user.name || formData.name
      };
      localStorage.setItem('coachFormData', JSON.stringify(dataToSave));
      console.log('💾 Auto-saved form data:', dataToSave);
    }
  }, [formData, session?.user]);

  // Additional debug logging for sport field changes
  useEffect(() => {
    if (formData.sport) {
      console.log('🏃 Sport field state changed to:', formData.sport);
    }
  }, [formData.sport]);

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
    console.log(`🔄 Updating ${field} to:`, value);
    const updatedFormData = {
      ...formData,
      [field]: value
    };
    setFormData(updatedFormData);
    
    // Save form data to localStorage for persistence
    localStorage.setItem('coachFormData', JSON.stringify(updatedFormData));
    
    // Special logging for sport field
    if (field === 'sport') {
      console.log(`🏃 Sport field updated to: "${value}"`);
    }
  };

  // Function to show plan generation success with navigation options
  const showPlanGenerationSuccess = () => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(45deg, #20b2aa, #008080);
      color: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(32, 178, 170, 0.3);
      z-index: 9999;
      max-width: 350px;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
        <span style="font-size: 1.5rem;">🎉</span>
        <strong>Plan Generated Successfully!</strong>
      </div>
      <p style="margin: 0 0 1rem 0; opacity: 0.9;">
        Your personalized 3-month training plan is ready!
      </p>
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
        <button id="closeNotification" style="
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
        ">Got It!</button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Add event listeners
    const closeBtn = notification.querySelector('#closeNotification');
    
    closeBtn?.addEventListener('click', () => {
      document.body.removeChild(notification);
    });
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 8000);
  };

  const validateFormData = () => {
    console.log('🔍 Validating form data:', formData);
    
    const requiredFields = ['name', 'age', 'height', 'weight', 'sport'];
    const missingFields = requiredFields.filter(field => {
      const value = formData[field as keyof CoachFormData];
      console.log(`Checking ${field}:`, value);
      return !value || value === '' || value === null;
    });

    if (missingFields.length > 0) {
      setError(`Missing required fields: ${missingFields.join(', ')}`);
      return false;
    }

    // Validate numeric fields
    const ageNum = parseInt(formData.age || '0');
    if (formData.age && (ageNum < 6 || ageNum > 100)) {
      setError(`Age must be between 6 and 100 years (current: ${ageNum})`);
      return false;
    }

    const heightNum = formData.height || 0;
    console.log('Height validation:', heightNum, typeof heightNum);
    if (formData.height && (heightNum < 80 || heightNum > 250)) {
      setError(`Height must be between 100cm and 250cm (current: ${heightNum}cm)`);
      return false;
    }

    const weightNum = formData.weight || 0;
    console.log('Weight validation:', weightNum, typeof weightNum);
    if (formData.weight && (weightNum < 15 || weightNum > 300)) {
      setError(`Weight must be between 20kg and 300kg (current: ${weightNum}kg)`);
      return false;
    }

    console.log('✅ Validation passed!');
    return true;
  };

  const generatePlan = async () => {
    setError('');
    
    // Validate form data first
    if (!validateFormData()) {
      return;
    }

    setLoading(true);
    
    const startTime = Date.now();
    
    try {
      // Transform form data to match API expectations
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - parseInt(formData.age || '25');
      const dateOfBirth = `${birthYear}-01-01`; // Default to January 1st
      
      const apiData = {
        name: formData.name || 'User',
        sex: 'other' as const, // Default value
        dateOfBirth,
        height: formData.height || 170,
        weight: formData.weight || 70,
        sport: formData.sport || 'General Fitness',
        skillLevel: formData.skillLevel || 'beginner',
        objectives: formData.goal ? [formData.goal] : ['Stay Fit'],
        dailyHours: (formData.weeklyHours || 5) / 7, // Convert weekly to daily average
        weeklyHours: formData.weeklyHours || 5,
        schedule: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false
        },
        preferredTime: 'evening',
        userEmail: session?.user?.email || 'user@example.com',
        // Use skill assessment scores or defaults
        motorSkillsScore: formData.skillAssessment?.motorSkills || 70,
        coordinationScore: formData.skillAssessment?.coordination || 70,
        strengthScore: formData.skillAssessment?.strength || 70,
        enduranceScore: formData.skillAssessment?.endurance || 70,
      };

      const response = await fetch('/api/coach/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData)
      });

      const result = await response.json();
      
      if (result.success) {
        setPlan(result.coachingPlan);
        const generationTime = Date.now() - startTime;
        
        // Save plan to localStorage for calendar access
        const planData = {
          ...result.coachingPlan,
          formData,
          generatedAt: new Date().toISOString(),
          generationTime
        };
        localStorage.setItem('currentCoachingPlan', JSON.stringify(planData));
        
        // Save to MongoDB
        await saveCoachDataToDatabase(result.coachingPlan, generationTime);
        
        // Show success message with auto-navigation option
        showPlanGenerationSuccess();
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

  // Check if user has required role
  if (status === 'authenticated' && session?.user) {
    const userRole = session.user.role;
    if (userRole !== 'admin' && userRole !== 'coach') {
      return (
        <div className={styles.coachContainer}>
          <div className={styles.coachWrapper}>
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem',
              background: '#fee2e2',
              borderRadius: '12px',
              margin: '2rem'
            }}>
              <h2 style={{ color: '#dc2626', marginBottom: '1rem' }}>🚫 Access Restricted</h2>
              <p style={{ color: '#7f1d1d' }}>
                Sathiyan Sports AI Coach is only available for coaches and administrators.
              </p>
              <button 
                onClick={() => router.push('/')}
                style={{
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  marginTop: '1rem'
                }}
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className={styles.coachContainer}>
      <div className={styles.coachWrapper}>
        {/* Header */}
        <div className={styles.coachHeader}>
          <div className={styles.coachIcon}>
            <img 
              src="/sir-alex-anime.png" 
              alt="Sir Alex Ferguson - The Coach" 
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                // Fallback to emoji if image not found
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'block';
              }}
            />
            <span style={{ display: 'none', fontSize: '2rem' }}>🤖</span>
          </div>
          <h1 className={styles.coachTitle}>Sathiyan Sports AI Coach</h1>
          <p className={styles.coachSubtitle}>Legendary Coaching Excellence Powered by AI</p>
          <p className={styles.coachDescription}>Inspired by Sir Alex Ferguson • Personalized Training Plans</p>
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

        {/* Tab Navigation */}
        <div className={styles.tabNavigation} style={{
          display: 'flex',
          background: '#f8fafc',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '2rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <button
            onClick={() => setActiveTab('generate')}
            className={`${styles.tabButton} ${activeTab === 'generate' ? styles.activeTab : ''}`}
            style={{
              flex: 1,
              padding: '12px 20px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'generate' ? '#3b82f6' : 'transparent',
              color: activeTab === 'generate' ? 'white' : '#64748b',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            🏆 Generate Sathiyan Plan
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`${styles.tabButton} ${activeTab === 'calendar' ? styles.activeTab : ''}`}
            style={{
              flex: 1,
              padding: '12px 20px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'calendar' ? '#3b82f6' : 'transparent',
              color: activeTab === 'calendar' ? 'white' : '#64748b',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            📅 Calendar & Schedule
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'generate' && (
          <>
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
                  onChange={(e) => {
                    const value = e.target.value;
                    handleInputChange('height', value === '' ? null : Number(value));
                  }}
                  className={styles.formInput}
                  placeholder="e.g., 175"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Weight (kg)</label>
                <input
                  type="number"
                  value={formData.weight || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleInputChange('weight', value === '' ? null : Number(value));
                  }}
                  className={styles.formInput}
                  placeholder="e.g., 70"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Primary Sport</label>
                <select
                  value={formData.sport}
                  onChange={(e) => {
                    console.log('🏃 Sport dropdown changed to:', e.target.value);
                    handleInputChange('sport', e.target.value);
                  }}
                  className={styles.formSelect}
                >
                  <option value="">Select your sport</option>
                  {sports.map((sport) => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
                {/* Debug info for sport field */}
                {process.env.NODE_ENV === 'development' && (
                  <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                    Current sport value: "{formData.sport}" (type: {typeof formData.sport})
                  </div>
                )}
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
            {plan && (
              <div className={styles.existingPlanBanner}>
                <div className={styles.bannerIcon}>📋</div>
                <div className={styles.bannerContent}>
                  <h3>Welcome Back!</h3>
                  <p>Your existing training plan is displayed below. You can view it, export it, or create a new one.</p>
                </div>
              </div>
            )}
            
            <h2 className={styles.formTitle}>🚀 Your Personalized Training Plan</h2>
            
            {loading ? (
              <LoadingSpinner 
                message="Generating your personalized training plan with Sathiyan Sports AI Coach powered by Gemini 2.5 Pro..."
                size="large"
                variant="teal"
              />
            ) : error ? (
              <div className={styles.errorCard}>
                <h3>❌ Error Generating Plan</h3>
                <p>{error}</p>
                <button
                  onClick={() => {
                    setError('');
                    generatePlan();
                  }}
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  style={{ marginTop: '1rem' }}
                >
                  🔄 Try Again
                </button>
              </div>
            ) : plan ? (
              <div>
                {/* Debug info for plan display */}
                {process.env.NODE_ENV === 'development' && (
                  <div style={{ 
                    background: '#fef3c7', 
                    padding: '1rem', 
                    margin: '1rem 0', 
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    border: '1px solid #f59e0b'
                  }}>
                    <h4>🐛 Plan Display Debug:</h4>
                    <p><strong>Form Sport:</strong> "{formData.sport}"</p>
                    <p><strong>Form Name:</strong> "{formData.name}"</p>
                    <p><strong>Form Age:</strong> "{formData.age}"</p>
                    <p><strong>Form Skill Level:</strong> "{formData.skillLevel}"</p>
                    <p><strong>Plan exists:</strong> {plan ? 'Yes' : 'No'}</p>
                  </div>
                )}
                <PlanDisplay 
                  plan={plan}
                  userInfo={{
                    name: formData.name,
                    age: formData.age,
                    sport: formData.sport,
                    skillLevel: formData.skillLevel,
                    goal: formData.goal
                  }}
                  onExportPDF={() => {
                  // Show success notification for PDF export
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
                  notification.textContent = '📄 PDF exported successfully!';
                  document.body.appendChild(notification);
                  
                  setTimeout(() => {
                    document.body.removeChild(notification);
                  }, 3000);
                }}
              />
              </div>
            ) : (
              <div className={styles.centerDiv}>
                <div className={styles.generatePlanSection}>
                  <div className={styles.planPreview}>
                    <h3>🏆 Sathiyan Sports AI Coach Ready</h3>
                    <p>Your personalized training plan will include:</p>
                    <ul className={styles.featureList}>
                      <li>� 12-week progressive training schedule</li>
                      <li>🎯 Sport-specific skill development</li>
                      <li>🥗 Nutrition guidance and meal timing</li>
                      <li>📊 Progress tracking milestones</li>
                      <li>💪 Motivational support system</li>
                      <li>📄 Exportable PDF format</li>
                    </ul>
                  </div>
                  
                  <button
                    onClick={generatePlan}
                    className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLarge}`}
                  >
                    ⚽ Generate My AI Training Plan
                  </button>
                </div>
              </div>
            )}
            
            {plan && (
              <div className={styles.actionButtons}>
                <div className={styles.buttonContainer}>
                  <button
                    onClick={sendWhatsAppNotification}
                    className={`${styles.btn} ${styles.btnSuccess}`}
                  >
                    📱 Send to WhatsApp
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
        </>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ 
              background: 'white', 
              borderRadius: '12px', 
              padding: '1.5rem',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              marginBottom: '2rem'
            }}>
              <h2 style={{ 
                margin: '0 0 1rem 0', 
                color: '#1f2937',
                fontSize: '1.5rem',
                fontWeight: '600'
              }}>
                📅 Training Calendar & Schedule
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                View and manage your training schedule across monthly, weekly, and daily views. 
                Click on any day to see workout details or edit your training plan.
              </p>
              <FullCalendar />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoachPage;