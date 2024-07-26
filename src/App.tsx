import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import EmployeePage from './components/EmployeePage';
import ManagerPage from './components/ManagerPage';
import PrivateRoute from './components/PrivateRoute';
import 'react-datepicker/dist/react-datepicker.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/employee"
            element={
              <PrivateRoute>
                <EmployeePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/manager"
            element={
              <PrivateRoute>
                <ManagerPage />
              </PrivateRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;