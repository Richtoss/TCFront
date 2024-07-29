import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, ChevronUp, User, Clock, Calendar, AlertCircle } from 'lucide-react';

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
      <button onClick={() => setMenuOpen(false)} className="absolute top-4 right-4 text-white hover:text-gray-300">
        <X size={24} />
      </button>
      <h2 className="text-2xl font-bold mb-8 mt-8">Dashboard</h2>
      <nav>
        <ul className="space-y-4">
          <li>
            <button onClick={() => { setActiveView('timeCards'); setMenuOpen(false); }} className="w-full text-left py-2 px-4 rounded hover:bg-gray-700 transition duration-200">
              <Clock className="inline-block mr-2" size={18} />
              Time Cards
            </button>
          </li>
          <li>
            <button onClick={() => { setActiveView('employeeManagement'); setMenuOpen(false); }} className="w-full text-left py-2 px-4 rounded hover:bg-gray-700 transition duration-200">
              <User className="inline-block mr-2" size={18} />
              Employee Management
            </button>
          </li>
          <li>
            <button onClick={() => { setActiveView('history'); setMenuOpen(false); }} className="w-full text-left py-2 px-4 rounded hover:bg-gray-700 transition duration-200">
              <Calendar className="inline-block mr-2" size={18} />
              History
            </button>
          </li>
          <li>
            <button onClick={() => { setActiveView('timeCardGeneration'); setMenuOpen(false); }} className="w-full text-left py-2 px-4 rounded hover:bg-gray-700 transition duration-200">
              <AlertCircle className="inline-block mr-2" size={18} />
              Time Card Generation
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );

  const renderTimeCards = (employeeData: Employee[], title: string) => (
    <div>
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      {employeeData.map(employee => (
        <div key={employee._id} className="bg-white shadow-md rounded-lg mb-6 overflow-hidden">
          <div 
            onClick={() => toggleEmployee(employee._id)} 
            className="bg-gray-100 px-6 py-4 cursor-pointer flex justify-between items-center"
          >
            <h3 className="text-lg font-semibold">{employee.name}</h3>
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-4">{employee.email}</span>
              {expandedEmployee === employee._id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </div>
          </div>
          {expandedEmployee === employee._id && (
            <div className="px-6 py-4">
              {employee.timecards.map(timecard => (
                <div key={timecard._id} className="border-b border-gray-200 pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
                  <div 
                    onClick={() => toggleTimecard(timecard._id)}
                    className="flex justify-between items-center cursor-pointer"
                  >
                    <h4 className="font-medium">Week of {formatDate(timecard.weekStartDate)}</h4>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 mr-4">Total Hours: {timecard.totalHours.toFixed(2)}</span>
                      {expandedTimecards[timecard._id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                  {expandedTimecards[timecard._id] && (
                    <div className="mt-4 pl-4">
                      <p className="text-sm text-gray-600 mb-2">Status: {timecard.completed ? 'Completed' : 'In Progress'}</p>
                      {timecard.entries.map(entry => (
                        <div key={entry.id} className="bg-gray-50 rounded p-3 mb-2">
                          <p className="font-medium">{entry.day} - {entry.jobName}</p>
                          <p className="text-sm text-gray-600">{entry.startTime} to {entry.endTime} - {entry.description}</p>
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
      <h2 className="text-2xl font-bold mb-6">Employee Management</h2>
      <button 
        onClick={() => setShowNewEmployeeForm(true)} 
        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-200"
      >
        Create New Employee
      </button>
      
      {showNewEmployeeForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" id="my-modal">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">New Employee Information</h3>
              <form onSubmit={handleNewEmployeeSubmit} className="mt-2 text-left">
                {/* Form fields go here */}
                <div className="flex justify-end mt-6">
                  <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mr-2 transition duration-200">Submit</button>
                  <button type="button" onClick={() => setShowNewEmployeeForm(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded transition duration-200">Cancel</button>
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
      <h2 className="text-2xl font-bold mb-6">Time Card Generation</h2>
      <p className="text-gray-600">This feature is not yet implemented.</p>
    </div>
  );

  return (
    <div className="bg-gray-100 min-h-screen">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <button onClick={() => setMenuOpen(true)} className="text-gray-500 hover:text-gray-700">
            <Menu size={24} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Manager's Dashboard</h1>
          <button 
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition duration-200"
          >
            Logout
          </button>
        </div>
      </header>

      {renderMenu()}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
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