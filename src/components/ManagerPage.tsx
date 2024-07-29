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

interface NewEmployee {
  name: string;
  email: string;
  password: string;
  phone: string;
  isManager: boolean;
  notes: string;
}

const ManagerPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [expandedTimecards, setExpandedTimecards] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string>('');
  const [activeView, setActiveView] = useState<'timeCards' | 'employeeManagement' | 'history' | 'timeCardGeneration'>('timeCards');
  const [showNewEmployeeForm, setShowNewEmployeeForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState<NewEmployee>({
    name: '',
    email: '',
    password: '',
    phone: '',
    isManager: false,
    notes: ''
  });
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
        timecards: employee.timecards.slice(-3) // Only keep the last 3 timecards
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
    setExpandedEmployee(prev => prev === employeeId ? null : employeeId);
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

  const handleNewEmployeeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewEmployee(prev => ({
      ...prev,
      [name]: name === 'isManager' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleNewEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('https://tcbackend.onrender.com/api/auth/register', newEmployee, {
        headers: { 'x-auth-token': token }
      });
      setShowNewEmployeeForm(false);
      setNewEmployee({
        name: '',
        email: '',
        password: '',
        phone: '',
        isManager: false,
        notes: ''
      });
      fetchEmployeeData(); // Refresh the employee list
      setError('');
    } catch (err) {
      console.error('Error creating new employee:', err);
      setError('Failed to create new employee. Please try again.');
    }
  };

  const renderTimeCards = () => (
    <>
      {employees.map(employee => (
        <div key={employee._id} style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '4px' }}>
          <div 
            onClick={() => toggleEmployee(employee._id)} 
            style={{ 
              cursor: 'pointer', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: '#f0f0f0',
              padding: '10px',
              borderRadius: '4px'
            }}
          >
            <h2 style={{ margin: 0 }}>{employee.name} - {employee.email}</h2>
            <span>{expandedEmployee === employee._id ? '▲' : '▼'}</span>
          </div>
          {expandedEmployee === employee._id && (
            <div style={{ marginTop: '10px' }}>
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
    </>
  );

  const renderEmployeeManagement = () => (
    <div>
      <h2>Employee Management</h2>
      <button 
        onClick={() => setShowNewEmployeeForm(true)} 
        style={buttonStyle}
      >
        Create New Employee
      </button>
      
      {showNewEmployeeForm && (
        <form onSubmit={handleNewEmployeeSubmit} style={{ marginTop: '20px' }}>
          <h3>New Employee Information</h3>
          <div style={formGroupStyle}>
            <label htmlFor="name">Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={newEmployee.name}
              onChange={handleNewEmployeeChange}
              required
              style={inputStyle}
            />
          </div>
          <div style={formGroupStyle}>
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={newEmployee.email}
              onChange={handleNewEmployeeChange}
              required
              style={inputStyle}
            />
          </div>
          <div style={formGroupStyle}>
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={newEmployee.password}
              onChange={handleNewEmployeeChange}
              required
              style={inputStyle}
            />
          </div>
          <div style={formGroupStyle}>
            <label htmlFor="phone">Phone:</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={newEmployee.phone}
              onChange={handleNewEmployeeChange}
              style={inputStyle}
            />
          </div>
          <div style={formGroupStyle}>
            <label htmlFor="isManager">
              <input
                type="checkbox"
                id="isManager"
                name="isManager"
                checked={newEmployee.isManager}
                onChange={handleNewEmployeeChange}
              />
              Is Manager
            </label>
          </div>
          <div style={formGroupStyle}>
            <label htmlFor="notes">Notes:</label>
            <textarea
              id="notes"
              name="notes"
              value={newEmployee.notes}
              onChange={handleNewEmployeeChange}
              style={{...inputStyle, height: '100px'}}
            />
          </div>
          <button type="submit" style={buttonStyle}>Submit</button>
          <button type="button" onClick={() => setShowNewEmployeeForm(false)} style={{...buttonStyle, backgroundColor: '#f44336', marginLeft: '10px'}}>Cancel</button>
        </form>
      )}
    </div>
  );

  const renderHistory = () => (
    <div>
      <h2>Historical Time Cards</h2>
      {/* Add historical time card viewing functionality here */}
    </div>
  );

  const renderTimeCardGeneration = () => (
    <div>
      <h2>Time Card Generation</h2>
      {/* Add time card generation functionality here */}
    </div>
  );

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Manager's Dashboard</h1>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveView('timeCards')} 
          style={{
            ...buttonStyle,
            backgroundColor: activeView === 'timeCards' ? '#45a049' : '#4CAF50'
          }}
        >
          Time Cards
        </button>
        <button 
          onClick={() => setActiveView('employeeManagement')} 
          style={{
            ...buttonStyle,
            backgroundColor: activeView === 'employeeManagement' ? '#45a049' : '#4CAF50'
          }}
        >
          Employee Management
        </button>
        <button 
          onClick={() => setActiveView('history')} 
          style={{
            ...buttonStyle,
            backgroundColor: activeView === 'history' ? '#45a049' : '#4CAF50'
          }}
        >
          History
        </button>
        <button 
          onClick={() => setActiveView('timeCardGeneration')} 
          style={{
            ...buttonStyle,
            backgroundColor: activeView === 'timeCardGeneration' ? '#45a049' : '#4CAF50'
          }}
        >
          Time Card Generation
        </button>
      </div>

      <button 
        onClick={handleLogout} 
        style={{ 
          ...buttonStyle,
          position: 'absolute', 
          top: '20px', 
          right: '20px',
          backgroundColor: '#f44336',
        }}
      >
        Logout
      </button>
      
      {error && <p style={{ color: 'red', marginBottom: '20px' }}>{error}</p>}

      {activeView === 'timeCards' && renderTimeCards()}
      {activeView === 'employeeManagement' && renderEmployeeManagement()}
      {activeView === 'history' && renderHistory()}
      {activeView === 'timeCardGeneration' && renderTimeCardGeneration()}
    </div>
  );
};

const buttonStyle = {
  padding: '10px 15px',
  backgroundColor: '#4CAF50',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '16px',
};

const formGroupStyle = {
  marginBottom: '15px',
};

const inputStyle = {
  width: '100%',
  padding: '8px',
  borderRadius: '4px',
  border: '1px solid #ccc',
  fontSize: '16px',
};

export default ManagerPage;