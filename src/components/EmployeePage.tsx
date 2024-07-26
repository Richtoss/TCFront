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
  expanded?: boolean;
}

const EmployeePage: React.FC = () => {
  const [timecards, setTimecards] = useState<Timecard[]>([]);
  const [newEntry, setNewEntry] = useState<TimecardEntry>({ id: 0, day: '', jobName: '', startTime: '', endTime: '', description: '' });
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const toggleTimecard = (id: string) => {
    setTimecards(timecards.map(card => 
      card._id === id ? { ...card, expanded: !card.expanded } : card
    ));
  };

  const getCurrentWeekMonday = (): Date => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const formatDate = (date: Date): string => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const createNewTimecard = async () => {
    const monday = getCurrentWeekMonday();
    const mondayString = monday.toISOString().split('T')[0];

    // Check if a timecard for the current week already exists
    const existingTimecard = timecards.find(tc => tc.weekStartDate === mondayString);
    if (existingTimecard) {
      setError('A timecard for this week already exists.');
      return;
    }

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

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Employee Dashboard</h1>
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
      
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {timecards.map(card => (
        <div key={card._id} style={{ marginBottom: '20px', border: '1px solid #ccc', borderRadius: '4px', padding: '10px' }}>
          <div 
            onClick={() => toggleTimecard(card._id)} 
            style={{ 
              cursor: 'pointer', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}
          >
            <h2>{formatDate(new Date(card.weekStartDate))}</h2>
            <span>{card.expanded ? '▲' : '▼'}</span>
          </div>
          
          {card.expanded && (
            <div>
              <div>
                {daysOfWeek.map(day => (
                  <div key={day}>
                    <h3>{day}</h3>
                    {card.entries.filter(entry => entry.day === day).map(entry => (
                      <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p>{entry.jobName} ({entry.startTime} - {entry.endTime})</p>
                        <button 
                          onClick={() => deleteEntry(card._id, entry.id)} 
                          style={{ 
                            padding: '5px', 
                            backgroundColor: '#f44336', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px', 
                            cursor: 'pointer' 
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <h3>Add New Entry</h3>
              <select 
                value={newEntry.day} 
                onChange={(e) => setNewEntry({ ...newEntry, day: e.target.value })} 
                style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
              >
                <option value="">Select Day</option>
                {daysOfWeek.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              <input 
                type="text" 
                placeholder="Job Name" 
                value={newEntry.jobName} 
                onChange={(e) => setNewEntry({ ...newEntry, jobName: e.target.value })} 
                style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <select 
                  value={newEntry.startTime} 
                  onChange={(e) => setNewEntry({ ...newEntry, startTime: e.target.value })} 
                  style={{ width: '48%', padding: '10px' }}
                >
                  <option value="">Start Time</option>
                  {startTimeOptions.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
                <select 
                  value={newEntry.endTime} 
                  onChange={(e) => setNewEntry({ ...newEntry, endTime: e.target.value })} 
                  style={{ width: '48%', padding: '10px' }}
                >
                  <option value="">End Time</option>
                  {allEndTimeOptions.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              <input 
                type="text" 
                placeholder="Description" 
                value={newEntry.description} 
                onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })} 
                style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
              />
              <button 
                onClick={() => addEntry(card._id)} 
                style={{ 
                  width: '100%', 
                  padding: '10px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Add Entry
              </button>
              <button 
                onClick={() => deleteTimecard(card._id)} 
                style={{ 
                  width: '100%', 
                  marginTop: '10px', 
                  padding: '10px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Delete Timecard
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default EmployeePage;
