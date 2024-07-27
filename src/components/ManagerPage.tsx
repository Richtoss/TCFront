import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface TimecardEntry {
  id: number;
  day: string;
  jobName: string;
  startTime: string;
  endTime: string;
  description: string;
}

interface Timecard {
  _id: string;
  weekStartDate: string;
  entries: TimecardEntry[];
  totalHours: number;
  completed: boolean;
}

interface Employee {
  _id: string;
  name: string;
  email: string;
  timecards: Timecard[];
}

const ManagerPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [expandedTimecards, setExpandedTimecards] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get<Employee[]>('https://tcbackend.onrender.com/api/timecard/all', {
        headers: { 'x-auth-token': token }
      });
      setEmployees(res.data.map(employee => ({
        ...employee,
        timecards: employee.timecards.slice(-3) // Keep only the last 3 timecards
      })));
    } catch (err) {
      console.error('Error fetching employee data:', err);
      setError('Failed to fetch employee data. Please try again later.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const toggleEmployee = (employeeId: string) => {
    setExpandedEmployeeId(prevId => prevId === employeeId ? null : employeeId);
    // Reset expanded timecards when toggling employee
    setExpandedTimecards({});
  };

  const toggleTimecard = (timecardId: string) => {
    setExpandedTimecards(prev => ({
      ...prev,
      [timecardId]: !prev[timecardId]
    }));
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Manager's Timecard View</h1>
      <button 
        onClick={handleLogout} 
        style={{ 
          position: 'absolute', 
          top: '20px', 
          right: '20px',
          padding: '10px',
          backgroundColor: '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Logout
      </button>
      
      {error && <p style={{ color: 'red', marginBottom: '20px' }}>{error}</p>}

      {employees.map(employee => (
        <div key={employee._id} style={{ marginBottom: '20px', border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden' }}>
          <div 
            onClick={() => toggleEmployee(employee._id)} 
            style={{ 
              cursor: 'pointer', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: '#f0f0f0',
              padding: '15px',
            }}
          >
            <h2 style={{ margin: 0 }}>{employee.name} - {employee.email}</h2>
            <span>{expandedEmployeeId === employee._id ? '▲' : '▼'}</span>
          </div>
          {expandedEmployeeId === employee._id && (
            <div style={{ padding: '15px' }}>
              {employee.timecards.map(timecard => (
                <div key={timecard._id} style={{ marginBottom: '10px', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '4px' }}>
                  <div 
                    onClick={() => toggleTimecard(timecard._id)}
                    style={{ 
                      cursor: 'pointer', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center'
                    }}
                  >
                    <h3 style={{ margin: 0 }}>Week of {formatDate(timecard.weekStartDate)} - Total Hours: {timecard.totalHours.toFixed(2)}</h3>
                    <span>{expandedTimecards[timecard._id] ? '▲' : '▼'}</span>
                  </div>
                  {expandedTimecards[timecard._id] && (
                    <div style={{ marginTop: '10px' }}>
                      <p>Status: {timecard.completed ? 'Completed' : 'In Progress'}</p>
                      {timecard.entries.map(entry => (
                        <div key={entry.id} style={{ marginTop: '5px', fontSize: '0.9em', borderLeft: '2px solid #ddd', paddingLeft: '10px' }}>
                          <p style={{ margin: '5px 0' }}><strong>{entry.day} - {entry.jobName}</strong></p>
                          <p style={{ margin: '5px 0' }}>{entry.startTime} to {entry.endTime} - {entry.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ManagerPage;