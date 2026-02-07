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

interface EditableWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  workout: any;
  onSave: (updatedWorkout: any) => void;
  editable?: boolean;
}

const EditableWorkoutModal: React.FC<EditableWorkoutModalProps> = ({
  isOpen,
  onClose,
  date,
  workout,
  onSave,
  editable = true
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedWorkout, setEditedWorkout] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  console.log('🎬 Editable Modal render - isOpen:', isOpen, 'workout:', workout, 'date:', date);
  
  // Initialize edited workout when modal opens
  useEffect(() => {
    if (workout) {
      const initialWorkout = {
        type: workout.type || workout.workout || 'Custom Workout',
        duration: workout.duration || '45 minutes',
        intensity: workout.intensity || 'Medium',
        warmup: workout.warmup || 'Light stretching and movement',
        cooldown: workout.cooldown || 'Static stretching',
        tips: workout.tips || 'Focus on proper form',
        exercises: workout.exercises || [
          {
            name: workout.workout || 'Custom Exercise',
            sets: 3,
            reps: '10-15',
            instructions: 'Perform this exercise with proper form',
            equipment: 'None',
            targetMuscles: ['Full Body']
          }
        ]
      };
      setEditedWorkout(initialWorkout);
      setHasUnsavedChanges(false);
    }
  }, [workout, isOpen]);

  // Check for changes whenever editedWorkout is updated
  useEffect(() => {
    if (editedWorkout && workout && isEditing) {
      const originalWorkout = {
        type: workout.type || workout.workout || 'Custom Workout',
        duration: workout.duration || '45 minutes',
        intensity: workout.intensity || 'Medium',
        warmup: workout.warmup || 'Light stretching and movement',
        cooldown: workout.cooldown || 'Static stretching',
        tips: workout.tips || 'Focus on proper form',
        exercises: workout.exercises || []
      };
      
      const hasChanges = JSON.stringify(editedWorkout) !== JSON.stringify(originalWorkout);
      setHasUnsavedChanges(hasChanges);
    }
  }, [editedWorkout, workout, isEditing]);

  if (!isOpen || !date) {
    console.log('❌ Editable Modal not rendering:', { isOpen, hasDate: !!date });
    return null;
  }

  console.log('✅ Editable Modal should be visible now');

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleSave = () => {
    if (onSave && editedWorkout) {
      onSave(editedWorkout);
      setIsEditing(false);
      setHasUnsavedChanges(false);
      
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

  const handleClose = () => {
    if (isEditing && hasUnsavedChanges) {
      setShowSaveDialog(true);
    } else {
      onClose();
      setIsEditing(false);
      setHasUnsavedChanges(false);
      setShowSaveDialog(false);
    }
  };

  const handleSaveAndClose = () => {
    handleSave();
    setShowSaveDialog(false);
    onClose();
  };

  const handleDiscardAndClose = () => {
    setIsEditing(false);
    setHasUnsavedChanges(false);
    setShowSaveDialog(false);
    onClose();
  };

  const addExercise = () => {
    const newExercise = {
      name: 'New Exercise',
      sets: 3,
      reps: '10',
      instructions: 'Add your exercise instructions here',
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

  if (!editedWorkout) {
    return null;
  }

  return (
    <React.Fragment>
      <div className={styles.modalOverlay} onClick={handleClose}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <div className={styles.headerInfo}>
              <h2 className={styles.modalTitle}>
                {isEditing ? '✏️ Edit Workout' : '👁️ Workout Details'}
                {isEditing && hasUnsavedChanges && (
                  <span style={{ color: '#f59e0b', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                    (Unsaved changes)
                  </span>
                )}
              </h2>
              <p className={styles.modalDate}>{formatDate(date)}</p>
            </div>
            <div className={styles.headerActions}>
              {editable && (
                <button 
                  className={`${styles.editButton} ${isEditing ? styles.active : ''}`}
                  onClick={() => {
                    if (isEditing && hasUnsavedChanges) {
                      setShowSaveDialog(true);
                    } else {
                      setIsEditing(!isEditing);
                    }
                  }}
                  style={{
                    background: isEditing ? '#ef4444' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    marginRight: '0.5rem'
                  }}
                >
                  {isEditing ? '👁️ View' : '✏️ Edit'}
                </button>
              )}
              <button className={styles.closeButton} onClick={handleClose}>
                ✕
              </button>
            </div>
          </div>

        <div className={styles.modalBody}>
          {/* Workout Overview */}
          <div className={styles.workoutOverview}>
            <div className={styles.overviewItem}>
              <span className={styles.overviewLabel}>Type:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editedWorkout.type || ''}
                  onChange={(e) => setEditedWorkout(prev => ({ ...prev, type: e.target.value }))}
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.25rem',
                    width: '200px'
                  }}
                />
              ) : (
                <span className={styles.overviewValue}>{editedWorkout.type}</span>
              )}
            </div>
            <div className={styles.overviewItem}>
              <span className={styles.overviewLabel}>Duration:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editedWorkout.duration || ''}
                  onChange={(e) => setEditedWorkout(prev => ({ ...prev, duration: e.target.value }))}
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.25rem',
                    width: '150px'
                  }}
                />
              ) : (
                <span className={styles.overviewValue}>{editedWorkout.duration}</span>
              )}
            </div>
            <div className={styles.overviewItem}>
              <span className={styles.overviewLabel}>Intensity:</span>
              {isEditing ? (
                <select
                  value={editedWorkout.intensity || ''}
                  onChange={(e) => setEditedWorkout(prev => ({ ...prev, intensity: e.target.value }))}
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.25rem',
                    width: '120px'
                  }}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              ) : (
                <span className={`${styles.overviewValue} ${styles[(editedWorkout.intensity || 'medium').toLowerCase()]}`}>
                  {editedWorkout.intensity}
                </span>
              )}
            </div>
          </div>

          {/* Warmup */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>🔥 Warmup</h3>
            {isEditing ? (
              <textarea
                value={editedWorkout.warmup || ''}
                onChange={(e) => setEditedWorkout(prev => ({ ...prev, warmup: e.target.value }))}
                placeholder="Enter warmup routine..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem',
                  resize: 'vertical'
                }}
              />
            ) : (
              <p className={styles.sectionText}>{editedWorkout.warmup}</p>
            )}
          </div>

          {/* Exercises */}
          <div className={styles.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className={styles.sectionTitle}>💪 Exercises</h3>
              {isEditing && (
                <button 
                  onClick={addExercise}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.25rem',
                    cursor: 'pointer'
                  }}
                >
                  ➕ Add Exercise
                </button>
              )}
            </div>
            <div className={styles.exercisesList}>
              {(editedWorkout.exercises || []).map((exercise, index) => (
                <div key={index} className={styles.exerciseCard} style={{ position: 'relative', marginBottom: '1rem', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
                  {isEditing && (
                    <button 
                      onClick={() => removeExercise(index)}
                      style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '30px',
                        height: '30px',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️
                    </button>
                  )}
                  <div className={styles.exerciseHeader}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={exercise.name}
                        onChange={(e) => updateExercise(index, 'name', e.target.value)}
                        placeholder="Exercise name"
                        style={{
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.25rem',
                          fontWeight: 'bold',
                          fontSize: '1.1rem',
                          width: '70%'
                        }}
                      />
                    ) : (
                      <h4 className={styles.exerciseName}>{exercise.name}</h4>
                    )}
                    <div className={styles.exerciseSpecs}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            type="number"
                            value={exercise.sets || ''}
                            onChange={(e) => updateExercise(index, 'sets', parseInt(e.target.value))}
                            placeholder="Sets"
                            style={{ width: '60px', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                          />
                          <span>×</span>
                          <input
                            type="text"
                            value={exercise.reps || ''}
                            onChange={(e) => updateExercise(index, 'reps', e.target.value)}
                            placeholder="Reps"
                            style={{ width: '80px', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                          />
                        </div>
                      ) : (
                        <>
                          {exercise.sets && exercise.reps && (
                            <span className={styles.spec}>
                              {exercise.sets} sets × {exercise.reps} reps
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.exerciseDetails} style={{ marginTop: '1rem' }}>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Instructions:</label>
                    {isEditing ? (
                      <textarea
                        value={exercise.instructions}
                        onChange={(e) => updateExercise(index, 'instructions', e.target.value)}
                        placeholder="Exercise instructions..."
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.25rem'
                        }}
                      />
                    ) : (
                      <p className={styles.exerciseInstructions}>{exercise.instructions}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cooldown */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>🧘 Cooldown</h3>
            {isEditing ? (
              <textarea
                value={editedWorkout.cooldown || ''}
                onChange={(e) => setEditedWorkout(prev => ({ ...prev, cooldown: e.target.value }))}
                placeholder="Enter cooldown routine..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem'
                }}
              />
            ) : (
              <p className={styles.sectionText}>{editedWorkout.cooldown}</p>
            )}
          </div>

          {/* Tips */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>💡 Coaching Tips & Notes</h3>
            {isEditing ? (
              <textarea
                value={editedWorkout.tips || ''}
                onChange={(e) => setEditedWorkout(prev => ({ ...prev, tips: e.target.value }))}
                placeholder="Add your coaching tips and notes..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem'
                }}
              />
            ) : (
              <p className={styles.sectionText}>{editedWorkout.tips}</p>
            )}
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
              <button 
                onClick={handleSave}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                💾 Save Changes
              </button>
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setEditedWorkout({
                    type: workout.type || workout.workout || 'Custom Workout',
                    duration: workout.duration || '45 minutes',
                    intensity: workout.intensity || 'Medium',
                    warmup: workout.warmup || 'Light stretching and movement',
                    cooldown: workout.cooldown || 'Static stretching',
                    tips: workout.tips || 'Focus on proper form',
                    exercises: workout.exercises || []
                  });
                }}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                ❌ Cancel
              </button>
            </div>
          )}
        </div>

        {!isEditing && (
          <div className={styles.modalFooter}>
            <button 
              className={styles.closeModalButton} 
              onClick={onClose}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className={styles.modalOverlay} style={{ zIndex: 1001 }}>
          <div 
            className={styles.modalContent} 
            style={{ 
              maxWidth: '400px', 
              padding: '2rem',
              background: 'white',
              borderRadius: '0.75rem'
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0', color: '#ef4444' }}>
              ⚠️ Unsaved Changes
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', color: '#6b7280' }}>
              You have unsaved changes. Would you like to save them before closing?
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSaveDialog(false)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  background: 'white',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDiscardAndClose}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                Discard
              </button>
              <button
                onClick={handleSaveAndClose}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  background: '#10b981',
                  color: 'white',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
};

export default EditableWorkoutModal;