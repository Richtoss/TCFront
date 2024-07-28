import React, { useState, useEffect, useCallback } from 'react';
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
  const [expandedEmployeeIds, setExpandedEmployeeIds] = useState<string[]>([]);
  const [expandedTimecardIds, setExpandedTimecardIds] = useState<string[]>([]);
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
      const employeesData = res.data.map(employee => ({
        ...employee,
        timecards: employee.timecards.slice(-3) // Keep only the last 3 timecards
      }));
      setEmployees(employeesData);
      console.log('Fetched employees data:', employeesData);
    } catch (err) {
      console.error('Error fetching employee data:', err);
      setError('Failed to fetch employee data. Please try again later.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const toggleEmployee = useCallback((employeeId: string) => {
    console.log('Attempting to toggle employee with ID:', employeeId);
    if (!employeeId) {
      console.error('Invalid employee ID:', employeeId);
      return;
    }
    setExpandedEmployeeIds(prevIds => {
      const newIds = prevIds.includes(employeeId)
        ? prevIds.filter(id => id !== employeeId)
        : [...prevIds, employeeId];
      console.log('New expanded employee IDs:', newIds);
      return newIds;
    });
  }, []);

  const toggleTimecard = useCallback((timecardId: string) => {
    console.log('Toggling timecard:', timecardId);
    setExpandedTimecardIds(prevIds => 
      prevIds.includes(timecardId)
        ? prevIds.filter(id => id !== timecardId)
        : [...prevIds, timecardId]
    );
  }, []);

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

      {employees.map(employee => {
        console.log('Rendering employee:', employee._id, employee.name);
        return (
          <div key={employee._id} style={{ marginBottom: '20px', border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: '#f0f0f0',
              padding: '15px',
            }}>
              <h2 style={{ margin: 0 }}>{employee.name} - {employee.email}</h2>
              <button
                onClick={() => {
                  console.log('Toggle button clicked for employee:', employee._id);
                  toggleEmployee(employee._id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '5px 10px',
                }}
              >
                {expandedEmployeeIds.includes(employee._id) ? '▲' : '▼'}
              </button>
            </div>
            {expandedEmployeeIds.includes(employee._id) && (
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
                      <span>{expandedTimecardIds.includes(timecard._id) ? '▲' : '▼'}</span>
                    </div>
                    {expandedTimecardIds.includes(timecard._id) && (
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
        );
      })}
    </div>
  );
};

export default ManagerPage;