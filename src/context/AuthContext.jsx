import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [doctors, setDoctors] = useState([]);
  const [currentDoctor, setCurrentDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // LIFF & Onboarding States
  const [liffProfile, setLiffProfile] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isLiffMode, setIsLiffMode] = useState(false);

  // Fetch doctors list (Developer Mode fallback)
  const fetchDoctors = async () => {
    try {
      const res = await fetch('/api/doctors');
      if (res.ok) {
        const data = await res.json();
        setDoctors(data);

        const savedId = localStorage.getItem('bsi_active_doctor_id');
        let selected = null;
        if (savedId) {
          selected = data.find(d => d.id === savedId);
        }
        if (!selected) {
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
    const initLiff = async () => {
      const liffId = import.meta.env.VITE_LIFF_ID;
      
      // If no valid LIFF ID, use Developer Mode (Persona Switcher)
      if (!liffId || liffId.length < 10) {
        console.log("No VITE_LIFF_ID found. Using Developer Mode (Persona Switcher).");
        await fetchDoctors();
        return;
      }

      setIsLiffMode(true);
      try {
        const liff = (await import('@line/liff')).default;
        await liff.init({ liffId });
        
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setLiffProfile(profile);

          const res = await fetch(`/api/auth/me?lineUserId=${profile.userId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.doctor) {
              setCurrentDoctor(data.doctor);
            } else {
              setNeedsOnboarding(true);
            }
          }
        } else {
          liff.login();
        }
      } catch (err) {
        console.error("LIFF Init Error:", err);
        // Fallback to dev mode if error
        await fetchDoctors();
      } finally {
        setLoading(false);
      }
    };
    
    initLiff();
  }, []);

  const switchDoctor = (doctorId) => {
    if (isLiffMode && !needsOnboarding) return; // Disable switcher in real LIFF mode
    const found = doctors.find(d => d.id === doctorId);
    if (found) {
      setCurrentDoctor(found);
      localStorage.setItem('bsi_active_doctor_id', doctorId);
    }
  };

  const isMedicalAdmin = currentDoctor?.roles?.includes('ADMIN') || currentDoctor?.roles?.includes('MEDICAL_ADMIN');
  const isApprover = currentDoctor?.roles?.includes('APPROVER') || currentDoctor?.roles?.includes('DEPT_HEAD');
  const isDoctor = currentDoctor?.roles?.includes('DOCTOR');

  return (
    <AuthContext.Provider
      value={{
        doctors,
        currentDoctor,
        setCurrentDoctor,
        switchDoctor,
        refreshDoctors: fetchDoctors,
        isMedicalAdmin,
        isApprover,
        isDoctor,
        loading,
        liffProfile,
        needsOnboarding,
        setNeedsOnboarding,
        isLiffMode
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
