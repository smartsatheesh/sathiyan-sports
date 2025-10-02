'use client';

import React from 'react';
import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'teal';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Generating your personalized plan...', 
  size = 'large',
  variant = 'teal' 
}) => {
  return (
    <div className={styles.loadingContainer}>
      <div className={`${styles.spinner} ${styles[size]} ${styles[variant]}`}>
        <div className={styles.spinnerInner}>
          <div className={styles.spinnerCircle}></div>
          <div className={styles.spinnerCircle}></div>
          <div className={styles.spinnerCircle}></div>
          <div className={styles.spinnerCircle}></div>
        </div>
      </div>
      
      <div className={styles.loadingText}>
        <h3 className={styles.loadingTitle}>🤖 AI Coach Working</h3>
        <p className={styles.loadingMessage}>{message}</p>
        
        <div className={styles.loadingSteps}>
          <div className={styles.step}>
            <span className={styles.stepIcon}>🧠</span>
            <span>Analyzing your profile...</span>
          </div>
          <div className={styles.step}>
            <span className={styles.stepIcon}>⚡</span>
            <span>Consulting Gemini 2.5 Pro...</span>
          </div>
          <div className={styles.step}>
            <span className={styles.stepIcon}>🎯</span>
            <span>Creating personalized plan...</span>
          </div>
          <div className={styles.step}>
            <span className={styles.stepIcon}>📋</span>
            <span>Finalizing recommendations...</span>
          </div>
        </div>
        
        <div className={styles.progressIndicator}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill}></div>
          </div>
          <p className={styles.progressText}>This may take 30-60 seconds</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;