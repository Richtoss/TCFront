import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

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
  expanded?: boolean;
}

interface DecodedToken {
  firstName: string;
  // Add other properties from your token as needed
}

const EmployeePage: React.FC = () => {
  const [timecards, setTimecards] = useState<Timecard[]>([]);
  const [newEntry, setNewEntry] = useState<TimecardEntry>({ id: 0, day: '', jobName: '', startTime: '', endTime: '', description: '' });
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const navigate = useNavigate();

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const generateTimeOptions = (start: number, end: number): string[] => {
    const options: string[] = [];
    for (let i = start; i <= end; i++) {
      ['00', '15', '30', '45'].forEach(minutes => {
        options.push(`${i.toString().padStart(2, '0')}:${minutes}`);
      });
    }
    return options;
  };

  const startTimeOptions = generateTimeOptions(4, 20); // 4 AM to 8 PM
  const allEndTimeOptions = generateTimeOptions(4, 21); // 4 AM to 9 PM

  useEffect(() => {
    fetchTimecards();
    fetchUserData();
  }, []);

  const fetchTimecards = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get<Timecard[]>('https://tcbackend.onrender.com/api/timecard', {
        headers: { 'x-auth-token': token }
      });
      setTimecards(res.data.map(card => ({ ...card, expanded: false })));
    } catch (err) {
      console.error('Error fetching timecards:', err);
      setError('Failed to fetch timecards. Please try again later.');
    }
  };

  const fetchUserData = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedToken = jwtDecode(token) as DecodedToken;
        setFirstName(decodedToken.firstName);
      } catch (error) {
        console.error('Error decoding token:', error);
        setError('Failed to get user data. Please try logging in again.');
      }
    } else {
      setError('No authentication token found. Please log in again.');
      navigate('/');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const toggleTimecard = (id: string) => {
    setTimecards(timecards.map(card => 
      card._id === id ? { ...card, expanded: !card.expanded } : card
    ));
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const getCurrentWeekMonday = (): Date => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const createNewTimecard = async () => {
    const monday = getCurrentWeekMonday();
    const mondayString = monday.toISOString().split('T')[0];

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post<Timecard>('https://tcbackend.onrender.com/api/timecard', {
        weekStartDate: mondayString,
        entries: [],
        totalHours: 0,
        completed: false
      }, {
        headers: { 'x-auth-token': token }
      });

      const newCard = { ...res.data, expanded: true };
      setTimecards([newCard, ...timecards]);
      setEditingCardId(newCard._id);
      setError('');
    } catch (err) {
      console.error('Error creating new timecard:', err);
      setError('Failed to create new timecard. Please try again.');
    }
  };

  const calculateHours = (startTime: string, endTime: string): number => {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const diff = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    return diff / 60;
  };

  const addEntry = async (cardId: string) => {
    if (newEntry.day && newEntry.jobName && newEntry.startTime && newEntry.endTime) {
      try {
        const token = localStorage.getItem('token');
        const timecard = timecards.find(tc => tc._id === cardId);
        if (!timecard) {
          setError('Timecard not found');
          return;
        }
        const newEntryWithId = { ...newEntry, id: Date.now() };
        const updatedEntries = [...timecard.entries, newEntryWithId];
        const newTotalHours = updatedEntries.reduce((total, entry) => 
          total + calculateHours(entry.startTime, entry.endTime), 0
        );
        const res = await axios.put<Timecard>(`https://tcbackend.onrender.com/api/timecard/${cardId}`, {
          entries: updatedEntries,
          totalHours: newTotalHours
        }, {
          headers: { 'x-auth-token': token }
        });
        setTimecards(timecards.map(card => card._id === cardId ? { ...res.data, expanded: true } : card));
        setNewEntry({ id: 0, day: '', jobName: '', startTime: '', endTime: '', description: '' });
        setError('');
      } catch (err) {
        console.error('Error adding entry:', err);
        setError('Failed to add entry. Please try again.');
      }
    } else {
      setError('Please fill in all required fields.');
    }
  };

  const deleteEntry = async (cardId: string, entryId: number) => {
    try {
      const token = localStorage.getItem('token');
      const timecard = timecards.find(tc => tc._id === cardId);
      if (!timecard) {
        setError('Timecard not found');
        return;
      }
      const updatedEntries = timecard.entries.filter(entry => entry.id !== entryId);
      const newTotalHours = updatedEntries.reduce((total, entry) => 
        total + calculateHours(entry.startTime, entry.endTime), 0
      );
      const res = await axios.put<Timecard>(`https://tcbackend.onrender.com/api/timecard/${cardId}`, {
        entries: updatedEntries,
        totalHours: newTotalHours
      }, {
        headers: { 'x-auth-token': token }
      });
      setTimecards(timecards.map(card => card._id === cardId ? { ...res.data, expanded: true } : card));
    } catch (err) {
      console.error('Error deleting entry:', err);
      setError('Failed to delete entry. Please try again.');
    }
  };

  const deleteTimecard = async (cardId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`https://tcbackend.onrender.com/api/timecard/${cardId}`, {
        headers: { 'x-auth-token': token }
      });
      setTimecards(timecards.filter(card => card._id !== cardId));
      setError('');
    } catch (err) {
      console.error('Error deleting timecard:', err);
      setError('Failed to delete timecard. Please try again.');
    }
  };

  const markTimecardComplete = async (cardId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put<Timecard>(`https://tcbackend.onrender.com/api/timecard/${cardId}/complete`, {}, {
        headers: { 'x-auth-token': token }
      });
      setTimecards(timecards.map(card => card._id === cardId ? { ...res.data, expanded: true } : card));
    } catch (err) {
      console.error('Error marking timecard as complete:', err);
      setError('Failed to mark timecard as complete. Please try again.');
    }
  };

 return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Employee Dashboard</h1>
      {firstName && <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Welcome, {firstName}!</h2>}
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
      <button 
        onClick={createNewTimecard} 
        style={{ 
          width: '100%', 
          marginBottom: '20px', 
          padding: '10px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        New Time Card
      </button>
      
      {error && (
        <div style={{
          backgroundColor: '#ffcccc',
          color: '#cc0000',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      {timecards.map(timecard => (
        <div key={timecard._id} style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '4px' }}>
          <div 
            onClick={() => toggleTimecard(timecard._id)} 
            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <h2 style={{ margin: 0 }}>{formatDate(timecard.weekStartDate)} | Total Hours: {timecard.totalHours.toFixed(2)}</h2>
            <span>{timecard.expanded ? '▲' : '▼'}</span>
          </div>
          {timecard.expanded && (
            <div style={{ marginTop: '10px' }}>
              {timecard.entries.map((entry) => (
                <div key={entry.id} style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: '0 0 5px 0' }}><strong>{entry.day} - {entry.jobName}</strong></p>
                    <p style={{ margin: 0, fontSize: '0.9em', color: '#666' }}>{entry.description}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0 }}>{calculateHours(entry.startTime, entry.endTime).toFixed(2)} hours</p>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', color: '#666' }}>{entry.startTime} - {entry.endTime}</p>
                    {!timecard.completed && (
                      <button 
                        onClick={() => deleteEntry(timecard._id, entry.id)} 
                        style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', marginTop: '5px' }}
                      >
                        Delete Entry
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {!timecard.completed && editingCardId === timecard._id && (
                <div style={{ marginTop: '20px' }}>
                  <h4>Add New Entry</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <select 
                      value={newEntry.day} 
                      onChange={(e) => setNewEntry({...newEntry, day: e.target.value})}
                      style={{ padding: '5px' }}
                    >
                      <option value="">Select day</option>
                      {daysOfWeek.map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Job Name"
                      value={newEntry.jobName}
                      onChange={(e) => setNewEntry({...newEntry, jobName: e.target.value})}
                      style={{ padding: '5px' }}
                    />
                    <select
                      value={newEntry.startTime}
                      onChange={(e) => setNewEntry({...newEntry, startTime: e.target.value, endTime: ''})}
                      style={{ padding: '5px' }}
                    >
                      <option value="">Select start time</option>
                      {startTimeOptions.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                    <select
                      value={newEntry.endTime}
                      onChange={(e) => setNewEntry({...newEntry, endTime: e.target.value})}
                      style={{ padding: '5px' }}
                    >
                      <option value="">Select end time</option>
                      {allEndTimeOptions.slice(allEndTimeOptions.indexOf(newEntry.startTime) + 1).map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Description"
                      value={newEntry.description}
                      onChange={(e) => setNewEntry({...newEntry, description: e.target.value})}
                      style={{ padding: '5px' }}
                    />
                    <button 
                      onClick={() => addEntry(timecard._id)}
                      style={{ 
                        padding: '10px', 
                        backgroundColor: '#4CAF50', 
                        color: 'white', 
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Add Entry
                    </button>
                  </div>
                </div>
              )}
              
              {!timecard.completed && (
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <button 
                    onClick={() => editingCardId === timecard._id ? setEditingCardId(null) : setEditingCardId(timecard._id)}
                    style={{ 
                      padding: '10px', 
                      backgroundColor: '#2196F3', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: 'pointer' 
                    }}
                  >
                    {editingCardId === timecard._id ? 'Cancel Edit' : 'Edit Time Card'}
                  </button>
                  <button 
                    onClick={() => deleteTimecard(timecard._id)}
                    style={{ 
                      padding: '10px', 
                      backgroundColor: '#f44336', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: 'pointer' 
                    }}
                  >
                    Delete Time Card
                  </button>
                  <button 
                    onClick={() => markTimecardComplete(timecard._id)}
                    style={{ 
                      padding: '10px', 
                      backgroundColor: '#FFA500', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: 'pointer' 
                    }}
                  >
                    Mark Complete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default EmployeePage;