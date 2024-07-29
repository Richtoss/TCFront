import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, ChevronUp } from 'lucide-react';

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

  const renderMenu = () => (
    <div className={`fixed top-0 left-0 h-full w-64 bg-gray-800 text-white p-4 transform ${menuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out z-50`}>
      <button onClick={() => setMenuOpen(false)} className="absolute top-4 right-4">
        <X size={24} />
      </button>
      <h2 className="text-xl font-bold mb-6">Menu</h2>
      <div className="flex flex-col space-y-4">
        <button onClick={() => { setActiveView('timeCards'); setMenuOpen(false); }} className="text-left">Time Cards</button>
        <button onClick={() => { setActiveView('employeeManagement'); setMenuOpen(false); }} className="text-left">Employee Management</button>
        <button onClick={() => { setActiveView('history'); setMenuOpen(false); }} className="text-left">History</button>
        <button onClick={() => { setActiveView('timeCardGeneration'); setMenuOpen(false); }} className="text-left">Time Card Generation</button>
        <button onClick={handleLogout} className="text-left text-red-400">Logout</button>
      </div>
    </div>
  );

  const renderTimeCards = (employeeData: Employee[], title: string) => (
    <div>
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {employeeData.map(employee => (
        <div key={employee._id} className="bg-gray-700 rounded-lg p-4 mb-4">
          <div 
            onClick={() => toggleEmployee(employee._id)} 
            className="cursor-pointer flex justify-between items-center"
          >
            <h3 className="text-lg font-semibold">{employee.name} - {employee.email}</h3>
            {expandedEmployee === employee._id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </div>
          {expandedEmployee === employee._id && (
            <div className="mt-4">
              {employee.timecards.map(timecard => (
                <div key={timecard._id} className="bg-gray-600 rounded p-3 mb-3">
                  <div 
                    onClick={() => toggleTimecard(timecard._id)}
                    className="cursor-pointer flex justify-between items-center"
                  >
                    <h4 className="font-medium">Week of {formatDate(timecard.weekStartDate)} - Total Hours: {timecard.totalHours.toFixed(2)}</h4>
                    {expandedTimecards[timecard._id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                  {expandedTimecards[timecard._id] && (
                    <div className="mt-2">
                      <p>Status: {timecard.completed ? 'Completed' : 'In Progress'}</p>
                      {timecard.entries.map(entry => (
                        <div key={entry.id} className="border-l-2 border-gray-500 pl-3 mt-2">
                          <p className="font-medium">{entry.day} - {entry.jobName}</p>
                          <p className="text-sm text-gray-300">{entry.startTime} to {entry.endTime} - {entry.description}</p>
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

  const renderEmployeeManagement = () => (
    <div>
      <h2 className="text-xl font-bold mb-4">Employee Management</h2>
      <button 
        onClick={() => setShowNewEmployeeForm(true)} 
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Create New Employee
      </button>
      
      {showNewEmployeeForm && (
        <form onSubmit={handleNewEmployeeSubmit} className="bg-gray-700 p-4 rounded">
          <h3 className="text-lg font-semibold mb-4">New Employee Information</h3>
          <div className="mb-4">
            <label htmlFor="name" className="block mb-1">Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={newEmployee.name}
              onChange={handleNewEmployeeChange}
              required
              className="w-full px-3 py-2 bg-gray-600 rounded"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block mb-1">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={newEmployee.email}
              onChange={handleNewEmployeeChange}
              required
              className="w-full px-3 py-2 bg-gray-600 rounded"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block mb-1">Password:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={newEmployee.password}
              onChange={handleNewEmployeeChange}
              required
              className="w-full px-3 py-2 bg-gray-600 rounded"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="phone" className="block mb-1">Phone:</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={newEmployee.phone}
              onChange={handleNewEmployeeChange}
              className="w-full px-3 py-2 bg-gray-600 rounded"
            />
          </div>
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                id="isManager"
                name="isManager"
                checked={newEmployee.isManager}
                onChange={handleNewEmployeeChange}
                className="mr-2"
              />
              Is Manager
            </label>
          </div>
          <div className="mb-4">
            <label htmlFor="notes" className="block mb-1">Notes:</label>
            <textarea
              id="notes"
              name="notes"
              value={newEmployee.notes}
              onChange={handleNewEmployeeChange}
              className="w-full px-3 py-2 bg-gray-600 rounded"
            />
          </div>
          <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded mr-2">Submit</button>
          <button type="button" onClick={() => setShowNewEmployeeForm(false)} className="bg-red-500 text-white px-4 py-2 rounded">Cancel</button>
        </form>
      )}
    </div>
  );

  const renderTimeCardGeneration = () => (
    <div>
      <h2 className="text-xl font-bold mb-4">Time Card Generation</h2>
      <p>This feature is not yet implemented.</p>
    </div>
  );

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <header className="bg-gray-800 p-4 flex justify-between items-center">
        <button onClick={() => setMenuOpen(true)} className="text-white">
          <Menu size={24} />
        </button>
        <h1 className="text-xl font-bold">Manager's Dashboard</h1>
      </header>

      {renderMenu()}

      <main className="p-4">
        {error && <p className="text-red-400 mb-4">{error}</p>}

        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          {activeView === 'timeCards' && renderTimeCards(employees, "Recent Time Cards")}
          {activeView === 'employeeManagement' && renderEmployeeManagement()}
          {activeView === 'history' && renderTimeCards(historicalEmployees, "Historical Time Cards")}
          {activeView === 'timeCardGeneration' && renderTimeCardGeneration()}
        </div>
      </main>
    </div>
  );
};

export default ManagerPage;