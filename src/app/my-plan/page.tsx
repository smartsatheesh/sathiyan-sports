'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PlanDisplay from '../components/PlanDisplay';
import LoadingSpinner from '../components/LoadingSpinner';
import styles from './my-plan.module.css';

interface CoachingPlan {
  athleteProfile: {
    name: string;
    age: number;
    sport: string;
    skillLevel: string;
    goal: string;
  };
  coachingPlan: any;
  generatedAt: string;
  planId?: string;
}

const MyPlanPage: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [plan, setPlan] = useState<CoachingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/login');
      return;
    }

    // Load plan data
    const loadPlan = async () => {
      try {
        // First try to load from localStorage
        const savedPlan = localStorage.getItem('currentCoachingPlan');
        if (savedPlan) {
          const parsedPlan = JSON.parse(savedPlan);
          setPlan(parsedPlan);
          setLoading(false);
          return;
        }

        // If no localStorage data, try to fetch from API
        const response = await fetch('/api/coach/get-latest-plan');
        if (response.ok) {
          const latestPlan = await response.json();
          setPlan(latestPlan);
        } else {
          setError('No training plan found. Please generate a plan first.');
        }
      } catch (error) {
        console.error('Error loading plan:', error);
        setError('Failed to load training plan. Please try again.');
      }
      setLoading(false);
    };

    loadPlan();
  }, [session, status, router]);

  if (status === 'loading' || loading) {
    return <LoadingSpinner />;
  }

  if (!session) {
    return null;
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>❌</div>
          <h2>No Training Plan Found</h2>
          <p>{error}</p>
          <button 
            onClick={() => router.push('/coach')}
            className={styles.generateButton}
          >
            Generate Your Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>📊 My Training Plan</h1>
        <p className={styles.description}>
          Your personalized training plan with detailed workout information and progress tracking.
        </p>
      </div>

      <div className={styles.planContainer}>
        {plan ? (
          <PlanDisplay 
            plan={plan} 
            userInfo={{
              name: plan.athleteProfile.name,
              age: plan.athleteProfile.age.toString(),
              sport: plan.athleteProfile.sport,
              skillLevel: plan.athleteProfile.skillLevel,
              goal: plan.athleteProfile.goal
            }}
          />
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎯</div>
            <h3>No Training Plan Yet</h3>
            <p>
              You haven't generated a training plan yet. Create your personalized plan to get started.
            </p>
            <button
              onClick={() => router.push('/coach')}
              className={styles.generateButton}
            >
              Generate Your Plan
            </button>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <p className={styles.footerText}>
          Need to update your plan? <a href="/coach" className={styles.link}>Generate a new plan</a>
        </p>
      </div>
    </div>
  );
};

export default MyPlanPage;