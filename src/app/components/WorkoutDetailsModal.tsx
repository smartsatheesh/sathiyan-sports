'use client';

import React, { useState, useEffect } from 'react';
import styles from './WorkoutDetailsModal.module.css';

interface Exercise {
  name: string;
  sets?: number;
  reps?: string;
  duration?: string;
  restBetweenSets?: string;
  instructions: string;
  equipment?: string;
  targetMuscles?: string[];
}

interface WorkoutDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  workout: {
    type?: string;
    duration?: string;
    intensity?: string;
    exercises?: Exercise[];
    warmup?: string;
    cooldown?: string;
    tips?: string;
    equipment?: string[];
  } | null;
  onSave?: (updatedWorkout: any) => void;
  editable?: boolean;
}

const WorkoutDetailsModal: React.FC<WorkoutDetailsModalProps> = ({
  isOpen,
  onClose,
  date,
  workout,
  onSave,
  editable = true
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedWorkout, setEditedWorkout] = useState<any>(null);

  console.log('🎬 Modal render - isOpen:', isOpen, 'workout:', workout, 'date:', date);
  
  // Initialize edited workout when modal opens
  useEffect(() => {
    if (workout) {
      setEditedWorkout({
        type: workout.type || 'Custom Workout',
        duration: workout.duration || '45 minutes',
        intensity: workout.intensity || 'Medium',
        warmup: workout.warmup || 'Light stretching and movement',
        cooldown: workout.cooldown || 'Static stretching',
        tips: workout.tips || 'Focus on proper form',
        exercises: workout.exercises || []
      });
    }
  }, [workout, isOpen]);

  if (!isOpen || !workout || !date) {
    console.log('❌ Modal not rendering:', { isOpen, hasWorkout: !!workout, hasDate: !!date });
    return null;
  }

  console.log('✅ Modal should be visible now');

  const handleSave = () => {
    if (onSave && editedWorkout) {
      onSave(editedWorkout);
      setIsEditing(false);
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
        z-index: 10000;
        font-weight: 500;
      `;
      notification.textContent = '✅ Workout updated successfully!';
      document.body.appendChild(notification);
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 3000);
    }
  };

  const addExercise = () => {
    const newExercise = {
      name: 'New Exercise',
      sets: 3,
      reps: '10',
      instructions: 'Exercise instructions here',
      equipment: 'None',
      targetMuscles: ['Target Muscle']
    };
    setEditedWorkout(prev => ({
      ...prev,
      exercises: [...(prev.exercises || []), newExercise]
    }));
  };

  const updateExercise = (index: number, field: string, value: any) => {
    setEditedWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => 
        i === index ? { ...ex, [field]: value } : ex
      )
    }));
  };

  const removeExercise = (index: number) => {
    setEditedWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerInfo}>
            <h2 className={styles.modalTitle}>Workout Details</h2>
            <p className={styles.modalDate}>{formatDate(date)}</p>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Workout Overview */}
          <div className={styles.workoutOverview}>
            <div className={styles.overviewItem}>
              <span className={styles.overviewLabel}>Type:</span>
              <span className={styles.overviewValue}>{workout.type || 'General Training'}</span>
            </div>
            <div className={styles.overviewItem}>
              <span className={styles.overviewLabel}>Duration:</span>
              <span className={styles.overviewValue}>{workout.duration || '60 minutes'}</span>
            </div>
            <div className={styles.overviewItem}>
              <span className={styles.overviewLabel}>Intensity:</span>
              <span className={`${styles.overviewValue} ${styles[workout.intensity?.toLowerCase() || 'medium']}`}>
                {workout.intensity || 'Medium'}
              </span>
            </div>
          </div>

          {/* Warmup */}
          {workout.warmup && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>🔥 Warmup</h3>
              <p className={styles.sectionText}>{workout.warmup}</p>
            </div>
          )}

          {/* Exercises */}
          {workout.exercises && workout.exercises.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>💪 Exercises</h3>
              <div className={styles.exercisesList}>
                {workout.exercises.map((exercise, index) => (
                  <div key={index} className={styles.exerciseCard}>
                    <div className={styles.exerciseHeader}>
                      <h4 className={styles.exerciseName}>{exercise.name}</h4>
                      <div className={styles.exerciseSpecs}>
                        {exercise.sets && exercise.reps && (
                          <span className={styles.spec}>
                            {exercise.sets} sets × {exercise.reps} reps
                          </span>
                        )}
                        {exercise.duration && (
                          <span className={styles.spec}>
                            {exercise.duration}
                          </span>
                        )}
                        {exercise.restBetweenSets && (
                          <span className={styles.spec}>
                            Rest: {exercise.restBetweenSets}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className={styles.exerciseDetails}>
                      <p className={styles.instructions}>
                        <strong>Instructions:</strong> {exercise.instructions}
                      </p>
                      
                      {exercise.equipment && (
                        <p className={styles.equipment}>
                          <strong>Equipment:</strong> {exercise.equipment}
                        </p>
                      )}
                      
                      {exercise.targetMuscles && exercise.targetMuscles.length > 0 && (
                        <div className={styles.targetMuscles}>
                          <strong>Target Muscles:</strong>
                          <div className={styles.musclesTags}>
                            {exercise.targetMuscles.map((muscle, idx) => (
                              <span key={idx} className={styles.muscleTag}>
                                {muscle}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cooldown */}
          {workout.cooldown && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>🧘 Cooldown</h3>
              <p className={styles.sectionText}>{workout.cooldown}</p>
            </div>
          )}

          {/* Tips */}
          {workout.tips && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>💡 Tips</h3>
              <p className={styles.sectionText}>{workout.tips}</p>
            </div>
          )}

          {/* Equipment Needed */}
          {workout.equipment && workout.equipment.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>🎯 Equipment Needed</h3>
              <div className={styles.equipmentList}>
                {workout.equipment.map((item, index) => (
                  <span key={index} className={styles.equipmentItem}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.closeModalButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkoutDetailsModal;