import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, ChevronUp, LogOut, User, Clock, Calendar, AlertCircle, Trash2 } from 'lucide-react';

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
  const [historicalEmployees, setHistoricalEmployees] = useState<Employee[]>([]);
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [newEntry, setNewEntry] = useState<TimecardEntry>({
    id: 0,
    day: '',
    jobName: '',
    startTime: '',
    endTime: '',
    description: ''
  });
  const [editingTimecardId, setEditingTimecardId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEmployeeData();
    fetchHistoricalEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get<Employee[]>('https://tcbackend.onrender.com/api/timecard/all', {
        headers: { 'x-auth-token': token }
      });
      setEmployees(res.data.map(employee => ({
        ...employee,
        timecards: employee.timecards.slice(-3)
      })));
    } catch (err) {
      console.error('Error fetching employee data:', err);
      setError('Failed to fetch employee data. Please try again later.');
    }
  };

  const fetchHistoricalEmployeeData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get<Employee[]>('https://tcbackend.onrender.com/api/timecard/all', {
        headers: { 'x-auth-token': token }
      });
      setHistoricalEmployees(res.data);
    } catch (err) {
      console.error('Error fetching historical employee data:', err);
      setError('Failed to fetch historical employee data. Please try again later.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
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

  const calculateHoursDifference = (startTime: string, endTime: string): number => {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    return (endMinutes - startMinutes) / 60;
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
      fetchEmployeeData();
      setError('');
    } catch (err) {
      console.error('Error creating new employee:', err);
      setError('Failed to create new employee. Please try again.');
    }
  };

  const handleNewEntryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewEntry(prev => ({ ...prev, [name]: value }));
  };

  const addEntry = async (employeeId: string, timecardId: string) => {
    if (newEntry.day && newEntry.jobName && newEntry.startTime && newEntry.endTime) {
      try {
        const token = localStorage.getItem('token');
        const timecard = employees
          .find(emp => emp._id === employeeId)?.timecards
          .find(tc => tc._id === timecardId);

        if (!timecard) {
          setError('Timecard not found');
          return;
        }

        const newEntryWithId = { ...newEntry, id: Date.now() };
        const updatedEntries = [...timecard.entries, newEntryWithId];
        const newTotalHours = updatedEntries.reduce((total, entry) => 
          total + calculateHoursDifference(entry.startTime, entry.endTime), 0
        );

        const res = await axios.put<Timecard>(
          `https://tcbackend.onrender.com/api/timecard/${timecardId}`,
          { entries: updatedEntries, totalHours: newTotalHours },
          { headers: { 'x-auth-token': token } }
        );

        setEmployees(employees.map(emp => 
          emp._id === employeeId 
            ? { ...emp, timecards: emp.timecards.map(tc => tc._id === timecardId ? res.data : tc) }
            : emp
        ));

        setNewEntry({ id: 0, day: '', jobName: '', startTime: '', endTime: '', description: '' });
        setEditingTimecardId(null);
        setError('');
      } catch (err) {
        console.error('Error adding entry:', err);
        setError('Failed to add entry. Please try again.');
      }
    } else {
      setError('Please fill in all required fields.');
    }
  };

  const deleteEntry = async (employeeId: string, timecardId: string, entryId: number) => {
    try {
      const token = localStorage.getItem('token');
      const timecard = employees
        .find(emp => emp._id === employeeId)?.timecards
        .find(tc => tc._id === timecardId);

      if (!timecard) {
        setError('Timecard not found');
        return;
      }

      const updatedEntries = timecard.entries.filter(entry => entry.id !== entryId);
      const newTotalHours = updatedEntries.reduce((total, entry) => 
        total + calculateHoursDifference(entry.startTime, entry.endTime), 0
      );

      const res = await axios.put<Timecard>(
        `https://tcbackend.onrender.com/api/timecard/${timecardId}`,
        { entries: updatedEntries, totalHours: newTotalHours },
        { headers: { 'x-auth-token': token } }
      );

      setEmployees(employees.map(emp => 
        emp._id === employeeId 
          ? { ...emp, timecards: emp.timecards.map(tc => tc._id === timecardId ? res.data : tc) }
          : emp
      ));
    } catch (err) {
      console.error('Error deleting entry:', err);
      setError('Failed to delete entry. Please try again.');
    }
  };

  const markTimecardComplete = async (employeeId: string, timecardId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put<Timecard>(
        `https://tcbackend.onrender.com/api/timecard/${timecardId}/complete`,
        {},
        { headers: { 'x-auth-token': token } }
      );

      setEmployees(employees.map(emp => 
        emp._id === employeeId 
          ? { ...emp, timecards: emp.timecards.map(tc => tc._id === timecardId ? res.data : tc) }
          : emp
      ));
      setError('');
    } catch (err) {
      console.error('Error marking timecard as complete:', err);
      setError('Failed to mark timecard as complete. Please try again.');
    }
  };

  const renderMenu = () => (
    <div className={`fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 ${menuOpen ? '' : 'hidden'}`} onClick={() => setMenuOpen(false)}>
      <div className="relative left-0 top-0 w-64 h-full bg-gray-800 text-white p-4" onClick={e => e.stopPropagation()}>
        <button onClick={() => setMenuOpen(false)} className="absolute top-4 right-4 text-white hover:text-gray-300">
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold mb-8 mt-8">Dashboard</h2>
        <nav>
          <ul className="space-y-4">
            <li>
              <button onClick={() => { setActiveView('timeCards'); setMenuOpen(false); }} className="w-full text-left py-2 px-4 rounded hover:bg-gray-700 transition duration-200 flex items-center">
                <Clock className="mr-2" size={18} />
                Time Cards
              </button>
            </li>
            <li>
              <button onClick={() => { setActiveView('employeeManagement'); setMenuOpen(false); }} className="w-full text-left py-2 px-4 rounded hover:bg-gray-700 transition duration-200 flex items-center">
                <User className="mr-2" size={18} />
                Employee Management
              </button>
            </li>
            <li>
              <button onClick={() => { setActiveView('history'); setMenuOpen(false); }} className="w-full text-left py-2 px-4 rounded hover:bg-gray-700 transition duration-200 flex items-center">
                <Calendar className="mr-2" size={18} />
                History
              </button>
            </li>
            <li>
              <button onClick={() => { setActiveView('timeCardGeneration'); setMenuOpen(false); }} className="w-full text-left py-2 px-4 rounded hover:bg-gray-700 transition duration-200 flex items-center">
                <AlertCircle className="mr-2" size={18} />
                Time Card Generation
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );

  const renderTimeCards = (employeeData: Employee[], title: string) => (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-white">{title}</h2>
      {employeeData.map(employee => (
        <div key={employee._id} className="bg-gray-800 shadow-md rounded-lg mb-6 overflow-hidden">
          <div 
            onClick={() => toggleEmployee(employee._id)} 
            className="bg-gray-700 px-6 py-4 cursor-pointer flex justify-between items-center"
          >
            <h3 className="text-lg font-semibold text-white">{employee.name}</h3>
            <div className="flex items-center">
              <span className="text-sm text-gray-300 mr-4">{employee.email}</span>
              {expandedEmployee === employee._id ? <ChevronUp size={24} className="text-gray-300" /> : <ChevronDown size={24} className="text-gray-300" />}
            </div>
          </div>
          {expandedEmployee === employee._id && (
            <div className="px-6 py-4">
              {employee.timecards.map(timecard => (
                <div key={timecard._id} className="border-b border-gray-600 pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
                  <div 
                    onClick={() => toggleTimecard(timecard._id)}
                    className="flex justify-between items-center cursor-pointer"
                  >
                    <h4 className="font-medium text-white">Week of {formatDate(timecard.weekStartDate)}</h4>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-300 mr-4">Total Hours: {timecard.totalHours.toFixed(2)}</span>
                      {expandedTimecards[timecard._id] ? <ChevronUp size={20} className="text-gray-300" /> : <ChevronDown size={20} className="text-gray-300" />}
                    </div>
                  </div>
                  {expandedTimecards[timecard._id] && (
                    <div className="mt-4 pl-4">
                      <p className="text-sm text-gray-300 mb-2">Status: {timecard.completed ? 'Completed' : 'In Progress'}</p>
                      {timecard.entries.map(entry => (
                        <div key={entry.id} className="bg-gray-700 rounded p-3 mb-2 flex justify-between items-center">
                          <div>
                            <p className="font-medium text-white">{entry.day} - {entry.jobName}</p>
                            <p className="text-sm text-gray-300">{entry.startTime} to {entry.endTime} - {entry.description}</p>
                          </div>
                          <div className="flex items-center">
                            <span className="text-sm text-gray-300 mr-4">
                              {calculateHoursDifference(entry.startTime, entry.endTime).toFixed(2)} hours
                            </span>
                            {!timecard.completed && (
                              <button 
                                onClick={() => deleteEntry(employee._id, timecard._id, entry.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {!timecard.completed && (
                        <div className="mt-4">
                          <h5 className="text-white font-medium mb-2">Add New Entry</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <select
                              name="day"
                              value={newEntry.day}
                              onChange={handleNewEntryChange}
                              className="bg-gray-700 text-white rounded p-2"
                            >
                              <option value="">Select Day</option>
                              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                <option key={day} value={day}>{day}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              name="jobName"
                              value={newEntry.jobName}
                              onChange={handleNewEntryChange}
                              placeholder="Job Name"
                              className="bg-gray-700 text-white rounded p-2"
                            />
                            <input
                              type="time"
                              name="startTime"
                              value={newEntry.startTime}
                              onChange={handleNewEntryChange}
                              className="bg-gray-700 text-white rounded p-2"
                            />
                            <input
                              type="time"
                              name="endTime"
                              value={newEntry.endTime}
                              onChange={handleNewEntryChange}
                              className="bg-gray-700 text-white rounded p-2"
                            />
                            <input
                              type="text"
                              name="description"
                              value={newEntry.description}
                              onChange={handleNewEntryChange}
                              placeholder="Description"
                              className="bg-gray-700 text-white rounded p-2 col-span-2"
                            />
                          </div>
                          <button
                            onClick={() => addEntry(employee._id, timecard._id)}
                            className="mt-2 bg-blue-600 text-white rounded p-2 hover:bg-blue-700 transition duration-200"
                          >
                            Add Entry
                          </button>
                        </div>
                      )}
                      {!timecard.completed && (
                        <button
                          onClick={() => markTimecardComplete(employee._id, timecard._id)}
                          className="mt-4 bg-green-600 text-white rounded p-2 hover:bg-green-700 transition duration-200"
                        >
                          Mark Complete
                        </button>
                      )}
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

  const renderEmployeeManagement = () => (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-white">Employee Management</h2>
      <button 
        onClick={() => setShowNewEmployeeForm(true)} 
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
      >
        Create New Employee
      </button>
      
      {showNewEmployeeForm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-white mb-4">New Employee Information</h3>
              <form onSubmit={handleNewEmployeeSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={newEmployee.name}
                    onChange={handleNewEmployeeChange}
                    required
                    className="mt-1 block w-full border border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={newEmployee.email}
                    onChange={handleNewEmployeeChange}
                    required
                    className="mt-1 block w-full border border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={newEmployee.password}
                    onChange={handleNewEmployeeChange}
                    required
                    className="mt-1 block w-full border border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-300">Phone</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={newEmployee.phone}
                    onChange={handleNewEmployeeChange}
                    className="mt-1 block w-full border border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isManager"
                    name="isManager"
                    checked={newEmployee.isManager}
                    onChange={handleNewEmployeeChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isManager" className="ml-2 block text-sm text-gray-300">
                    Is Manager
                  </label>
                </div>
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-300">Notes</label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={newEmployee.notes}
                    onChange={handleNewEmployeeChange}
                    rows={3}
                    className="mt-1 block w-full border border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200">Submit</button>
                  <button type="button" onClick={() => setShowNewEmployeeForm(false)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition duration-200">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTimeCardGeneration = () => (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-white">Time Card Generation</h2>
      <p className="text-gray-300">This feature is not yet implemented.</p>
    </div>
  );

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <header className="bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <button onClick={() => setMenuOpen(true)} className="text-gray-300 hover:text-white">
            <Menu size={24} />
          </button>
          <h1 className="text-2xl font-bold text-white">Manager's Dashboard</h1>
          <button 
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-200 flex items-center"
          >
            <LogOut size={18} className="mr-2" />
            Logout
          </button>
        </div>
      </header>

      {renderMenu()}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-900 border-l-4 border-red-500 text-red-100 p-4 mb-6" role="alert">
            <p>{error}</p>
          </div>
        )}

        {activeView === 'timeCards' && renderTimeCards(employees, "Recent Time Cards")}
        {activeView === 'employeeManagement' && renderEmployeeManagement()}
        {activeView === 'history' && renderTimeCards(historicalEmployees, "Historical Time Cards")}
        {activeView === 'timeCardGeneration' && renderTimeCardGeneration()}
      </main>
    </div>
  );
};

export default ManagerPage;