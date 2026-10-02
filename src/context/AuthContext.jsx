import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [doctors, setDoctors] = useState([]);
  const [currentDoctor, setCurrentDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch doctors list
  const fetchDoctors = async () => {
    try {
      const res = await fetch('/api/doctors');
      if (res.ok) {
        const data = await res.json();
        setDoctors(data);

        // Retrieve saved doctor or default to Dr. Chartchai (FT Doctor)
        const savedId = localStorage.getItem('bsi_active_doctor_id');
        let selected = null;
        if (savedId) {
          selected = data.find(d => d.id === savedId);
        }
        if (!selected) {
          // Default to Dr. Chartchai (Doctor FT)
          selected = data.find(d => d.employee_id === 'DOC-002') || data[0];
        }
        setCurrentDoctor(selected);
      }
    } catch (err) {
      console.error('Failed to load doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const switchDoctor = (doctorId) => {
    const found = doctors.find(d => d.id === doctorId);
    if (found) {
      setCurrentDoctor(found);
      localStorage.setItem('bsi_active_doctor_id', doctorId);
    }
  };

  const isMedicalAdmin = currentDoctor?.roles?.includes('MEDICAL_ADMIN');
  const isDeptHead = currentDoctor?.roles?.includes('DEPT_HEAD');
  const isDoctor = currentDoctor?.roles?.includes('DOCTOR');

  return (
    <AuthContext.Provider
      value={{
        doctors,
        currentDoctor,
        switchDoctor,
        refreshDoctors: fetchDoctors,
        isMedicalAdmin,
        isDeptHead,
        isDoctor,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
