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

interface Employee {
  firstName: string;
}

const EmployeePage: React.FC = () => {
  const [timecards, setTimecards] = useState<Timecard[]>([]);
  const [newEntry, setNewEntry] = useState<TimecardEntry>({ id: 0, day: '', jobName: '', startTime: '', endTime: '', description: '' });
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [employee, setEmployee] = useState<Employee | null>(null);
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
    fetchEmployeeData();
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

  const fetchEmployeeData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get<Employee>('https://tcbackend.onrender.com/api/employee', {
        headers: { 'x-auth-token': token }
      });
      setEmployee(res.data);
    } catch (err) {
      console.error('Error fetching employee data:', err);
      setError('Failed to fetch employee data. Please try again later.');
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

    const existingTimecard = timecards.find(card => card.weekStartDate === mondayString);
    if (existingTimecard) {
      setError('A timecard for the current week already exists.');
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
    <div className="container mt-4">
      <h1 className="text-center">Employee Page</h1>
      {employee && <h2>Welcome, {employee.firstName}!</h2>}
      <button className="btn btn-primary" onClick={createNewTimecard}>Create New Timecard</button>
      <button className="btn btn-secondary ml-2" onClick={handleLogout}>Logout</button>
      {error && <div className="alert alert-danger mt-3">{error}</div>}
      {timecards.length > 0 ? (
        <div className="mt-4">
          {timecards.map(card => (
            <div key={card._id} className="card mb-3">
              <div className="card-header">
                <h5 className="mb-0">
                  {`Week of ${formatDate(card.weekStartDate)}`}
                  <button className="btn btn-link" onClick={() => toggleTimecard(card._id)}>
                    {card.expanded ? 'Collapse' : 'Expand'}
                  </button>
                </h5>
              </div>
              {card.expanded && (
                <div className="card-body">
                  {card.entries.map(entry => (
                    <div key={entry.id} className="mb-3">
                      <div><strong>Day:</strong> {entry.day}</div>
                      <div><strong>Job Name:</strong> {entry.jobName}</div>
                      <div><strong>Start Time:</strong> {entry.startTime}</div>
                      <div><strong>End Time:</strong> {entry.endTime}</div>
                      <div><strong>Description:</strong> {entry.description}</div>
                      <button className="btn btn-danger mt-2" onClick={() => deleteEntry(card._id, entry.id)}>Delete Entry</button>
                    </div>
                  ))}
                  <h5 className="mt-4">Add New Entry</h5>
                  <div className="form-group">
                    <label>Day:</label>
                    <select className="form-control" value={newEntry.day} onChange={e => setNewEntry({ ...newEntry, day: e.target.value })}>
                      <option value="">Select Day</option>
                      {daysOfWeek.map(day => <option key={day} value={day}>{day}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Job Name:</label>
                    <input className="form-control" type="text" value={newEntry.jobName} onChange={e => setNewEntry({ ...newEntry, jobName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Start Time:</label>
                    <select className="form-control" value={newEntry.startTime} onChange={e => setNewEntry({ ...newEntry, startTime: e.target.value })}>
                      <option value="">Select Start Time</option>
                      {startTimeOptions.map(time => <option key={time} value={time}>{time}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>End Time:</label>
                    <select className="form-control" value={newEntry.endTime} onChange={e => setNewEntry({ ...newEntry, endTime: e.target.value })}>
                      <option value="">Select End Time</option>
                      {allEndTimeOptions.map(time => <option key={time} value={time}>{time}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Description:</label>
                    <textarea className="form-control" value={newEntry.description} onChange={e => setNewEntry({ ...newEntry, description: e.target.value })}></textarea>
                  </div>
                  <button className="btn btn-success mt-3" onClick={() => addEntry(card._id)}>Add Entry</button>
                  <button className="btn btn-warning mt-3 ml-2" onClick={() => markTimecardComplete(card._id)} disabled={card.completed}>Mark as Complete</button>
                  <button className="btn btn-danger mt-3 ml-2" onClick={() => deleteTimecard(card._id)}>Delete Timecard</button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3">No timecards available. Create a new timecard to get started.</p>
      )}
    </div>
  );
};

export default EmployeePage;
