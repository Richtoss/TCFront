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
  user: {
    id: string;
    isManager: boolean;
  };
  iat: number;
  exp: number;
}

interface UserData {
  name: string;
  email: string;
}

const EmployeePage: React.FC = () => {
  const [timecards, setTimecards] = useState<Timecard[]>([]);
  const [newEntry, setNewEntry] = useState<TimecardEntry>({ id: 0, day: '', jobName: '', startTime: '', endTime: '', description: '' });
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [timecardExists, setTimecardExists] = useState<boolean>(false);
  const [checkingTimecard, setCheckingTimecard] = useState<boolean>(false);
  const navigate = useNavigate();

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const startTimeOptions = generateTimeOptions(4, 20); // 4 AM to 8 PM
  const allEndTimeOptions = generateTimeOptions(4, 21); // 4 AM to 9 PM

  useEffect(() => {
    fetchUserData();
    fetchTimecards();
  }, []);

  function generateTimeOptions(start: number, end: number): string[] {
    const options: string[] = [];
    for (let i = start; i <= end; i++) {
      ['00', '15', '30', '45'].forEach(minutes => {
        options.push(`${i.toString().padStart(2, '0')}:${minutes}`);
      });
    }
    return options;
  }

  const fetchUserData = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedToken = jwtDecode(token) as DecodedToken;
        await fetchUserDataFromServer();
      } catch (error) {
        console.error('Error decoding token:', error);
        setError('Failed to get user data. Please try logging in again.');
        navigate('/');
      } finally {
        setLoading(false);
      }
    } else {
      setError('No authentication token found. Please log in again.');
      navigate('/');
    }
  };

  const fetchUserDataFromServer = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get<UserData>('https://tcbackend.onrender.com/api/auth/me', {
        headers: { 'x-auth-token': token }
      });
      setName(response.data.name);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to fetch user data. Please try logging in again.');
      navigate('/');
    }
  };

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const createNewTimecard = async () => {
    setCheckingTimecard(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get<{ exists: boolean }>('https://tcbackend.onrender.com/api/timecard/check-current-week', {
        headers: { 'x-auth-token': token }
      });
      
      if (res.data.exists) {
        setTimecardExists(true);
        setError('A timecard for the current week already exists.');
        return;
      }

      const monday = getCurrentWeekMonday();
      const mondayString = monday.toISOString().split('T')[0];

      const newCardRes = await axios.post<Timecard>('https://tcbackend.onrender.com/api/timecard', {
        weekStartDate: mondayString,
        entries: [],
        totalHours: 0,
        completed: false
      }, {
        headers: { 'x-auth-token': token }
      });

      const newCard = { ...newCardRes.data, expanded: true };
      setTimecards([newCard, ...timecards]);
      setEditingCardId(newCard._id);
      setError('');
      setTimecardExists(false);
    } catch (err) {
      console.error('Error creating new timecard:', err);
      setError('Failed to create new timecard. Please try again.');
    } finally {
      setCheckingTimecard(false);
    }
  };

  const getCurrentWeekMonday = (): Date => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const toggleTimecard = (id: string) => {
    setTimecards(timecards.map(card => 
      card._id === id ? { ...card, expanded: !card.expanded } : card
    ));
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
        const newTotalHours = calculateTotalHours(updatedEntries);
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

  const calculateTotalHours = (entries: TimecardEntry[]): number => {
    return entries.reduce((total, entry) => total + calculateHoursDifference(entry.startTime, entry.endTime), 0);
  };

  const calculateHoursDifference = (startTime: string, endTime: string): number => {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    return (endMinutes - startMinutes) / 60;
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
      const newTotalHours = calculateTotalHours(updatedEntries);
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

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '10px' }}>Employee Dashboard</h1>
      {name && (
        <h2 style={{ 
          textAlign: 'center', 
          marginBottom: '20px',
          fontSize: '1.2em',
          fontWeight: 'normal',
          color: '#4a4a4a'
        }}>
          Welcome, {name}!
        </h2>
      )}
      {timecardExists && (
        <p style={{ color: 'red', textAlign: 'center', marginBottom: '10px' }}>
          A timecard for the current week already exists.
        </p>
      )}
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
        disabled={checkingTimecard}
        style={{ 
          width: '100%', 
          marginBottom: '20px', 
          padding: '10px',
          backgroundColor: checkingTimecard ? '#cccccc' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: checkingTimecard ? 'not-allowed' : 'pointer'
        }}
      >
        {checkingTimecard ? 'Checking...' : 'New Time Card'}
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
            <h2 style={{ margin: 0 }}>{new Date(timecard.weekStartDate).toLocaleDateString()} | Total Hours: {timecard.totalHours.toFixed(2)}</h2>
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
                    <p style={{ margin: 0 }}>{calculateHoursDifference(entry.startTime, entry.endTime).toFixed(2)} hours</p>
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
//test
export default EmployeePage;