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
    // ... (keep the existing renderMenu function)
  );

  const renderTimeCards = (employeeData: Employee[], title: string) => (
    // ... (keep the existing renderTimeCards function)
  );

  const renderEmployeeManagement = () => (
    // ... (keep the existing renderEmployeeManagement function)
  );

  const renderTimeCardGeneration = () => (
    // ... (keep the existing renderTimeCardGeneration function)
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