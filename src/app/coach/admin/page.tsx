'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface CoachStats {
  totalUsers: number;
  totalPlans: number;
  totalSessions: number;
  activePlans: number;
  completedSessions: number;
  newUsersLast30Days: number;
  newUsersLast7Days: number;
  plansLast30Days: number;
  plansLast7Days: number;
  sportStats: Array<{ _id: string; count: number }>;
  goalStats: Array<{ _id: string; count: number }>;
  skillLevelStats: Array<{ _id: string; count: number }>;
}

const CoachAdminPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<CoachStats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    if (session?.user?.role !== 'admin') {
      router.push('/');
      return;
    }

    fetchCoachData();
  }, [session, status, router]);

  const fetchCoachData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/coach/admin?type=overview');
      const result = await response.json();

      if (result.success) {
        setStats(result.data.stats);
        setUsers(result.data.users?.data || []);
        setPlans(result.data.plans?.data || []);
      }
    } catch (error) {
      console.error('Error fetching coach data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            border: '3px solid rgba(102, 126, 234, 0.3)',
            borderTop: '3px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Loading Coach Admin Data...</p>
        </div>
      </div>
    );
  }

  if (session?.user?.role !== 'admin') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f8fafc'
      }}>
        <div style={{ 
          background: 'white', 
          padding: '2rem', 
          borderRadius: '1rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h2>🚫 Access Denied</h2>
          <p>Admin access required to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--primary-gradient)',
      padding: '2rem 1rem',
      marginTop: '64px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '2rem',
          borderRadius: '1rem',
          marginBottom: '2rem',
          color: 'white',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '1rem', 
            marginBottom: '1rem' 
          }}>
            <img 
              src="/sir-alex-anime.png" 
              alt="Sir Alex Ferguson Sports" 
              style={{ 
                height: '60px', 
                width: '60px', 
                borderRadius: '12px', 
                border: '3px solid rgba(255,255,255,0.3)'
              }} 
            />
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0 }}>
              Sir Alex Sports Coach Admin Dashboard
            </h1>
          </div>
          <p>Legendary Coaching Excellence • AI-powered coaching data and analytics</p>
        </div>

        {/* Tabs */}
        <div style={{ 
          background: 'white',
          borderRadius: '1rem',
          marginBottom: '2rem',
          overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
            {[
              { id: 'stats', label: '📊 Statistics', icon: '📊' },
              { id: 'users', label: '👥 Users', icon: '👥' },
              { id: 'plans', label: '📋 Plans', icon: '📋' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '1rem 2rem',
                  border: 'none',
                  background: activeTab === tab.id ? '#667eea' : 'transparent',
                  color: activeTab === tab.id ? 'white' : '#6b7280',
                  fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '2rem' }}>
            {/* Statistics Tab */}
            {activeTab === 'stats' && stats && (
              <div>
                <h2 style={{ marginBottom: '1.5rem', color: '#374151' }}>📊 Overview Statistics</h2>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '2rem'
                }}>
                  {[
                    { label: 'Total Users', value: stats.totalUsers, color: '#3b82f6' },
                    { label: 'Total Plans', value: stats.totalPlans, color: '#10b981' },
                    { label: 'Active Plans', value: stats.activePlans, color: '#f59e0b' },
                    { label: 'Completed Sessions', value: stats.completedSessions, color: '#00ACC1' },
                    { label: 'New Users (30d)', value: stats.newUsersLast30Days, color: '#06b6d4' },
                    { label: 'Plans Generated (7d)', value: stats.plansLast7Days, color: '#ef4444' }
                  ].map((stat, index) => (
                    <div key={index} style={{
                      background: 'white',
                      border: `2px solid ${stat.color}`,
                      borderRadius: '0.75rem',
                      padding: '1.5rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ 
                        fontSize: '2rem', 
                        fontWeight: 'bold', 
                        color: stat.color,
                        marginBottom: '0.5rem'
                      }}>
                        {stat.value}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Distribution Charts */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '2rem'
                }}>
                  {/* Sports Distribution */}
                  <div style={{ 
                    background: '#f9fafb', 
                    padding: '1.5rem', 
                    borderRadius: '0.75rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <h3 style={{ marginBottom: '1rem', color: '#374151' }}>🏃‍♂️ Sports Distribution</h3>
                    {stats.sportStats.map((sport, index) => (
                      <div key={index} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        marginBottom: '0.5rem',
                        padding: '0.5rem',
                        background: 'white',
                        borderRadius: '0.5rem'
                      }}>
                        <span>{sport._id || 'Not specified'}</span>
                        <span style={{ fontWeight: 'bold', color: '#667eea' }}>{sport.count}</span>
                      </div>
                    ))}
                  </div>

                  {/* Goals Distribution */}
                  <div style={{ 
                    background: '#f9fafb', 
                    padding: '1.5rem', 
                    borderRadius: '0.75rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <h3 style={{ marginBottom: '1rem', color: '#374151' }}>🎯 Goals Distribution</h3>
                    {stats.goalStats.map((goal, index) => (
                      <div key={index} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        marginBottom: '0.5rem',
                        padding: '0.5rem',
                        background: 'white',
                        borderRadius: '0.5rem'
                      }}>
                        <span>{goal._id || 'Not specified'}</span>
                        <span style={{ fontWeight: 'bold', color: '#10b981' }}>{goal.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div>
                <h2 style={{ marginBottom: '1.5rem', color: '#374151' }}>👥 Coach Users</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Name</th>
                        <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Sport</th>
                        <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Goal</th>
                        <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>BMI</th>
                        <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '1rem' }}>{user.name}</td>
                          <td style={{ padding: '1rem' }}>{user.sport}</td>
                          <td style={{ padding: '1rem' }}>{user.goal}</td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '1rem',
                              fontSize: '0.75rem',
                              background: user.bmi?.category === 'Normal weight' ? '#dcfce7' : '#fef3c7',
                              color: user.bmi?.category === 'Normal weight' ? '#166534' : '#d97706'
                            }}>
                              {user.bmi?.value} ({user.bmi?.category})
                            </span>
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Plans Tab */}
            {activeTab === 'plans' && (
              <div>
                <h2 style={{ marginBottom: '1.5rem', color: '#374151' }}>📋 Generated Plans</h2>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '1rem'
                }}>
                  {plans.map((plan, index) => (
                    <div key={index} style={{
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.75rem',
                      padding: '1.5rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '1rem'
                      }}>
                        <span style={{ 
                          padding: '0.25rem 0.5rem',
                          background: plan.isActive ? '#dcfce7' : '#f3f4f6',
                          color: plan.isActive ? '#166534' : '#6b7280',
                          borderRadius: '1rem',
                          fontSize: '0.75rem',
                          fontWeight: 'bold'
                        }}>
                          {plan.isActive ? '✅ Active' : '⏸️ Inactive'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {plan.planType}
                        </span>
                      </div>
                      
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          Generated: {new Date(plan.generatedAt).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          AI Model: {plan.metadata?.aiModel}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          Generation Time: {plan.metadata?.generationTime}ms
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CoachAdminPage;