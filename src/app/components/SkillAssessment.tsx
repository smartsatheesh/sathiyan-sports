'use client';

import React, { useState } from 'react';

interface SkillAssessmentProps {
  sport: string;
  onAssessmentComplete: (scores: {
    motorSkillsScore: number;
    coordinationScore: number;
    strengthScore: number;
    enduranceScore: number;
  }) => void;
}

interface Question {
  id: string;
  question: string;
  answers: Array<{
    text: string;
    score: number;
  }>;
  category: 'motor' | 'coordination' | 'strength' | 'endurance';
}

const SkillAssessment: React.FC<SkillAssessmentProps> = ({ sport, onAssessmentComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isComplete, setIsComplete] = useState(false);

  // Generate sport-specific questions
  const generateQuestions = (sport: string): Question[] => {
    const baseQuestions: Question[] = [
      // Motor Skills Questions
      {
        id: 'motor1',
        question: `How would you rate your ball/equipment control in ${sport}?`,
        answers: [
          { text: 'I struggle with basic control and often lose possession', score: 25 },
          { text: 'I can control it adequately but make frequent mistakes', score: 50 },
          { text: 'I have good control with occasional lapses', score: 75 },
          { text: 'I have excellent control and rarely make mistakes', score: 100 }
        ],
        category: 'motor'
      },
      {
        id: 'motor2',
        question: `How accurate are your shots/hits/serves in ${sport}?`,
        answers: [
          { text: 'Very inaccurate, rarely hit my target', score: 20 },
          { text: 'Sometimes accurate, inconsistent', score: 45 },
          { text: 'Generally accurate with room for improvement', score: 70 },
          { text: 'Very accurate and consistent', score: 95 }
        ],
        category: 'motor'
      },
      {
        id: 'motor3',
        question: `How well can you execute advanced techniques in ${sport}?`,
        answers: [
          { text: 'I only know basic movements', score: 30 },
          { text: 'I can do some intermediate techniques', score: 55 },
          { text: 'I can perform most advanced techniques', score: 80 },
          { text: 'I master complex techniques effortlessly', score: 100 }
        ],
        category: 'motor'
      },

      // Coordination Questions
      {
        id: 'coord1',
        question: 'How well can you maintain balance while moving quickly?',
        answers: [
          { text: 'I often lose balance and stumble', score: 25 },
          { text: 'I can maintain balance but feel unstable', score: 50 },
          { text: 'Good balance with minor wobbles', score: 75 },
          { text: 'Excellent balance in all situations', score: 100 }
        ],
        category: 'coordination'
      },
      {
        id: 'coord2',
        question: 'How well can you track and react to fast-moving objects?',
        answers: [
          { text: 'Very difficult, often miss or react late', score: 20 },
          { text: 'Can track but reactions are slow', score: 45 },
          { text: 'Good tracking with quick reactions', score: 70 },
          { text: 'Excellent tracking and lightning-fast reactions', score: 95 }
        ],
        category: 'coordination'
      },
      {
        id: 'coord3',
        question: 'How well can you coordinate multiple body movements simultaneously?',
        answers: [
          { text: 'Struggle with complex movements', score: 30 },
          { text: 'Can do basic multi-limb coordination', score: 55 },
          { text: 'Good coordination in most situations', score: 80 },
          { text: 'Seamless coordination in all movements', score: 100 }
        ],
        category: 'coordination'
      },

      // Strength Questions
      {
        id: 'strength1',
        question: 'How would you rate your overall physical strength?',
        answers: [
          { text: 'Below average, get tired quickly', score: 25 },
          { text: 'Average strength, can handle basic activities', score: 50 },
          { text: 'Above average, can handle demanding activities', score: 75 },
          { text: 'Very strong, excel in power-based activities', score: 100 }
        ],
        category: 'strength'
      },
      {
        id: 'strength2',
        question: `How powerful are your movements in ${sport} (shots, jumps, throws)?`,
        answers: [
          { text: 'Weak and lack power', score: 20 },
          { text: 'Moderate power, could be stronger', score: 45 },
          { text: 'Good power, above average', score: 70 },
          { text: 'Excellent power, very explosive', score: 95 }
        ],
        category: 'strength'
      },
      {
        id: 'strength3',
        question: 'How many push-ups can you do consecutively?',
        answers: [
          { text: '0-10 push-ups', score: 25 },
          { text: '11-25 push-ups', score: 50 },
          { text: '26-40 push-ups', score: 75 },
          { text: '40+ push-ups', score: 100 }
        ],
        category: 'strength'
      },

      // Endurance Questions
      {
        id: 'endurance1',
        question: `How long can you play ${sport} continuously without getting tired?`,
        answers: [
          { text: 'Less than 15 minutes', score: 25 },
          { text: '15-30 minutes', score: 50 },
          { text: '30-60 minutes', score: 75 },
          { text: 'Over 60 minutes without fatigue', score: 100 }
        ],
        category: 'endurance'
      },
      {
        id: 'endurance2',
        question: 'How quickly do you recover between intense efforts?',
        answers: [
          { text: 'Very slow recovery, need long breaks', score: 20 },
          { text: 'Moderate recovery time', score: 45 },
          { text: 'Quick recovery, ready for next effort', score: 70 },
          { text: 'Almost instant recovery', score: 95 }
        ],
        category: 'endurance'
      },
      {
        id: 'endurance3',
        question: 'How far can you run without stopping?',
        answers: [
          { text: 'Less than 1 km', score: 25 },
          { text: '1-2 km', score: 50 },
          { text: '3-5 km', score: 75 },
          { text: 'More than 5 km', score: 100 }
        ],
        category: 'endurance'
      }
    ];

    return baseQuestions;
  };

  const questions = generateQuestions(sport);
  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswer = (score: number) => {
    const newAnswers = { ...answers, [currentQuestion.id]: score };
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Assessment complete, calculate scores
      const motorQuestions = questions.filter(q => q.category === 'motor');
      const coordQuestions = questions.filter(q => q.category === 'coordination');
      const strengthQuestions = questions.filter(q => q.category === 'strength');
      const enduranceQuestions = questions.filter(q => q.category === 'endurance');

      const motorSkillsScore = Math.round(
        motorQuestions.reduce((sum, q) => sum + (newAnswers[q.id] || 0), 0) / motorQuestions.length
      );
      
      const coordinationScore = Math.round(
        coordQuestions.reduce((sum, q) => sum + (newAnswers[q.id] || 0), 0) / coordQuestions.length
      );
      
      const strengthScore = Math.round(
        strengthQuestions.reduce((sum, q) => sum + (newAnswers[q.id] || 0), 0) / strengthQuestions.length
      );
      
      const enduranceScore = Math.round(
        enduranceQuestions.reduce((sum, q) => sum + (newAnswers[q.id] || 0), 0) / enduranceQuestions.length
      );

      setIsComplete(true);
      onAssessmentComplete({
        motorSkillsScore,
        coordinationScore,
        strengthScore,
        enduranceScore
      });
    }
  };

  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  if (isComplete) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '2rem', 
        background: '#f0fdf4', 
        borderRadius: '1rem', 
        border: '1px solid #bbf7d0',
        color: '#166534'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Assessment Complete!
        </h3>
        <p style={{ color: '#15803d' }}>
          Your skill assessment has been completed. Click "Next" to proceed.
        </p>
      </div>
    );
  }

  return (
    <div style={{ 
      background: 'white', 
      padding: '2rem', 
      borderRadius: '1rem', 
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb'
    }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#374151' }}>
            🎯 Skill Assessment for {sport}
          </h3>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div style={{ 
          width: '100%', 
          background: '#e5e7eb', 
          borderRadius: '1rem', 
          height: '8px',
          overflow: 'hidden'
        }}>
          <div 
            style={{ 
              background: 'linear-gradient(45deg, #00ACC1, #0097A7)',
              height: '100%', 
              borderRadius: '1rem', 
              transition: 'width 0.3s ease',
              width: `${progress}%`
            }}
          ></div>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h4 style={{ 
          fontSize: '1.125rem', 
          fontWeight: '600', 
          color: '#374151', 
          marginBottom: '1.5rem',
          lineHeight: '1.6'
        }}>
          {currentQuestion.question}
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {currentQuestion.answers.map((answer, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(answer.score)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '1.25rem',
                borderRadius: '0.75rem',
                border: '2px solid #e5e7eb',
                background: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '1rem',
                lineHeight: '1.5'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#00ACC1';
                e.currentTarget.style.background = '#f8faff';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 172, 193, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#374151', fontWeight: '500' }}>
                  {answer.text}
                </span>
                <span style={{ 
                  fontSize: '0.75rem', 
                  padding: '0.25rem 0.5rem',
                  borderRadius: '1rem',
                  background: answer.score === 100 ? '#dcfce7' : 
                            answer.score >= 70 ? '#dbeafe' : 
                            answer.score >= 45 ? '#fef3c7' : '#fee2e2',
                  color: answer.score === 100 ? '#166534' : 
                         answer.score >= 70 ? '#1d4ed8' : 
                         answer.score >= 45 ? '#d97706' : '#dc2626',
                  fontWeight: '600'
                }}>
                  {answer.score === 100 ? '🏆 Expert' : 
                   answer.score >= 70 ? '⭐ Advanced' : 
                   answer.score >= 45 ? '📈 Intermediate' : '🌱 Beginner'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ 
        textAlign: 'center', 
        fontSize: '0.875rem', 
        color: '#6b7280',
        padding: '1rem',
        background: '#f9fafb',
        borderRadius: '0.5rem',
        border: '1px solid #e5e7eb'
      }}>
        <p>💡 <strong>Tip:</strong> Answer honestly for the most accurate training plan</p>
      </div>
    </div>
  );
};

export default SkillAssessment;